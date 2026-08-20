import assert from 'assert';
import config from './config.ts';

import {
    addRxPlugin,
    createRxDatabase,
    randomToken,
    RxCollection,
    RxJsonSchema
} from '../../plugins/core/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import {
    RxDBVectorPlugin,
    RxVectorIndex,
    Vector,
    VectorIndexOptions,
    createSampleVectors,
    euclideanDistance,
    extendSchemaWithVectorIndex,
    getVectorDistanceMeta,
    normalizeVector
} from '../../plugins/vector/index.mjs';
import { assertThrows } from 'async-test-util';
addRxPlugin(RxDBVectorPlugin);

type VectorDocType = {
    id: string;
    text: string;
    embedding: number[];
};

const DIMENSIONS = 8;

const baseSchema: RxJsonSchema<VectorDocType> = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        text: {
            type: 'string'
        },
        embedding: {
            type: 'array',
            items: {
                type: 'number'
            }
        }
    },
    required: ['id', 'text', 'embedding']
};

/**
 * Deterministic vectors so that the tests
 * do not become flaky.
 */
function getTestVector(seed: number): Vector {
    return createSampleVectors(DIMENSIONS, 1, seed)[0];
}

function getTestDocsData(amount: number): VectorDocType[] {
    return new Array(amount).fill(0).map((_, idx) => ({
        id: 'doc-' + idx.toString().padStart(5, '0'),
        text: 'text-' + idx,
        embedding: getTestVector(idx + 1000)
    }));
}

async function getTestCollection(
    options: VectorIndexOptions,
    docsAmount = 0
): Promise<{
    collection: RxCollection<VectorDocType>;
    vectorIndex: RxVectorIndex<VectorDocType>;
}> {
    const database = await createRxDatabase({
        name: randomToken(10),
        storage: wrappedValidateAjvStorage({
            storage: config.storage.getStorage()
        }),
        allowSlowCount: true
    });
    const collections = await database.addCollections({
        vectors: {
            schema: extendSchemaWithVectorIndex(baseSchema, options)
        }
    });
    const collection: RxCollection<VectorDocType> = collections.vectors;
    const vectorIndex = collection.addVectorIndex(options);
    if (docsAmount > 0) {
        await collection.bulkInsert(getTestDocsData(docsAmount));
    }
    return { collection, vectorIndex };
}

