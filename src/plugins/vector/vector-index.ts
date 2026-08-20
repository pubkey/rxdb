import { newRxError } from '../../rx-error.ts';
import { clone } from '../utils/index.ts';
import type {
    RxJsonSchema
} from '../../types/index.d.ts';
import type {
    Vector,
    VectorDistanceMeta,
    VectorIndexOptions,
    VectorIndexOptionsFilled
} from './types.ts';
import { getVectorDistanceMeta, normalizeVector } from './vector-distance.ts';

export const DEFAULT_VECTOR_INDEX_AMOUNT = 5;
export const DEFAULT_VECTOR_INDEX_FIELD_PREFIX = 'vectorIdx';
export const DEFAULT_VECTOR_INDEX_SEED = 1;

/**
 * Creates deterministic pseudo random unit vectors.
 * All clients must calculate the same index values for the same document,
 * so the sample vectors must not depend on Math.random().
 * @link https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 */
export function createSampleVectors(
    dimensions: number,
    amount: number,
    seed: number
): Vector[] {
    let state = seed >>> 0;
    const ret: Vector[] = [];
    for (let i = 0; i < amount; i++) {
        const vector: Vector = new Array(dimensions);
        for (let j = 0; j < dimensions; j++) {
            state = (state + 0x6D2B79F5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t = t ^ (t + Math.imul(t ^ (t >>> 7), t | 61));
            vector[j] = ((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2) - 1;
        }
        ret.push(normalizeVector(vector));
    }
    return ret;
}

export function fillVectorIndexOptions(options: VectorIndexOptions): VectorIndexOptionsFilled {
    if (!options.vectorPath) {
        throw newRxError('VEC2', { args: { options } });
    }
    if (!options.dimensions || options.dimensions < 1) {
        throw newRxError('VEC3', { args: { dimensions: options.dimensions } });
    }

    const distance = getVectorDistanceMeta(options.distance ? options.distance : 'euclidean');
    const seed = typeof options.seed === 'number' ? options.seed : DEFAULT_VECTOR_INDEX_SEED;
    const sampleVectors = options.sampleVectors
        ? options.sampleVectors
        : createSampleVectors(
            options.dimensions,
            typeof options.indexAmount === 'number' ? options.indexAmount : DEFAULT_VECTOR_INDEX_AMOUNT,
            seed
        );
    sampleVectors.forEach(sampleVector => {
        if (sampleVector.length !== options.dimensions) {
            throw newRxError('VEC4', {
                args: {
                    dimensions: options.dimensions,
                    sampleVectorLength: sampleVector.length
                }
            });
        }
    });

    return {
        vectorPath: options.vectorPath,
        dimensions: options.dimensions,
        indexAmount: sampleVectors.length,
        distance,
        sampleVectors,
        fieldPrefix: options.fieldPrefix ? options.fieldPrefix : DEFAULT_VECTOR_INDEX_FIELD_PREFIX,
        seed
    };
}

export function getVectorIndexFields(options: VectorIndexOptionsFilled): string[] {
    const ret: string[] = new Array(options.indexAmount);
    for (let i = 0; i < options.indexAmount; i++) {
        ret[i] = options.fieldPrefix + i;
    }
    return ret;
}

/**
 * Index values are stored as integers because a JSON schema with a
 * float multipleOf would reject most of the calculated values.
 */
export function distanceToIndexValue(
    distance: VectorDistanceMeta,
    distanceValue: number
): number {
    let useValue = distanceValue;
    /**
     * Comparing a zero vector with the cosine similarity returns NaN.
     * Writing that into an index field would break the index,
     * so these documents are stored at the lowest possible value.
     */
    if (!isFinite(useValue)) {
        useValue = distance.minimum;
    }
    if (useValue < distance.minimum) {
        useValue = distance.minimum;
    }
    if (useValue > distance.maximum) {
        useValue = distance.maximum;
    }
    return Math.round(useValue * distance.precision);
}

/**
 * Index values for documents that do not contain a vector.
 * The index fields are required in the schema, so a value
 * must be written even when there is nothing to compare.
 */
export function getEmptyVectorIndexValues(
    options: VectorIndexOptionsFilled
): { [field: string]: number; } {
    const emptyValue = distanceToIndexValue(options.distance, options.distance.minimum);
    const ret: { [field: string]: number; } = {};
    getVectorIndexFields(options).forEach(field => {
        ret[field] = emptyValue;
    });
    return ret;
}

export function getVectorIndexValues(
    options: VectorIndexOptionsFilled,
    vector: Vector
): { [field: string]: number; } {
    if (vector.length !== options.dimensions) {
        throw newRxError('VEC4', {
            args: {
                dimensions: options.dimensions,
                sampleVectorLength: vector.length
            }
        });
    }
    const fields = getVectorIndexFields(options);
    const ret: { [field: string]: number; } = {};
    for (let i = 0; i < fields.length; i++) {
        ret[fields[i]] = distanceToIndexValue(
            options.distance,
            options.distance.fn(options.sampleVectors[i], vector)
        );
    }
    return ret;
}

/**
 * Adds the index fields of a vector index to a schema.
 * Run this before you create the collection, then pass the
 * exact same options to collection.addVectorIndex().
 */
export function extendSchemaWithVectorIndex<RxDocType>(
    schema: RxJsonSchema<RxDocType>,
    options: VectorIndexOptions
): RxJsonSchema<RxDocType> {
    const filled = fillVectorIndexOptions(options);
    const fields = getVectorIndexFields(filled);
    const ret: RxJsonSchema<RxDocType> = clone(schema);
    const distance = filled.distance;

    const indexes: string[] = ret.indexes ? ret.indexes as string[] : [];
    /**
     * The index fields must be required because some storages
     * like the dexie.js RxStorage cannot index optional fields.
     */
    const required: string[] = ret.required ? ret.required as string[] : [];

    fields.forEach(field => {
        if ((ret.properties as any)[field]) {
            throw newRxError('VEC5', { args: { field } });
        }
        (ret.properties as any)[field] = {
            type: 'integer',
            minimum: Math.floor(distance.minimum * distance.precision),
            maximum: Math.ceil(distance.maximum * distance.precision),
            multipleOf: 1
        };
        indexes.push(field);
        required.push(field);
    });

    ret.indexes = indexes;
    ret.required = required as any;
    return ret;
}
