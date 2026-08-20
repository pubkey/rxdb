import { newRxError } from '../../rx-error.ts';
import type {
    Vector,
    VectorDistanceMeta,
    VectorDistanceName
} from './types.ts';

/**
 * Vector comparison methods
 * @link https://www.restack.io/p/vector-database-knowledge-answer-javascript-cat-ai
 * @returns 
 */
export function euclideanDistance(A: Vector, B: Vector): number {
    return Math.sqrt(A.reduce((sum, a, i) => sum + Math.pow(a - B[i], 2), 0));
}
export function manhattanDistance(A: Vector, B: Vector) {
    return A.reduce((sum, a, i) => sum + Math.abs(a - B[i]), 0);
}


export function cosineSimilarity(A: Vector, B: Vector): number {
    const dotProduct = A.reduce((sum, a, i) => sum + a * B[i], 0);
    const magnitudeA = Math.sqrt(A.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(B.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}


/**
 * @link https://github.com/vector5ai/vector5db/blob/main/src/metrics/JaccardSimilarity.ts
 */
export function jaccardSimilarity(a: number[], b: number[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter((x) => setB.has(x))).size;
    const union = new Set([...setA, ...setB]).size;

    return 1 - (intersection / union);
}


/**
 * Scales a vector to the length of 1 so that
 * distances between vectors stay in a predictable range.
 */
export function normalizeVector(vector: Vector): Vector {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
        sum = sum + (vector[i] * vector[i]);
    }
    const magnitude = Math.sqrt(sum);
    if (magnitude === 0) {
        return vector.slice(0);
    }
    const ret: Vector = new Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
        ret[i] = vector[i] / magnitude;
    }
    return ret;
}


/**
 * The value ranges assume normalized embeddings which is what
 * the common embedding models return. When your vectors are not
 * normalized, provide an own VectorDistanceMeta with a bigger maximum.
 */
export const VECTOR_DISTANCE_METAS: { [key in VectorDistanceName]: VectorDistanceMeta; } = {
    euclidean: {
        fn: euclideanDistance,
        higherIsCloser: false,
        minimum: 0,
        maximum: 1000,
        precision: 10000
    },
    manhattan: {
        fn: manhattanDistance,
        higherIsCloser: false,
        minimum: 0,
        maximum: 1000,
        precision: 10000
    },
    cosine: {
        fn: cosineSimilarity,
        higherIsCloser: true,
        minimum: -1,
        maximum: 1,
        precision: 1000000
    },
    jaccard: {
        fn: jaccardSimilarity,
        higherIsCloser: false,
        minimum: 0,
        maximum: 1,
        precision: 1000000
    }
};

export function getVectorDistanceMeta(
    distance: VectorDistanceName | VectorDistanceMeta
): VectorDistanceMeta {
    if (typeof distance !== 'string') {
        return distance;
    }
    const meta = VECTOR_DISTANCE_METAS[distance];
    if (!meta) {
        throw newRxError('VEC1', {
            args: {
                distance,
                known: Object.keys(VECTOR_DISTANCE_METAS)
            }
        });
    }
    return meta;
}
