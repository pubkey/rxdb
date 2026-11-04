import type { Vector } from './types';

/**
 * Vector comparison methods
 * @link https://www.restack.io/p/vector-database-knowledge-answer-javascript-cat-ai
 * @returns 
 */
export function euclideanDistance(A: Vector, B: Vector): number {
    return Math.sqrt(A.reduce((sum, a, i) => sum + Math.pow(a - B[i], 2), 0));
}
/**
 * Returns the squared euclidean distance.
 * It has the same ordering as euclideanDistance()
 * but skips the square root, so use it when you only
 * need to sort or compare vectors by their distance.
 */
export function euclideanDistanceSquared(A: Vector, B: Vector): number {
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
        const diff = A[i] - B[i];
        sum += diff * diff;
    }
    return sum;
}
export function manhattanDistance(A: Vector, B: Vector) {
    return A.reduce((sum, a, i) => sum + Math.abs(a - B[i]), 0);
}


/**
 * Computes the dot product and both squared magnitudes
 * in a single pass over the vectors.
 */
export function cosineSimilarity(A: Vector, B: Vector): number {
    let dotProduct = 0;
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < A.length; i++) {
        const a = A[i];
        const b = B[i];
        dotProduct += a * b;
        sumA += a * a;
        sumB += b * b;
    }
    return dotProduct / (Math.sqrt(sumA) * Math.sqrt(sumB));
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