describe('vector.test.ts', () => {
    describe('.normalizeVector()', () => {
        it('should return a vector with the length of one', () => {
            const normalized = normalizeVector([3, 4]);
            assert.deepStrictEqual(normalized, [0.6, 0.8]);
            const magnitude = Math.sqrt(normalized.reduce((sum, v) => sum + (v * v), 0));
            assert.ok(Math.abs(magnitude - 1) < 1e-10);
        });
        it('should not divide by zero', () => {
            assert.deepStrictEqual(normalizeVector([0, 0]), [0, 0]);
        });
    });
    describe('.createSampleVectors()', () => {
        it('should be deterministic', () => {
            const a = createSampleVectors(16, 5, 1);
            const b = createSampleVectors(16, 5, 1);
            assert.deepStrictEqual(a, b);
        });
        it('should create different vectors for different seeds', () => {
            const a = createSampleVectors(16, 1, 1)[0];
            const b = createSampleVectors(16, 1, 2)[0];
            assert.ok(euclideanDistance(a, b) > 0);
        });
        it('should create the correct amount and dimensions', () => {
            const vectors = createSampleVectors(23, 7, 42);
            assert.strictEqual(vectors.length, 7);
            vectors.forEach(vector => assert.strictEqual(vector.length, 23));
        });
        it('should create normalized vectors', () => {
            createSampleVectors(16, 5, 1).forEach(vector => {
                const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + (v * v), 0));
                assert.ok(Math.abs(magnitude - 1) < 1e-10);
            });
        });
    });
    describe('.getVectorDistanceMeta()', () => {
        it('should return the meta of a known distance', () => {
            const meta = getVectorDistanceMeta('cosine');
            assert.strictEqual(meta.higherIsCloser, true);
        });
        it('should pass through a given meta object', () => {
            const own = {
                fn: euclideanDistance,
                higherIsCloser: false,
                minimum: 0,
                maximum: 5,
                precision: 100
            };
            assert.strictEqual(getVectorDistanceMeta(own), own);
        });
        it('should throw on an unknown distance name', () => {
            assert.throws(() => getVectorDistanceMeta('foobar' as any));
        });
    });
    describe('.extendSchemaWithVectorIndex()', () => {
        it('should add the index fields and indexes', () => {
            const schema = extendSchemaWithVectorIndex(baseSchema, {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 3
            });
            const properties = schema.properties as any;
            assert.ok(properties.vectorIdx0);
            assert.ok(properties.vectorIdx1);
            assert.ok(properties.vectorIdx2);
            assert.ok(!properties.vectorIdx3);
            assert.deepStrictEqual(schema.indexes, ['vectorIdx0', 'vectorIdx1', 'vectorIdx2']);
            assert.ok((schema.required as string[]).includes('vectorIdx0'));
        });
        it('should not mutate the given schema', () => {
            const schemaBefore = JSON.stringify(baseSchema);
            extendSchemaWithVectorIndex(baseSchema, {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS
            });
            assert.strictEqual(JSON.stringify(baseSchema), schemaBefore);
        });
        it('should use the given fieldPrefix', () => {
            const schema = extendSchemaWithVectorIndex(baseSchema, {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 1,
                fieldPrefix: 'myIdx'
            });
            assert.ok((schema.properties as any).myIdx0);
        });
        it('should throw when the field name is already used', () => {
            const collidingSchema: RxJsonSchema<any> = JSON.parse(JSON.stringify(baseSchema));
            collidingSchema.properties.vectorIdx0 = { type: 'string' };
            assert.throws(() => extendSchemaWithVectorIndex(collidingSchema, {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 1
            }));
        });
        it('should throw on missing options', () => {
            assert.throws(() => extendSchemaWithVectorIndex(baseSchema, {
                dimensions: DIMENSIONS
            } as any));
            assert.throws(() => extendSchemaWithVectorIndex(baseSchema, {
                vectorPath: 'embedding'
            } as any));
        });
    });
    describe('.addVectorIndex()', () => {
        it('should throw when the schema does not contain the index fields', async () => {
            const database = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const collections = await database.addCollections({
                vectors: { schema: baseSchema }
            });
            assert.throws(() => collections.vectors.addVectorIndex({
                vectorPath: 'embedding',
                dimensions: DIMENSIONS
            }));
            await database.close();
        });
        it('should throw when the schema does not contain the vector field', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'notInSchema',
                dimensions: DIMENSIONS
            };
            const database = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const collections = await database.addCollections({
                vectors: { schema: extendSchemaWithVectorIndex(baseSchema, options) }
            });
            assert.throws(() => collections.vectors.addVectorIndex(options));
            await database.close();
        });
    });
    describe('index maintenance', () => {
        it('should write the index values on insert', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 2
            };
            const { collection, vectorIndex } = await getTestCollection(options);
            const docData = getTestDocsData(1)[0];
            const doc = await collection.insert(docData);
            const expected = vectorIndex.getIndexValues(docData.embedding);
            assert.strictEqual(doc.get('vectorIdx0'), expected.vectorIdx0);
            assert.strictEqual(doc.get('vectorIdx1'), expected.vectorIdx1);
            await collection.database.close();
        });
        it('should update the index values when the vector changes', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 2
            };
            const { collection, vectorIndex } = await getTestCollection(options);
            const doc = await collection.insert(getTestDocsData(1)[0]);
            const newVector = getTestVector(500);
            const updated = await doc.incrementalPatch({ embedding: newVector });
            const expected = vectorIndex.getIndexValues(newVector);
            assert.strictEqual(updated.get('vectorIdx0'), expected.vectorIdx0);
            assert.strictEqual(updated.get('vectorIdx1'), expected.vectorIdx1);
            await collection.database.close();
        });
        it('should keep the index values in the boundaries of the schema', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 2,
                distance: 'cosine'
            };
            const { collection, vectorIndex } = await getTestCollection(options);
            /**
             * Insert must not throw a schema validation error
             * even when the vector is far outside of the normalized range.
             */
            const hugeVector = new Array(DIMENSIONS).fill(1000000);
            await collection.insert({
                id: 'huge',
                text: 'huge',
                embedding: hugeVector
            });
            const values = vectorIndex.getIndexValues(hugeVector);
            Object.values(values).forEach(value => {
                assert.ok(value <= 1000000);
                assert.ok(value >= -1000000);
            });
            await collection.database.close();
        });
        it('should throw when a vector with the wrong dimensions is inserted', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 2
            };
            const { collection } = await getTestCollection(options);
            await assertThrows(
                () => collection.insert({
                    id: 'wrong',
                    text: 'wrong',
                    embedding: [1, 2, 3]
                }),
                'RxError',
                'VEC4'
            );
            await collection.database.close();
        });
        it('should no longer write index values after close()', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 2
            };
            const { collection, vectorIndex } = await getTestCollection(options);
            const doc = await collection.insert(getTestDocsData(1)[0]);
            const indexValueBefore = doc.get('vectorIdx0');

            vectorIndex.close();
            const updated = await doc.incrementalPatch({ embedding: getTestVector(500) });
            assert.strictEqual(updated.get('vectorIdx0'), indexValueBefore);
            await collection.database.close();
        });
        it('should write the empty index values for documents without a vector', async () => {
            const optionalSchema: RxJsonSchema<any> = JSON.parse(JSON.stringify(baseSchema));
            optionalSchema.required = ['id', 'text'];
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 2
            };
            const database = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStorage({
                    storage: config.storage.getStorage()
                })
            });
            const collections = await database.addCollections({
                vectors: { schema: extendSchemaWithVectorIndex(optionalSchema, options) }
            });
            const collection = collections.vectors;
            const vectorIndex = collection.addVectorIndex(options);
            const doc = await collection.insert({ id: 'no-vector', text: 'no vector' });
            assert.strictEqual(typeof doc.get('vectorIdx0'), 'number');

            // documents without a vector must not show up in the search result
            const result = await vectorIndex.searchFullScan(getTestVector(1));
            assert.strictEqual(result.length, 0);
            await database.close();
        });
    });
    describe('.reindex()', () => {
        it('should write the index values of documents that were inserted before', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 2
            };
            const { collection, vectorIndex } = await getTestCollection(options, 10);

            /**
             * Without the hooks the index values become
             * stale as soon as a vector is changed.
             */
            vectorIndex.close();
            const staleDocs = await collection.find({ sort: [{ id: 'asc' }] }).exec();
            for (let i = 0; i < staleDocs.length; i++) {
                await staleDocs[i].incrementalPatch({ embedding: getTestVector(i + 50000) });
            }

            const reIndex = collection.addVectorIndex(options);
            const changed = await reIndex.reindex();
            assert.strictEqual(changed, 10);

            const docs = await collection.find().exec();
            docs.forEach(doc => {
                const expected = reIndex.getIndexValues(doc.get('embedding'));
                assert.strictEqual(doc.get('vectorIdx0'), expected.vectorIdx0);
                assert.strictEqual(doc.get('vectorIdx1'), expected.vectorIdx1);
            });

            // running it again must not change anything
            assert.strictEqual(await reIndex.reindex(), 0);
            await collection.database.close();
        });
    });
    describe('searching', () => {
        it('.searchFullScan() should return the exact closest documents', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS
            };
            const { collection, vectorIndex } = await getTestCollection(options, 30);
            const docsData = getTestDocsData(30);
            const queryVector = docsData[7].embedding;
            const result = await vectorIndex.searchFullScan(queryVector, { limit: 3 });
            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[0].doc.primary, docsData[7].id);
            assert.ok(result[0].distance < 1e-10);
            // must be sorted by distance
            assert.ok(result[0].distance <= result[1].distance);
            assert.ok(result[1].distance <= result[2].distance);
            await collection.database.close();
        });
        it('.search() should find the document of the query vector', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS
            };
            const { collection, vectorIndex } = await getTestCollection(options, 30);
            const docsData = getTestDocsData(30);
            const result = await vectorIndex.search(docsData[11].embedding, { limit: 5 });
            assert.strictEqual(result.length, 5);
            assert.strictEqual(result[0].doc.primary, docsData[11].id);
            await collection.database.close();
        });
        it('.search() should return the same top result as the full scan', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS
            };
            const { collection, vectorIndex } = await getTestCollection(options, 40);
            const queryVector = getTestVector(7777);
            const indexed = await vectorIndex.search(queryVector, { limit: 5 });
            const fullScan = await vectorIndex.searchFullScan(queryVector, { limit: 5 });
            assert.strictEqual(indexed[0].doc.primary, fullScan[0].doc.primary);
            await collection.database.close();
        });
        it('.search() should respect the limit', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS
            };
            const { collection, vectorIndex } = await getTestCollection(options, 30);
            const result = await vectorIndex.search(getTestVector(1), { limit: 2 });
            assert.strictEqual(result.length, 2);
            await collection.database.close();
        });
        it('.search() should not read more documents than docsPerIndexSide allows', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 1
            };
            const { collection, vectorIndex } = await getTestCollection(options, 30);
            const result = await vectorIndex.search(getTestVector(1), {
                limit: 100,
                docsPerIndexSide: 3
            });
            assert.ok(result.length <= 6);
            await collection.database.close();
        });
        it('.searchByRange() should find the document of the query vector', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS
            };
            const { collection, vectorIndex } = await getTestCollection(options, 30);
            const docsData = getTestDocsData(30);
            const result = await vectorIndex.searchByRange(docsData[3].embedding, {
                range: 1,
                limit: 5
            });
            assert.ok(result.length > 0);
            assert.strictEqual(result[0].doc.primary, docsData[3].id);
            await collection.database.close();
        });
        it('.searchByRange() should return nothing when the range is zero and nothing matches', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS
            };
            const { collection, vectorIndex } = await getTestCollection(options, 30);
            const result = await vectorIndex.searchByRange(getTestVector(999999), {
                range: 0
            });
            assert.strictEqual(result.length, 0);
            await collection.database.close();
        });
        it('should sort descending when the distance is a similarity', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                distance: 'cosine'
            };
            const { collection, vectorIndex } = await getTestCollection(options, 30);
            const docsData = getTestDocsData(30);
            const result = await vectorIndex.searchFullScan(docsData[5].embedding, { limit: 3 });
            assert.strictEqual(result[0].doc.primary, docsData[5].id);
            assert.ok(result[0].distance >= result[1].distance);
            assert.ok(result[1].distance >= result[2].distance);
            await collection.database.close();
        });
        it('should not break on vectors that cannot be compared', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS,
                indexAmount: 2,
                distance: 'cosine'
            };
            const { collection, vectorIndex } = await getTestCollection(options, 10);
            /**
             * The cosine similarity of a zero vector is NaN.
             * Storing it must not break the index and the document
             * must not show up in the search result.
             */
            const zeroVector = new Array(DIMENSIONS).fill(0);
            await collection.insert({
                id: 'zero',
                text: 'zero',
                embedding: zeroVector
            });
            const indexValues = vectorIndex.getIndexValues(zeroVector);
            Object.values(indexValues).forEach(value => assert.ok(isFinite(value)));

            const results = await vectorIndex.searchFullScan(getTestVector(1001), { limit: 20 });
            assert.strictEqual(results.length, 10);
            assert.ok(!results.find(r => r.doc.primary === 'zero'));
            await collection.database.close();
        });
        it('should throw when the query vector has the wrong dimensions', async () => {
            const options: VectorIndexOptions = {
                vectorPath: 'embedding',
                dimensions: DIMENSIONS
            };
            const { collection, vectorIndex } = await getTestCollection(options, 1);
            await assertThrows(
                () => vectorIndex.search([1, 2, 3]),
                'RxError',
                'VEC4'
            );
            await collection.database.close();
        });
        it('should work with a nested vectorPath', async () => {
            const nestedSchema: RxJsonSchema<any> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: { type: 'string', maxLength: 100 },
                    data: {
                        type: 'object',
                        properties: {
                            embedding: {
                                type: 'array',
                                items: { type: 'number' }
                            }
                        }
                    }
                },
                required: ['id']
            };
            const options: VectorIndexOptions = {
                vectorPath: 'data.embedding',
                dimensions: DIMENSIONS,
                indexAmount: 2
            };
            const database = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const collections = await database.addCollections({
                vectors: { schema: extendSchemaWithVectorIndex(nestedSchema, options) }
            });
            const collection = collections.vectors;
            const vectorIndex = collection.addVectorIndex(options);
            await collection.bulkInsert(
                new Array(10).fill(0).map((_, idx) => ({
                    id: 'doc-' + idx,
                    data: { embedding: getTestVector(idx + 1000) }
                }))
            );
            const result = await vectorIndex.search(getTestVector(1003), { limit: 1 });
            assert.strictEqual(result[0].doc.primary, 'doc-3');
            await database.close();
        });
    });
});
