import type { Vector } from './types';
/**
 * Vector comparison methods
 * @link https://www.restack.io/p/vector-database-knowledge-answer-javascript-cat-ai
 * @returns
 */
export declare function euclideanDistance(A: Vector, B: Vector): number;
export declare function manhattanDistance(A: Vector, B: Vector): number;
export declare function cosineSimilarity(A: Vector, B: Vector): number;
/**
 * @link https://github.com/vector5ai/vector5db/blob/main/src/metrics/JaccardSimilarity.ts
 */
export declare function jaccardSimilarity(a: number[], b: number[]): number;
