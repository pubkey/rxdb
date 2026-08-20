import { newRxError } from '../../rx-error.ts';
import { getSchemaByObjectPath } from '../../rx-schema-helper.ts';
import { batchArray, getProperty } from '../utils/index.ts';
import type {
    RxCollection,
    RxDocument
} from '../../types/index.d.ts';
import type {
    RxVectorIndex,
    Vector,
    VectorFullScanSearchOptions,
    VectorIndexOptions,
    VectorRangeSearchOptions,
    VectorSearchOptions,
    VectorSearchResult
} from './types.ts';
import {
    distanceToIndexValue,
    fillVectorIndexOptions,
    getEmptyVectorIndexValues,
    getVectorIndexFields,
    getVectorIndexValues
} from './vector-index.ts';

export const DEFAULT_VECTOR_SEARCH_LIMIT = 10;
export const DEFAULT_DOCS_PER_INDEX_SIDE = 100;

/**
 * Adds a vector index to a collection. The schema of the collection
 * must already contain the index fields, use extendSchemaWithVectorIndex()
 * for that and pass the same options to both functions.
 */
export function addVectorIndex<RxDocType>(
    this: RxCollection<RxDocType>,
    options: VectorIndexOptions
): RxVectorIndex<RxDocType> {
    const collection = this;
    const filledOptions = fillVectorIndexOptions(options);
    const fields = getVectorIndexFields(filledOptions);

    const vectorSchemaPart = getSchemaByObjectPath(collection.schema.jsonSchema, filledOptions.vectorPath);
    if (!vectorSchemaPart) {
        throw newRxError('VEC6', {
            collection: collection.name,
            args: { vectorPath: filledOptions.vectorPath }
        });
    }
    fields.forEach(field => {
        if (!getSchemaByObjectPath(collection.schema.jsonSchema, field)) {
            throw newRxError('VEC7', {
                collection: collection.name,
                args: { field }
            });
        }
    });

    let closed = false;
    const writeIndexValues = (docData: any) => {
        if (closed) {
            return;
        }
        const vector: Vector = getProperty(docData, filledOptions.vectorPath);
        const indexValues = vector
            ? getVectorIndexValues(filledOptions, vector)
            : getEmptyVectorIndexValues(filledOptions);
        Object.entries(indexValues).forEach(([field, value]) => {
            docData[field] = value;
        });
    };
    collection.preInsert(writeIndexValues, false);
    collection.preSave(writeIndexValues, false);

    const vectorIndex: RxVectorIndex<RxDocType> = {
        collection,
        options: filledOptions,
        fields,
        getIndexValues(vector: Vector) {
            return getVectorIndexValues(filledOptions, vector);
        },
        search(queryVector: Vector, searchOptions?: VectorSearchOptions) {
            return vectorSearch(vectorIndex, queryVector, searchOptions);
        },
        searchByRange(queryVector: Vector, searchOptions: VectorRangeSearchOptions) {
            return vectorSearchByRange(vectorIndex, queryVector, searchOptions);
        },
        searchFullScan(queryVector: Vector, searchOptions?: VectorFullScanSearchOptions) {
            return vectorSearchFullScan(vectorIndex, queryVector, searchOptions);
        },
        reindex(batchSize?: number) {
            return reindexVectorIndex(vectorIndex, batchSize);
        },
        close() {
            closed = true;
        }
    };
    return vectorIndex;
}


/**
 * Calculates the real distance of each candidate document
 * and returns the closest ones.
 */
export function rankVectorSearchResults<RxDocType>(
    vectorIndex: RxVectorIndex<RxDocType>,
    queryVector: Vector,
    docs: RxDocument<RxDocType>[],
    limit: number
): VectorSearchResult<RxDocType>[] {
    const distance = vectorIndex.options.distance;
    const withDistance: VectorSearchResult<RxDocType>[] = [];
    docs.forEach(doc => {
        const vector: Vector = doc.get(vectorIndex.options.vectorPath);
        if (!vector || vector.length !== vectorIndex.options.dimensions) {
            return;
        }
        const distanceValue = distance.fn(vector, queryVector);
        /**
         * Two vectors that cannot be compared, like a zero vector
         * with the cosine similarity, must not show up in the result.
         */
        if (!isFinite(distanceValue)) {
            return;
        }
        withDistance.push({
            doc,
            distance: distanceValue
        });
    });
    withDistance.sort((a, b) => distance.higherIsCloser
        ? b.distance - a.distance
        : a.distance - b.distance
    );
    return withDistance.slice(0, limit);
}


function ensureQueryVectorLength<RxDocType>(
    vectorIndex: RxVectorIndex<RxDocType>,
    queryVector: Vector
) {
    if (queryVector.length !== vectorIndex.options.dimensions) {
        throw newRxError('VEC4', {
            args: {
                dimensions: vectorIndex.options.dimensions,
                sampleVectorLength: queryVector.length
            }
        });
    }
}


