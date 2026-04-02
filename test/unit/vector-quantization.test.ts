import assert from 'assert';
import {
    euclideanDistance,
    cosineSimilarity,
    prepareTurboQuantConfig,
    rotateVector,
    unrotateVector,
    scalarQuantize,
    scalarDequantize,
    turboQuantize,
    turboDeQuantize,
    quantizedEuclideanDistance,
    quantizedCosineSimilarity,
    getVectorStorageSize,
    getQuantizedStorageSize,
} from '../../plugins/vector/index.mjs';
import type {
    Vector,
    QuantizedVector,
    PreparedTurboQuantConfig
} from '../../plugins/vector/index.mjs';

/**
 * Seeded PRNG for generating reproducible test vectors.
 */
function testRng(seed: number): () => number {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function generateRandomVector(dimensions: number, rng: () => number): Vector {
    const vec: number[] = new Array(dimensions);
    for (let i = 0; i < dimensions; i++) {
        // Values in [-1, 1] to mimic typical embeddings
        vec[i] = (rng() * 2 - 1);
    }
    return vec;
}

describe('vector-quantization.test.ts', () => {
    const DIMENSIONS = 384;
    const SEED = 42;

    describe('.prepareTurboQuantConfig()', () => {
        it('should produce deterministic config from seed', () => {
            const config1 = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            const config2 = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            assert.deepStrictEqual(config1.signs, config2.signs);
            assert.strictEqual(config1.dimensions, config2.dimensions);
        });
        it('should produce different config for different seeds', () => {
            const config1 = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: 1 });
            const config2 = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: 2 });
            let same = 0;
            for (let i = 0; i < DIMENSIONS; i++) {
                if (config1.signs[i] === config2.signs[i]) same++;
            }
            // With random signs, roughly half should differ
            assert.ok(same < DIMENSIONS * 0.7, 'different seeds should produce different signs');
            assert.ok(same > DIMENSIONS * 0.3, 'different seeds should produce different signs');
        });
        it('should produce signs of +1 or -1 only', () => {
            const config = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            for (const s of config.signs) {
                assert.ok(s === 1 || s === -1, `sign should be +1 or -1, got ${s}`);
            }
        });
    });

    describe('.rotateVector() / .unrotateVector()', () => {
        it('should be reversible (rotate then unrotate gives back original)', () => {
            const config = prepareTurboQuantConfig({ dimensions: 10, seed: SEED });
            const vec = [0.5, -0.3, 0.8, -0.1, 0.9, -0.5, 0.2, 0.7, -0.6, 0.4];
            const rotated = rotateVector(vec, config);
            const restored = unrotateVector(rotated, config);
            for (let i = 0; i < vec.length; i++) {
                assert.ok(Math.abs(restored[i] - vec[i]) < 1e-10,
                    `restored[${i}]=${restored[i]} should equal original[${i}]=${vec[i]}`);
            }
        });
        it('should preserve Euclidean distance (orthogonal transform)', () => {
            const config = prepareTurboQuantConfig({ dimensions: 10, seed: SEED });
            const a = [0.5, -0.3, 0.8, -0.1, 0.9, -0.5, 0.2, 0.7, -0.6, 0.4];
            const b = [0.1, 0.4, -0.2, 0.6, -0.3, 0.7, -0.8, 0.1, 0.5, -0.9];
            const originalDist = euclideanDistance(a, b);
            const rotatedA = rotateVector(a, config);
            const rotatedB = rotateVector(b, config);
            const rotatedDist = euclideanDistance(rotatedA, rotatedB);
            assert.ok(Math.abs(originalDist - rotatedDist) < 1e-10,
                `rotation should preserve distance: ${originalDist} vs ${rotatedDist}`);
        });
    });

    describe('.scalarQuantize() / .scalarDequantize()', () => {
        it('should quantize to values in [0, 255]', () => {
            const vec = [0.5, -0.3, 0.8, -0.1, 0.9];
            const q = scalarQuantize(vec);
            for (const v of q.data) {
                assert.ok(v >= 0 && v <= 255, `quantized value ${v} out of range`);
                assert.strictEqual(v, Math.round(v), 'quantized value should be integer');
            }
        });
        it('should map min to 0 and max to 255', () => {
            const vec = [0.5, -0.3, 0.8, -0.1, 0.9];
            const q = scalarQuantize(vec);
            const minIdx = vec.indexOf(Math.min(...vec));
            const maxIdx = vec.indexOf(Math.max(...vec));
            assert.strictEqual(q.data[minIdx], 0);
            assert.strictEqual(q.data[maxIdx], 255);
        });
        it('should dequantize back with low error', () => {
            const vec = [0.5, -0.3, 0.8, -0.1, 0.9];
            const q = scalarQuantize(vec);
            const restored = scalarDequantize(q);
            const maxErr = Math.max(...vec.map((v, i) => Math.abs(v - restored[i])));
            // Max error should be bounded by range / 255
            const range = Math.max(...vec) - Math.min(...vec);
            assert.ok(maxErr <= range / 255 + 1e-10,
                `max error ${maxErr} should be <= ${range / 255}`);
        });
        it('should handle identical values', () => {
            const vec = [0.5, 0.5, 0.5];
            const q = scalarQuantize(vec);
            const restored = scalarDequantize(q);
            for (let i = 0; i < vec.length; i++) {
                assert.ok(Math.abs(restored[i] - vec[i]) < 1e-10);
            }
        });
    });

    describe('.turboQuantize() / .turboDeQuantize()', () => {
        it('should quantize and dequantize with low error', () => {
            const config = prepareTurboQuantConfig({ dimensions: 10, seed: SEED });
            const vec = [0.5, -0.3, 0.8, -0.1, 0.9, -0.5, 0.2, 0.7, -0.6, 0.4];
            const quantized = turboQuantize(vec, config);
            const restored = turboDeQuantize(quantized, config);
            const maxErr = Math.max(...vec.map((v, i) => Math.abs(v - restored[i])));
            // Error should be small relative to the value range
            assert.ok(maxErr < 0.01, `max reconstruction error ${maxErr} should be < 0.01`);
        });
        it('should work with high-dimensional vectors', () => {
            const config = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            const rng = testRng(123);
            const vec = generateRandomVector(DIMENSIONS, rng);
            const quantized = turboQuantize(vec, config);
            const restored = turboDeQuantize(quantized, config);
            const errors = vec.map((v, i) => Math.abs(v - restored[i]));
            const avgErr = errors.reduce((s, e) => s + e, 0) / errors.length;
            assert.ok(avgErr < 0.01, `average reconstruction error ${avgErr} should be < 0.01`);
        });
        it('quantized data should be integers in [0, 255]', () => {
            const config = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            const rng = testRng(456);
            const vec = generateRandomVector(DIMENSIONS, rng);
            const quantized = turboQuantize(vec, config);
            for (const v of quantized.data) {
                assert.ok(v >= 0 && v <= 255 && v === Math.round(v));
            }
        });
    });

    describe('.quantizedEuclideanDistance()', () => {
        it('should return 0 for identical quantized vectors', () => {
            const vec = [0.5, -0.3, 0.8, -0.1, 0.9];
            const q = scalarQuantize(vec);
            const dist = quantizedEuclideanDistance(q, q);
            assert.strictEqual(dist, 0);
        });
        it('should approximate original Euclidean distance', () => {
            const a = [0.5, -0.3, 0.8, -0.1, 0.9];
            const b = [0.1, 0.4, -0.2, 0.6, -0.3];
            const originalDist = euclideanDistance(a, b);
            const qa = scalarQuantize(a);
            const qb = scalarQuantize(b);
            const quantDist = quantizedEuclideanDistance(qa, qb);
            const relativeError = Math.abs(originalDist - quantDist) / originalDist;
            assert.ok(relativeError < 0.15,
                `relative error ${relativeError} should be < 0.15`);
        });
        it('should approximate distance well with turbo quantization', () => {
            const config = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            const rng = testRng(789);
            const a = generateRandomVector(DIMENSIONS, rng);
            const b = generateRandomVector(DIMENSIONS, rng);
            const originalDist = euclideanDistance(a, b);
            const qa = turboQuantize(a, config);
            const qb = turboQuantize(b, config);
            const quantDist = quantizedEuclideanDistance(qa, qb);
            const relativeError = Math.abs(originalDist - quantDist) / originalDist;
            assert.ok(relativeError < 0.05,
                `relative error ${relativeError} with turbo quant should be < 0.05`);
        });
    });

    describe('.quantizedCosineSimilarity()', () => {
        it('should return ~1 for identical quantized vectors', () => {
            const vec = [0.5, -0.3, 0.8, -0.1, 0.9];
            const q = scalarQuantize(vec);
            const sim = quantizedCosineSimilarity(q, q);
            assert.ok(Math.abs(sim - 1) < 0.01,
                `similarity for identical vectors should be ~1, got ${sim}`);
        });
        it('should approximate original cosine similarity', () => {
            const config = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            const rng = testRng(101);
            const a = generateRandomVector(DIMENSIONS, rng);
            const b = generateRandomVector(DIMENSIONS, rng);
            const originalSim = cosineSimilarity(a, b);
            const qa = turboQuantize(a, config);
            const qb = turboQuantize(b, config);
            const quantSim = quantizedCosineSimilarity(qa, qb);
            const absError = Math.abs(originalSim - quantSim);
            assert.ok(absError < 0.05,
                `absolute error ${absError} should be < 0.05`);
        });
    });

    describe('storage size comparison', () => {
        it('quantized vectors should use significantly less JSON storage', () => {
            const config = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            const rng = testRng(202);
            const vec = generateRandomVector(DIMENSIONS, rng);
            const quantized = turboQuantize(vec, config);
            const originalSize = getVectorStorageSize(vec);
            const quantizedSize = getQuantizedStorageSize(quantized);
            const ratio = originalSize / quantizedSize;

            assert.ok(ratio > 2,
                `quantized storage should be at least 2x smaller: original=${originalSize}, quantized=${quantizedSize}, ratio=${ratio}`);
        });
        it('should report correct JSON sizes', () => {
            const vec = [0.123456789, -0.987654321, 0.555555555];
            const q = scalarQuantize(vec);
            assert.strictEqual(getVectorStorageSize(vec), JSON.stringify(vec).length);
            assert.strictEqual(getQuantizedStorageSize(q), JSON.stringify(q).length);
        });
    });

    describe('performance comparison', () => {
        const NUM_VECTORS = 500;
        const NUM_DISTANCE_COMPUTATIONS = 1000;

        it('turbo quantized distance should preserve ranking order', () => {
            const config = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            const rng = testRng(303);
            const query = generateRandomVector(DIMENSIONS, rng);
            const vectors: Vector[] = [];
            for (let i = 0; i < 50; i++) {
                vectors.push(generateRandomVector(DIMENSIONS, rng));
            }

            // Rank by original distance
            const originalRanking = vectors
                .map((v, i) => ({ idx: i, dist: euclideanDistance(query, v) }))
                .sort((a, b) => a.dist - b.dist);

            // Rank by quantized distance
            const queryQ = turboQuantize(query, config);
            const quantizedVectors = vectors.map(v => turboQuantize(v, config));
            const quantizedRanking = quantizedVectors
                .map((qv, i) => ({ idx: i, dist: quantizedEuclideanDistance(queryQ, qv) }))
                .sort((a, b) => a.dist - b.dist);

            // Top-10 results should overlap significantly
            const originalTop10 = new Set(originalRanking.slice(0, 10).map(r => r.idx));
            const quantizedTop10 = new Set(quantizedRanking.slice(0, 10).map(r => r.idx));
            let overlap = 0;
            for (const idx of originalTop10) {
                if (quantizedTop10.has(idx)) overlap++;
            }
            assert.ok(overlap >= 7,
                `top-10 overlap should be >= 7 out of 10, got ${overlap}`);
        });

        it('should report performance and storage metrics', () => {
            const config = prepareTurboQuantConfig({ dimensions: DIMENSIONS, seed: SEED });
            const rng = testRng(404);
            const vectors: Vector[] = [];
            for (let i = 0; i < NUM_VECTORS; i++) {
                vectors.push(generateRandomVector(DIMENSIONS, rng));
            }

            // Measure quantization time
            const quantizeStart = performance.now();
            const quantizedVectors: QuantizedVector[] = vectors.map(v => turboQuantize(v, config));
            const quantizeTime = performance.now() - quantizeStart;

            // Measure original distance computation time
            const query = generateRandomVector(DIMENSIONS, rng);
            const distStart = performance.now();
            for (let i = 0; i < NUM_DISTANCE_COMPUTATIONS; i++) {
                euclideanDistance(query, vectors[i % NUM_VECTORS]);
            }
            const originalDistTime = performance.now() - distStart;

            // Measure quantized distance computation time
            const queryQ = turboQuantize(query, config);
            const quantDistStart = performance.now();
            for (let i = 0; i < NUM_DISTANCE_COMPUTATIONS; i++) {
                quantizedEuclideanDistance(queryQ, quantizedVectors[i % NUM_VECTORS]);
            }
            const quantizedDistTime = performance.now() - quantDistStart;

            // Measure storage sizes
            const originalTotalSize = vectors.reduce((sum, v) => sum + getVectorStorageSize(v), 0);
            const quantizedTotalSize = quantizedVectors.reduce((sum, q) => sum + getQuantizedStorageSize(q), 0);
            const storageRatio = originalTotalSize / quantizedTotalSize;

            // Measure accuracy
            let totalRelError = 0;
            let errorCount = 0;
            for (let i = 0; i < Math.min(100, NUM_VECTORS); i++) {
                const origDist = euclideanDistance(query, vectors[i]);
                const qDist = quantizedEuclideanDistance(queryQ, quantizedVectors[i]);
                if (origDist > 0) {
                    totalRelError += Math.abs(origDist - qDist) / origDist;
                    errorCount++;
                }
            }
            const avgRelError = totalRelError / errorCount;

            console.log('--- TurboQuant Performance Report ---');
            console.log(`Dimensions: ${DIMENSIONS}`);
            console.log(`Vectors: ${NUM_VECTORS}`);
            console.log(`Quantization time: ${quantizeTime.toFixed(2)}ms (${(quantizeTime / NUM_VECTORS).toFixed(3)}ms per vector)`);
            console.log(`Original distance time: ${originalDistTime.toFixed(2)}ms for ${NUM_DISTANCE_COMPUTATIONS} computations`);
            console.log(`Quantized distance time: ${quantizedDistTime.toFixed(2)}ms for ${NUM_DISTANCE_COMPUTATIONS} computations`);
            console.log(`Original total storage: ${originalTotalSize} bytes`);
            console.log(`Quantized total storage: ${quantizedTotalSize} bytes`);
            console.log(`Storage ratio: ${storageRatio.toFixed(2)}x smaller`);
            console.log(`Average relative distance error: ${(avgRelError * 100).toFixed(2)}%`);
            console.log('--- End Report ---');

            // Assertions on the report
            assert.ok(storageRatio > 2,
                `storage should be at least 2x smaller: ${storageRatio.toFixed(2)}x`);
            assert.ok(avgRelError < 0.05,
                `average relative error should be < 5%, got ${(avgRelError * 100).toFixed(2)}%`);
        });
    });
});
