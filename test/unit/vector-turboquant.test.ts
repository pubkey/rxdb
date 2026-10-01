import assert from 'assert';
import config from './config.ts';

import {
    addRxPlugin,
    createRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';
import {
    getTurboQuantCodebook,
    quantizeValue,
    normalCdf,
    normalPdf,
    normalQuantile,
    TurboQuantRotation,
    TurboQuantIndex,
    serializeTurboQuantIndex,
    deserializeTurboQuantIndex,
    getVectorIndex,
    RxDBVectorTurboQuantPlugin
} from '../../plugins/vector-turboquant/index.mjs';
import type {
    TurboQuantBitWidth,
    TurboQuantDistance
} from '../../plugins/vector-turboquant/index.mjs';
import { assertThrows } from 'async-test-util';

addRxPlugin(RxDBVectorTurboQuantPlugin);

/**
 * Deterministic random numbers so that the recall assertions
 * cannot become flaky.
 */
function seededRandom(seed: number) {
    let state = seed | 0;
    return function (): number {
        state = state + 0x6D2B79F5 | 0;
        let t = Math.imul(state ^ state >>> 15, 1 | state);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function gaussian(random: () => number): number {
    let u = 0;
    let v = 0;
    while (u === 0) {
        u = random();
    }
    while (v === 0) {
        v = random();
    }
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function randomVector(random: () => number, dimensions: number): number[] {
    const ret: number[] = [];
    for (let i = 0; i < dimensions; i++) {
        ret.push(gaussian(random));
    }
    return ret;
}
function dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}
function vectorLength(a: number[]): number {
    return Math.sqrt(dotProduct(a, a));
}
function cosine(a: number[], b: number[]): number {
    return dotProduct(a, b) / (vectorLength(a) * vectorLength(b));
}
function euclidean(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
}
function bruteForce(
    vectors: number[][],
    query: number[],
    distance: TurboQuantDistance
): { id: string; score: number; }[] {
    const scored = vectors.map((vector, index) => ({
        id: 'v' + index,
        score: distance === 'cosine'
            ? cosine(vector, query)
            : (distance === 'euclidean' ? euclidean(vector, query) : dotProduct(vector, query))
    }));
    scored.sort((a, b) => distance === 'euclidean' ? a.score - b.score : b.score - a.score);
    return scored;
}

const VECTOR_SCHEMA = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        embedding: {
            type: 'array',
            items: {
                type: 'number'
            }
        }
    },
    required: ['id', 'embedding']
} as const;

describe('vector-turboquant.test.ts', () => {
    describe('normal-distribution', () => {
        it('should calculate known values of the normal distribution', () => {
            assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-12);
            assert.ok(Math.abs(normalCdf(1) - 0.8413447460685429) < 1e-9);
            assert.ok(Math.abs(normalCdf(-1) - 0.15865525393145705) < 1e-9);
            assert.ok(Math.abs(normalPdf(0) - 0.3989422804014327) < 1e-12);
            assert.ok(Math.abs(normalQuantile(0.975) - 1.959963984540054) < 1e-6);
        });
    });
    describe('lloyd-max codebook', () => {
        it('should reproduce the published Lloyd-Max values', () => {
            /**
             * Reference values from J. Max, 'Quantizing for minimum distortion',
             * IRE Transactions on Information Theory, 1960.
             */
            const oneBit = getTurboQuantCodebook(1);
            assert.ok(Math.abs(oneBit.centroids[1] - 0.7979) < 1e-3);
            const twoBit = getTurboQuantCodebook(2);
            assert.ok(Math.abs(twoBit.centroids[2] - 0.4528) < 1e-3);
            assert.ok(Math.abs(twoBit.centroids[3] - 1.5104) < 1e-3);
            assert.ok(Math.abs(twoBit.boundaries[2] - 0.9816) < 1e-3);
            const fourBit = getTurboQuantCodebook(4);
            assert.ok(Math.abs(fourBit.centroids[8] - 0.1284) < 1e-3);
            assert.ok(Math.abs(fourBit.centroids[15] - 2.7326) < 1e-3);
        });
        it('should have symmetric centroids and midpoint boundaries', () => {
            [1, 2, 4].forEach(bitWidth => {
                const codebook = getTurboQuantCodebook(bitWidth as TurboQuantBitWidth);
                assert.strictEqual(codebook.centroids.length, codebook.levels);
                assert.strictEqual(codebook.boundaries.length, codebook.levels - 1);
                for (let i = 0; i < codebook.levels; i++) {
                    const mirrored = codebook.centroids[codebook.levels - 1 - i];
                    assert.ok(Math.abs(codebook.centroids[i] + mirrored) < 1e-9);
                }
                for (let i = 0; i < codebook.levels - 1; i++) {
                    const middle = (codebook.centroids[i] + codebook.centroids[i + 1]) / 2;
                    assert.ok(Math.abs(codebook.boundaries[i] - middle) < 1e-9);
                }
            });
        });
        it('should return the same cached instance', () => {
            assert.strictEqual(getTurboQuantCodebook(4), getTurboQuantCodebook(4));
        });
        it('should throw on an unsupported bit width', () => {
            assert.throws(() => getTurboQuantCodebook(3 as any));
        });
        it('should put values into the correct bucket', () => {
            const codebook = getTurboQuantCodebook(2);
            assert.strictEqual(quantizeValue(codebook, -5), 0);
            assert.strictEqual(quantizeValue(codebook, -0.5), 1);
            assert.strictEqual(quantizeValue(codebook, 0.5), 2);
            assert.strictEqual(quantizeValue(codebook, 5), 3);
        });
    });
    describe('rotation', () => {
        it('should preserve norms and dot products', () => {
            const random = seededRandom(11);
            const rotation = new TurboQuantRotation(300, 42);
            const a = randomVector(random, 300);
            const b = randomVector(random, 300);
            const rotatedA = rotation.rotate(a, new Float64Array(rotation.paddedDim));
            const rotatedB = rotation.rotate(b, new Float64Array(rotation.paddedDim));

            let rotatedDot = 0;
            let rotatedSquaredNorm = 0;
            for (let i = 0; i < rotation.paddedDim; i++) {
                rotatedDot += rotatedA[i] * rotatedB[i];
                rotatedSquaredNorm += rotatedA[i] * rotatedA[i];
            }
            assert.ok(Math.abs(rotatedDot - dotProduct(a, b)) < 1e-9);
            assert.ok(Math.abs(Math.sqrt(rotatedSquaredNorm) - vectorLength(a)) < 1e-9);
        });
        it('should pad to a multiple of the block size', () => {
            assert.strictEqual(new TurboQuantRotation(768, 1).paddedDim, 768);
            assert.strictEqual(new TurboQuantRotation(1536, 1).paddedDim, 1536);
            assert.strictEqual(new TurboQuantRotation(100, 1).paddedDim, 128);
            assert.strictEqual(new TurboQuantRotation(1, 1).paddedDim, 64);
        });
        it('should be reproducible for the same seed', () => {
            const random = seededRandom(12);
            const vector = randomVector(random, 128);
            const first = new TurboQuantRotation(128, 5).rotate(vector, new Float64Array(128));
            const second = new TurboQuantRotation(128, 5).rotate(vector, new Float64Array(128));
            const other = new TurboQuantRotation(128, 6).rotate(vector, new Float64Array(128));
            assert.deepStrictEqual(Array.from(first), Array.from(second));
            assert.notDeepStrictEqual(Array.from(first), Array.from(other));
        });
        it('should turn a one-hot vector into normal distributed coordinates', () => {
            const dimensions = 512;
            const rotation = new TurboQuantRotation(dimensions, 3);
            const vector = new Array(dimensions).fill(0);
            vector[7] = 1;
            const rotated = rotation.rotate(vector, new Float64Array(dimensions));
            let secondMoment = 0;
            let fourthMoment = 0;
            for (let i = 0; i < dimensions; i++) {
                const value = rotated[i] * Math.sqrt(dimensions);
                secondMoment += value * value;
                fourthMoment += Math.pow(value, 4);
            }
            secondMoment = secondMoment / dimensions;
            fourthMoment = fourthMoment / dimensions;
            // a normal distribution has a variance of one and a kurtosis of three
            assert.ok(Math.abs(secondMoment - 1) < 0.01, 'variance ' + secondMoment);
            const kurtosis = fourthMoment / (secondMoment * secondMoment);
            assert.ok(Math.abs(kurtosis - 3) < 0.5, 'kurtosis ' + kurtosis);
        });
    });
    describe('TurboQuantIndex', () => {
        describe('basics', () => {
            it('should store and remove vectors', () => {
                const random = seededRandom(21);
                const index = new TurboQuantIndex({ dimensions: 64 });
                assert.strictEqual(index.size, 0);
                index.add('a', randomVector(random, 64));
                index.add('b', randomVector(random, 64));
                assert.strictEqual(index.size, 2);
                assert.ok(index.has('a'));
                assert.deepStrictEqual(index.getIds().sort(), ['a', 'b']);

                assert.strictEqual(index.remove('a'), true);
                assert.strictEqual(index.remove('a'), false);
                assert.strictEqual(index.size, 1);
                assert.strictEqual(index.has('a'), false);
                assert.deepStrictEqual(index.getIds(), ['b']);
            });
            it('should overwrite an existing id instead of adding it twice', () => {
                const random = seededRandom(22);
                const index = new TurboQuantIndex({ dimensions: 64 });
                const first = randomVector(random, 64);
                const second = randomVector(random, 64);
                index.add('a', first);
                index.add('a', second);
                assert.strictEqual(index.size, 1);
                const result = index.search(second, 1);
                assert.strictEqual(result[0].id, 'a');
                assert.ok(result[0].score > 0.8, 'score ' + result[0].score);
            });
            it('should keep the other vectors intact when one is removed', () => {
                const random = seededRandom(23);
                const index = new TurboQuantIndex({ dimensions: 64 });
                const vectors = new Array(20).fill(0).map(() => randomVector(random, 64));
                vectors.forEach((vector, i) => index.add('v' + i, vector));
                index.remove('v0');
                index.remove('v11');
                assert.strictEqual(index.size, 18);
                for (let i = 1; i < 20; i++) {
                    if (i === 11) {
                        continue;
                    }
                    const result = index.search(vectors[i], 1);
                    assert.strictEqual(result[0].id, 'v' + i);
                }
            });
            it('should clear the index', () => {
                const random = seededRandom(24);
                const index = new TurboQuantIndex({ dimensions: 64 });
                index.add('a', randomVector(random, 64));
                index.clear();
                assert.strictEqual(index.size, 0);
                assert.deepStrictEqual(index.search(randomVector(random, 64), 5), []);
            });
            it('should use the expected amount of memory per vector', () => {
                assert.strictEqual(new TurboQuantIndex({ dimensions: 768, bitWidth: 4 }).bytesPerVector, 384);
                assert.strictEqual(new TurboQuantIndex({ dimensions: 768, bitWidth: 2 }).bytesPerVector, 192);
                assert.strictEqual(new TurboQuantIndex({ dimensions: 768, bitWidth: 1 }).bytesPerVector, 96);
            });
            it('should throw on invalid input', () => {
                assert.throws(() => new TurboQuantIndex({ dimensions: 0 }));
                assert.throws(() => new TurboQuantIndex({ dimensions: 1.5 }));
                const index = new TurboQuantIndex({ dimensions: 64 });
                assert.throws(() => index.add('a', [1, 2, 3]));
                assert.throws(() => index.search([1, 2, 3], 1));
            });
            it('should handle zero vectors', () => {
                const random = seededRandom(25);
                const index = new TurboQuantIndex({ dimensions: 64 });
                index.add('zero', new Array(64).fill(0));
                index.add('normal', randomVector(random, 64));
                assert.strictEqual(index.size, 2);
                // a zero query cannot match anything
                assert.deepStrictEqual(index.search(new Array(64).fill(0), 5), []);
                const result = index.search(randomVector(random, 64), 5);
                assert.strictEqual(result.length, 2);
            });
            it('should return at most k results', () => {
                const random = seededRandom(26);
                const index = new TurboQuantIndex({ dimensions: 64 });
                new Array(10).fill(0).forEach((_, i) => index.add('v' + i, randomVector(random, 64)));
                assert.strictEqual(index.search(randomVector(random, 64), 3).length, 3);
                assert.strictEqual(index.search(randomVector(random, 64), 100).length, 10);
                assert.strictEqual(index.search(randomVector(random, 64), 0).length, 0);
            });
        });
        describe('search', () => {
            it('should find the exact vector as the best match', () => {
                const random = seededRandom(31);
                const index = new TurboQuantIndex({ dimensions: 128, bitWidth: 4 });
                const vectors = new Array(200).fill(0).map(() => randomVector(random, 128));
                vectors.forEach((vector, i) => index.add('v' + i, vector));
                for (let i = 0; i < 20; i++) {
                    const result = index.search(vectors[i], 1);
                    assert.strictEqual(result[0].id, 'v' + i);
                }
            });
            it('should sort similarity descending and distance ascending', () => {
                const random = seededRandom(32);
                const index = new TurboQuantIndex({ dimensions: 128 });
                const vectors = new Array(50).fill(0).map(() => randomVector(random, 128));
                vectors.forEach((vector, i) => index.add('v' + i, vector));
                const query = randomVector(random, 128);
                (['cosine', 'dotProduct'] as TurboQuantDistance[]).forEach(distance => {
                    const results = index.search(query, 10, { distance });
                    for (let i = 1; i < results.length; i++) {
                        assert.ok(results[i - 1].score >= results[i].score, distance + ' not sorted');
                    }
                });
                const euclideanResults = index.search(query, 10, { distance: 'euclidean' });
                for (let i = 1; i < euclideanResults.length; i++) {
                    assert.ok(euclideanResults[i - 1].score <= euclideanResults[i].score);
                }
            });
            it('should estimate the real distance values', () => {
                const random = seededRandom(33);
                const dimensions = 256;
                const vectors = new Array(100).fill(0).map(() => randomVector(random, dimensions));
                const query = randomVector(random, dimensions);
                (['cosine', 'dotProduct', 'euclidean'] as TurboQuantDistance[]).forEach(distance => {
                    const index = new TurboQuantIndex({ dimensions, bitWidth: 4, distance });
                    vectors.forEach((vector, i) => index.add('v' + i, vector));
                    const exact = new Map(bruteForce(vectors, query, distance).map(r => [r.id, r.score]));
                    const results = index.search(query, 100);
                    assert.strictEqual(results.length, 100);
                    let squaredError = 0;
                    let squaredTotal = 0;
                    results.forEach(result => {
                        const exactScore = exact.get(result.id) as number;
                        squaredError += Math.pow(result.score - exactScore, 2);
                        squaredTotal += Math.pow(exactScore, 2);
                    });
                    const relativeError = Math.sqrt(squaredError / squaredTotal);
                    assert.ok(relativeError < 0.2, distance + ' relative error ' + relativeError);
                });
            });
            it('should have a better recall with more bits', () => {
                const random = seededRandom(34);
                const dimensions = 128;
                const vectors = new Array(500).fill(0).map(() => randomVector(random, dimensions));
                const queries = new Array(20).fill(0).map(() => randomVector(random, dimensions));

                const recallByBitWidth = ([1, 2, 4] as TurboQuantBitWidth[]).map(bitWidth => {
                    const index = new TurboQuantIndex({ dimensions, bitWidth });
                    vectors.forEach((vector, i) => index.add('v' + i, vector));
                    let found = 0;
                    queries.forEach(query => {
                        const best = bruteForce(vectors, query, 'cosine')[0].id;
                        const results = index.search(query, 10);
                        if (results.some(result => result.id === best)) {
                            found++;
                        }
                    });
                    return found / queries.length;
                });
                assert.ok(recallByBitWidth[2] >= recallByBitWidth[1], 'recall ' + recallByBitWidth.join(' '));
                assert.ok(recallByBitWidth[1] >= recallByBitWidth[0], 'recall ' + recallByBitWidth.join(' '));
                // at 4 bit the true nearest neighbor is nearly always in the top 10
                assert.ok(recallByBitWidth[2] >= 0.9, 'recall@10 at 4 bit ' + recallByBitWidth[2]);
            });
            it('should only return ids of the allowlist', () => {
                const random = seededRandom(35);
                const index = new TurboQuantIndex({ dimensions: 128 });
                const vectors = new Array(100).fill(0).map(() => randomVector(random, 128));
                vectors.forEach((vector, i) => index.add('v' + i, vector));
                const allowlist = ['v3', 'v9', 'v50', 'does-not-exist'];
                const results = index.search(randomVector(random, 128), 10, { allowlist });
                assert.strictEqual(results.length, 3);
                results.forEach(result => assert.ok(allowlist.includes(result.id)));

                // the best match of the allowlist must be the same as without the filter
                const full = index.search(vectors[9], 100);
                const bestAllowed = full.filter(result => allowlist.includes(result.id))[0];
                const filtered = index.search(vectors[9], 10, { allowlist });
                assert.strictEqual(filtered[0].id, bestAllowed.id);
            });
            it('should return an empty result for an empty allowlist', () => {
                const random = seededRandom(36);
                const index = new TurboQuantIndex({ dimensions: 64 });
                index.add('a', randomVector(random, 64));
                assert.deepStrictEqual(index.search(randomVector(random, 64), 5, { allowlist: [] }), []);
            });
        });
        describe('calibration', () => {
            it('should keep the search working after a calibration', () => {
                const random = seededRandom(41);
                const dimensions = 128;
                const vectors = new Array(200).fill(0).map(() => randomVector(random, dimensions));
                const index = new TurboQuantIndex({ dimensions });
                index.calibrate(vectors.slice(0, 100));
                assert.ok(index.scales);
                vectors.forEach((vector, i) => index.add('v' + i, vector));
                for (let i = 0; i < 10; i++) {
                    assert.strictEqual(index.search(vectors[i], 1)[0].id, 'v' + i);
                }
            });
            it('should not change much on already normal distributed data', () => {
                const random = seededRandom(42);
                const dimensions = 128;
                const vectors = new Array(300).fill(0).map(() => randomVector(random, dimensions));
                const index = new TurboQuantIndex({ dimensions });
                index.calibrate(vectors);
                const scales = index.scales as Float64Array;
                for (let j = 0; j < scales.length; j++) {
                    assert.ok(scales[j] > 0.5 && scales[j] < 2, 'scale ' + scales[j]);
                }
            });
            it('should throw when the index is not empty', () => {
                const random = seededRandom(43);
                const index = new TurboQuantIndex({ dimensions: 64 });
                index.add('a', randomVector(random, 64));
                assert.throws(() => index.calibrate([randomVector(random, 64)]));
            });
            it('should do nothing without samples', () => {
                const index = new TurboQuantIndex({ dimensions: 64 });
                index.calibrate([]);
                assert.strictEqual(index.scales, null);
            });
        });
        describe('serialization', () => {
            it('should return the same results after a round trip', () => {
                const random = seededRandom(51);
                const dimensions = 128;
                const index = new TurboQuantIndex({ dimensions, bitWidth: 2, seed: 7, distance: 'euclidean' });
                const vectors = new Array(120).fill(0).map(() => randomVector(random, dimensions));
                vectors.forEach((vector, i) => index.add('v' + i, vector));
                index.remove('v5');

                const serialized = serializeTurboQuantIndex(index);
                const restored = deserializeTurboQuantIndex(serialized);

                assert.strictEqual(restored.dimensions, dimensions);
                assert.strictEqual(restored.bitWidth, 2);
                assert.strictEqual(restored.seed, 7);
                assert.strictEqual(restored.distance, 'euclidean');
                assert.strictEqual(restored.size, index.size);
                assert.deepStrictEqual(restored.getIds(), index.getIds());

                const query = randomVector(random, dimensions);
                assert.deepStrictEqual(restored.search(query, 10), index.search(query, 10));

                // the restored index must still be writable
                restored.add('new', randomVector(random, dimensions));
                assert.strictEqual(restored.size, index.size + 1);
                assert.strictEqual(restored.search(vectors[0], 1)[0].id, 'v0');
            });
            it('should keep the calibration', () => {
                const random = seededRandom(52);
                const dimensions = 128;
                const index = new TurboQuantIndex({ dimensions });
                const vectors = new Array(80).fill(0).map(() => randomVector(random, dimensions));
                index.calibrate(vectors);
                vectors.forEach((vector, i) => index.add('v' + i, vector));
                const restored = deserializeTurboQuantIndex(serializeTurboQuantIndex(index));
                assert.ok(restored.scales);
                assert.strictEqual(restored.search(vectors[3], 1)[0].id, 'v3');
            });
            it('should serialize an empty index', () => {
                const index = new TurboQuantIndex({ dimensions: 64 });
                const restored = deserializeTurboQuantIndex(serializeTurboQuantIndex(index));
                assert.strictEqual(restored.size, 0);
            });
            it('should throw on data that is not a turboquant index', () => {
                assert.throws(() => deserializeTurboQuantIndex(new Uint8Array(10)));
                assert.throws(() => deserializeTurboQuantIndex(new Uint8Array(100)));
            });
        });
    });
    describe('RxCollection.addVectorIndex()', () => {
        async function getCollection(documentAmount: number, dimensions: number, seed: number) {
            const random = seededRandom(seed);
            const database = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                multiInstance: false,
                eventReduce: true
            });
            const collections = await database.addCollections({
                items: {
                    schema: VECTOR_SCHEMA as any
                }
            });
            const vectors: number[][] = [];
            const documents: any[] = [];
            for (let i = 0; i < documentAmount; i++) {
                const embedding = randomVector(random, dimensions);
                vectors.push(embedding);
                documents.push({ id: 'v' + i, embedding });
            }
            if (documents.length > 0) {
                await collections.items.bulkInsert(documents);
            }
            return {
                collection: collections.items,
                vectors,
                random
            };
        }

        it('should fill the index with the documents that already exist', async () => {
            const dimensions = 64;
            const { collection, vectors } = await getCollection(30, dimensions, 61);
            const vectorIndex = await collection.addVectorIndex({
                identifier: 'my-index',
                dimensions,
                batchSize: 7,
                embedding: docData => docData.embedding
            });
            assert.strictEqual(vectorIndex.size, 30);
            assert.strictEqual(vectorIndex.search(vectors[4], 1)[0].id, 'v4');
            await collection.database.close();
        });
        it('should update the index on inserts, updates and deletes', async () => {
            const dimensions = 64;
            const { collection, vectors, random } = await getCollection(5, dimensions, 62);
            const vectorIndex = await collection.addVectorIndex({
                identifier: 'my-index',
                dimensions,
                embedding: docData => docData.embedding
            });
            assert.strictEqual(vectorIndex.size, 5);

            const inserted = randomVector(random, dimensions);
            await collection.insert({ id: 'inserted', embedding: inserted });
            await vectorIndex.awaitInSync();
            assert.strictEqual(vectorIndex.size, 6);
            assert.strictEqual(vectorIndex.search(inserted, 1)[0].id, 'inserted');

            const changed = randomVector(random, dimensions);
            const document = await collection.findOne('v0').exec(true);
            await document.patch({ embedding: changed });
            await vectorIndex.awaitInSync();
            assert.strictEqual(vectorIndex.size, 6);
            assert.strictEqual(vectorIndex.search(changed, 1)[0].id, 'v0');

            await (await collection.findOne('v1').exec(true)).remove();
            await vectorIndex.awaitInSync();
            assert.strictEqual(vectorIndex.size, 5);
            assert.strictEqual(vectorIndex.has('v1'), false);
            assert.strictEqual(
                vectorIndex.search(vectors[1], 10).some(result => result.id === 'v1'),
                false
            );
            await collection.database.close();
        });
        it('should not index documents without a vector', async () => {
            const dimensions = 64;
            const { collection, random } = await getCollection(4, dimensions, 63);
            const vectorIndex = await collection.addVectorIndex({
                identifier: 'my-index',
                dimensions,
                embedding: docData => docData.id === 'v0' ? null : docData.embedding
            });
            assert.strictEqual(vectorIndex.size, 3);
            assert.strictEqual(vectorIndex.has('v0'), false);

            // a document that loses its vector must be removed from the index again
            const document = await collection.findOne('v1').exec(true);
            await document.patch({ embedding: randomVector(random, dimensions) });
            await vectorIndex.awaitInSync();
            assert.strictEqual(vectorIndex.size, 3);
            await collection.database.close();
        });
        it('should return the matching RxDocuments', async () => {
            const dimensions = 64;
            const { collection, vectors } = await getCollection(20, dimensions, 64);
            const vectorIndex = await collection.addVectorIndex({
                identifier: 'my-index',
                dimensions,
                embedding: docData => docData.embedding
            });
            const results = await vectorIndex.searchDocuments(vectors[8], 3);
            assert.strictEqual(results.length, 3);
            assert.strictEqual(results[0].id, 'v8');
            assert.strictEqual(results[0].document.id, 'v8');
            assert.deepStrictEqual(results[0].document.embedding, vectors[8]);
            await collection.database.close();
        });
        it('should support an async embedding function', async () => {
            const dimensions = 64;
            const { collection, vectors } = await getCollection(10, dimensions, 65);
            const vectorIndex = await collection.addVectorIndex({
                identifier: 'my-index',
                dimensions,
                embedding: async docData => {
                    await new Promise(resolve => setTimeout(resolve, 1));
                    return docData.embedding;
                }
            });
            assert.strictEqual(vectorIndex.size, 10);
            assert.strictEqual(vectorIndex.search(vectors[2], 1)[0].id, 'v2');
            await collection.database.close();
        });
        it('should calibrate from the stored documents', async () => {
            const dimensions = 64;
            const { collection, vectors } = await getCollection(40, dimensions, 66);
            const vectorIndex = await collection.addVectorIndex({
                identifier: 'my-index',
                dimensions,
                calibrationSampleSize: 20,
                embedding: docData => docData.embedding
            });
            assert.ok(vectorIndex.index.scales);
            assert.strictEqual(vectorIndex.size, 40);
            assert.strictEqual(vectorIndex.search(vectors[7], 1)[0].id, 'v7');
            await collection.database.close();
        });
        it('should emit errors of the embedding function to error$', async () => {
            const dimensions = 64;
            const { collection, random } = await getCollection(2, dimensions, 69);
            const vectorIndex = await collection.addVectorIndex({
                identifier: 'my-index',
                dimensions,
                embedding: docData => {
                    if (docData.id === 'broken') {
                        throw new Error('no embedding for this one');
                    }
                    return docData.embedding;
                }
            });
            const errors: Error[] = [];
            vectorIndex.error$.subscribe(error => errors.push(error));

            await collection.insert({ id: 'broken', embedding: randomVector(random, dimensions) });
            await vectorIndex.awaitInSync();
            assert.strictEqual(errors.length, 1);
            assert.strictEqual(vectorIndex.size, 2);

            // the index must still process the writes that come afterwards
            const working = randomVector(random, dimensions);
            await collection.insert({ id: 'working', embedding: working });
            await vectorIndex.awaitInSync();
            assert.strictEqual(vectorIndex.size, 3);
            assert.strictEqual(vectorIndex.search(working, 1)[0].id, 'working');
            await collection.database.close();
        });
        it('should get and close the index', async () => {
            const dimensions = 64;
            const { collection, random } = await getCollection(3, dimensions, 67);
            const vectorIndex = await collection.addVectorIndex({
                identifier: 'my-index',
                dimensions,
                embedding: docData => docData.embedding
            });
            assert.strictEqual(getVectorIndex(collection, 'my-index'), vectorIndex);
            assert.throws(() => getVectorIndex(collection, 'other'));

            await assertThrows(
                () => collection.addVectorIndex({
                    identifier: 'my-index',
                    dimensions,
                    embedding: docData => docData.embedding
                }),
                'RxError'
            );

            await vectorIndex.close();
            assert.strictEqual(vectorIndex.size, 0);
            assert.throws(() => getVectorIndex(collection, 'my-index'));

            // writes after the close must not throw
            await collection.insert({ id: 'after-close', embedding: randomVector(random, dimensions) });
            await collection.database.close();
        });
        it('should close together with the collection', async () => {
            const dimensions = 64;
            const { collection } = await getCollection(2, dimensions, 68);
            const vectorIndex = await collection.addVectorIndex({
                identifier: 'my-index',
                dimensions,
                embedding: docData => docData.embedding
            });
            await collection.database.close();
            assert.strictEqual(vectorIndex.closed, true);
        });
    });
});
