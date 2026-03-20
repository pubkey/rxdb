import assert from 'assert';
import {
    euclideanDistance,
    manhattanDistance,
    cosineSimilarity,
    jaccardSimilarity
} from '../../plugins/vector/index.mjs';

describe('vector-distance.test.ts', () => {
    describe('.euclideanDistance()', () => {
        it('should return 0 for identical vectors', () => {
            const result = euclideanDistance([1, 2, 3], [1, 2, 3]);
            assert.strictEqual(result, 0);
        });
        it('should compute correct distance for simple vectors', () => {
            const result = euclideanDistance([0, 0], [3, 4]);
            assert.strictEqual(result, 5);
        });
        it('should compute correct distance for 1D vectors', () => {
            const result = euclideanDistance([0], [5]);
            assert.strictEqual(result, 5);
        });
        it('should compute correct distance for negative values', () => {
            const result = euclideanDistance([-1, -2], [1, 2]);
            const expected = Math.sqrt(4 + 16);
            assert.ok(Math.abs(result - expected) < 1e-10);
        });
        it('should compute correct distance for high-dimensional vectors', () => {
            const result = euclideanDistance([1, 2, 3, 4], [5, 6, 7, 8]);
            const expected = Math.sqrt(16 + 16 + 16 + 16);
            assert.ok(Math.abs(result - expected) < 1e-10);
        });
    });

    describe('.manhattanDistance()', () => {
        it('should return 0 for identical vectors', () => {
            const result = manhattanDistance([1, 2, 3], [1, 2, 3]);
            assert.strictEqual(result, 0);
        });
        it('should compute correct distance for simple vectors', () => {
            const result = manhattanDistance([0, 0], [3, 4]);
            assert.strictEqual(result, 7);
        });
        it('should compute correct distance for negative values', () => {
            const result = manhattanDistance([-1, -2], [1, 2]);
            assert.strictEqual(result, 6);
        });
        it('should compute correct distance for 1D vectors', () => {
            const result = manhattanDistance([0], [10]);
            assert.strictEqual(result, 10);
        });
    });

    describe('.cosineSimilarity()', () => {
        it('should return 1 for identical vectors', () => {
            const result = cosineSimilarity([1, 2, 3], [1, 2, 3]);
            assert.ok(Math.abs(result - 1) < 1e-10);
        });
        it('should return 1 for parallel vectors', () => {
            const result = cosineSimilarity([1, 2, 3], [2, 4, 6]);
            assert.ok(Math.abs(result - 1) < 1e-10);
        });
        it('should return 0 for orthogonal vectors', () => {
            const result = cosineSimilarity([1, 0], [0, 1]);
            assert.ok(Math.abs(result) < 1e-10);
        });
        it('should return -1 for opposite vectors', () => {
            const result = cosineSimilarity([1, 0], [-1, 0]);
            assert.ok(Math.abs(result - (-1)) < 1e-10);
        });
        it('should handle high-dimensional vectors', () => {
            const result = cosineSimilarity([1, 1, 1, 1], [1, 1, 1, 1]);
            assert.ok(Math.abs(result - 1) < 1e-10);
        });
    });

    describe('.jaccardSimilarity()', () => {
        it('should return 0 for identical sets', () => {
            const result = jaccardSimilarity([1, 2, 3], [1, 2, 3]);
            assert.strictEqual(result, 0);
        });
        it('should return 1 for completely disjoint sets', () => {
            const result = jaccardSimilarity([1, 2], [3, 4]);
            assert.strictEqual(result, 1);
        });
        it('should compute correct value for partial overlap', () => {
            // intersection = {2}, union = {1,2,3} => jaccard index = 1/3 => distance = 1 - 1/3 = 2/3
            const result = jaccardSimilarity([1, 2], [2, 3]);
            assert.ok(Math.abs(result - (2 / 3)) < 1e-10);
        });
        it('should handle duplicate elements in input', () => {
            // Sets: {1, 2} and {2, 3} => same as above
            const result = jaccardSimilarity([1, 2, 2], [2, 3, 3]);
            assert.ok(Math.abs(result - (2 / 3)) < 1e-10);
        });
        it('should handle single-element vectors', () => {
            const result = jaccardSimilarity([1], [1]);
            assert.strictEqual(result, 0);
        });
    });
});
