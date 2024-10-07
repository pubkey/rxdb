import type { Vector } from './types';

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
