import assert from 'assert';
import {
    euclideanDistance,
    euclideanDistanceSquared,
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

    describe('.euclideanDistanceSquared()', () => {
        it('should return 0 for identical vectors', () => {
            const result = euclideanDistanceSquared([1, 2, 3], [1, 2, 3]);
            assert.strictEqual(result, 0);
        });
        it('should compute the squared distance for simple vectors', () => {
            const result = euclideanDistanceSquared([0, 0], [3, 4]);
            assert.strictEqual(result, 25);
        });
        it('should compute the squared distance for negative values', () => {
            const result = euclideanDistanceSquared([-1, -2], [1, 2]);
            assert.strictEqual(result, 20);
        });
        it('should be the square of euclideanDistance()', () => {
            const A = [0.3, -1.2, 4.5, 0.01];
            const B = [-2.1, 0.7, 1.9, 3.3];
            const expected = Math.pow(euclideanDistance(A, B), 2);
            assert.ok(Math.abs(euclideanDistanceSquared(A, B) - expected) < 1e-10);
        });
        it('should sort random vectors in the same order as euclideanDistance()', () => {
            const randomVector = (dimensions: number) => new Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
            const query = randomVector(384);
            const vectors = new Array(200).fill(0).map(() => randomVector(384));
            const byDistance = vectors
                .map((vector, idx) => ({ idx, distance: euclideanDistance(query, vector) }))
                .sort((a, b) => a.distance - b.distance)
                .map(r => r.idx);
            const bySquaredDistance = vectors
                .map((vector, idx) => ({ idx, distance: euclideanDistanceSquared(query, vector) }))
                .sort((a, b) => a.distance - b.distance)
                .map(r => r.idx);
            assert.deepStrictEqual(bySquaredDistance, byDistance);
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
        it('should match the reference formula on random embedding-sized vectors', () => {
            function referenceCosineSimilarity(A: number[], B: number[]): number {
                const dotProduct = A.reduce((sum, a, i) => sum + a * B[i], 0);
                const magnitudeA = Math.sqrt(A.reduce((sum, a) => sum + a * a, 0));
                const magnitudeB = Math.sqrt(B.reduce((sum, b) => sum + b * b, 0));
                return dotProduct / (magnitudeA * magnitudeB);
            }
            const randomVector = (dimensions: number) => new Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
            for (let run = 0; run < 50; run++) {
                const A = randomVector(384);
                const B = randomVector(384);
                const result = cosineSimilarity(A, B);
                const expected = referenceCosineSimilarity(A, B);
                assert.ok(Math.abs(result - expected) < 1e-12, 'run ' + run + ': ' + result + ' !== ' + expected);
            }
        });
        it('should be symmetric', () => {
            const A = [0.3, -1.2, 4.5, 0.01];
            const B = [-2.1, 0.7, 1.9, 3.3];
            assert.strictEqual(cosineSimilarity(A, B), cosineSimilarity(B, A));
        });
        it('should not depend on the magnitude of the vectors', () => {
            const A = [0.3, -1.2, 4.5, 0.01];
            const B = [-2.1, 0.7, 1.9, 3.3];
            const scaledA = A.map(v => v * 1000);
            assert.ok(Math.abs(cosineSimilarity(A, B) - cosineSimilarity(scaledA, B)) < 1e-12);
        });
        it('should return NaN when one vector has zero magnitude', () => {
            const result = cosineSimilarity([0, 0, 0], [1, 2, 3]);
            assert.ok(Number.isNaN(result));
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