/**
 * For each index field, this reads the documents that are stored
 * before and after the index value of the query vector.
 * The amount of read documents is known upfront and is
 * docsPerIndexSide * 2 * indexAmount.
 */
export async function vectorSearch<RxDocType>(
    vectorIndex: RxVectorIndex<RxDocType>,
    queryVector: Vector,
    options: VectorSearchOptions = {}
): Promise<VectorSearchResult<RxDocType>[]> {
    ensureQueryVectorLength(vectorIndex, queryVector);
    const limit = typeof options.limit === 'number' ? options.limit : DEFAULT_VECTOR_SEARCH_LIMIT;
    const docsPerIndexSide = typeof options.docsPerIndexSide === 'number'
        ? options.docsPerIndexSide
        : DEFAULT_DOCS_PER_INDEX_SIDE;
    const distance = vectorIndex.options.distance;
    const candidates = new Map<string, RxDocument<RxDocType>>();

    await Promise.all(
        vectorIndex.fields.map(async (field, i) => {
            const indexValue = distanceToIndexValue(
                distance,
                distance.fn(vectorIndex.options.sampleVectors[i], queryVector)
            );
            const [docsBefore, docsAfter] = await Promise.all([
                vectorIndex.collection.find({
                    selector: { [field]: { $lt: indexValue } } as any,
                    sort: [{ [field]: 'desc' } as any],
                    limit: docsPerIndexSide
                }).exec(),
                vectorIndex.collection.find({
                    selector: { [field]: { $gte: indexValue } } as any,
                    sort: [{ [field]: 'asc' } as any],
                    limit: docsPerIndexSide
                }).exec()
            ]);
            docsBefore.forEach(doc => candidates.set(doc.primary, doc));
            docsAfter.forEach(doc => candidates.set(doc.primary, doc));
        })
    );

    return rankVectorSearchResults(
        vectorIndex,
        queryVector,
        Array.from(candidates.values()),
        limit
    );
}


/**
 * For each index field, this reads all documents whose index value lies
 * within the given range around the index value of the query vector.
 * How many documents are read depends on how dense the dataset is.
 */
export async function vectorSearchByRange<RxDocType>(
    vectorIndex: RxVectorIndex<RxDocType>,
    queryVector: Vector,
    options: VectorRangeSearchOptions
): Promise<VectorSearchResult<RxDocType>[]> {
    ensureQueryVectorLength(vectorIndex, queryVector);
    const limit = typeof options.limit === 'number' ? options.limit : DEFAULT_VECTOR_SEARCH_LIMIT;
    const distance = vectorIndex.options.distance;
    const candidates = new Map<string, RxDocument<RxDocType>>();

    await Promise.all(
        vectorIndex.fields.map(async (field, i) => {
            const distanceToSample = distance.fn(vectorIndex.options.sampleVectors[i], queryVector);
            const docs = await vectorIndex.collection.find({
                selector: {
                    [field]: {
                        $gte: distanceToIndexValue(distance, distanceToSample - options.range),
                        $lte: distanceToIndexValue(distance, distanceToSample + options.range)
                    }
                } as any,
                sort: [{ [field]: 'asc' } as any]
            }).exec();
            docs.forEach(doc => candidates.set(doc.primary, doc));
        })
    );

    return rankVectorSearchResults(
        vectorIndex,
        queryVector,
        Array.from(candidates.values()),
        limit
    );
}


/**
 * Reads all documents of the collection and returns the exact result.
 * Use this to measure the precision of the indexed searches.
 */
export async function vectorSearchFullScan<RxDocType>(
    vectorIndex: RxVectorIndex<RxDocType>,
    queryVector: Vector,
    options: VectorFullScanSearchOptions = {}
): Promise<VectorSearchResult<RxDocType>[]> {
    ensureQueryVectorLength(vectorIndex, queryVector);
    const limit = typeof options.limit === 'number' ? options.limit : DEFAULT_VECTOR_SEARCH_LIMIT;
    const docs = await vectorIndex.collection.find().exec();
    return rankVectorSearchResults(vectorIndex, queryVector, docs, limit);
}


export async function reindexVectorIndex<RxDocType>(
    vectorIndex: RxVectorIndex<RxDocType>,
    batchSize = 100
): Promise<number> {
    const docs = await vectorIndex.collection.find().exec();
    let changed = 0;
    const batches = batchArray(docs, batchSize);
    for (const batch of batches) {
        await Promise.all(
            batch.map(async (doc) => {
                const vector: Vector = doc.get(vectorIndex.options.vectorPath);
                if (!vector || vector.length !== vectorIndex.options.dimensions) {
                    return;
                }
                const indexValues = vectorIndex.getIndexValues(vector);
                const needsUpdate = Object.entries(indexValues)
                    .some(([field, value]) => doc.get(field) !== value);
                if (!needsUpdate) {
                    return;
                }
                changed = changed + 1;
                await doc.incrementalPatch(indexValues as any);
            })
        );
    }
    return changed;
}
