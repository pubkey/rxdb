import { newRxError } from '../../rx-error.ts';
import {
    getTurboQuantCodebook,
    quantizeValue
} from './lloyd-max.ts';
import { TurboQuantRotation } from './rotation.ts';
import type {
    TurboQuantBitWidth,
    TurboQuantCodebook,
    TurboQuantDistance,
    TurboQuantIndexOptions,
    TurboQuantSearchOptions,
    TurboQuantSearchResult,
    TurboQuantVector
} from './types.ts';

export const DEFAULT_TURBO_QUANT_SEED = 1337;
export const DEFAULT_TURBO_QUANT_BIT_WIDTH: TurboQuantBitWidth = 4;
export const DEFAULT_TURBO_QUANT_DISTANCE: TurboQuantDistance = 'cosine';

/**
 * Lowest and highest calibration scale. Without these bounds a coordinate
 * that is nearly constant in the calibration sample would get an
 * extreme scale that makes all other values fall into the outer buckets.
 */
const MIN_CALIBRATION_SCALE = 0.25;
const MAX_CALIBRATION_SCALE = 4;

/**
 * Keeps the best k results while the index is scanned.
 * The root of the heap is always the worst of the currently kept results,
 * so a candidate can be rejected with a single comparison.
 */
export class TurboQuantTopK {
    public size = 0;
    private readonly scores: Float64Array;
    private readonly slots: Int32Array;

    constructor(
        public readonly capacity: number,
        /**
         * True for distance methods where a lower value is a better match.
         */
        public readonly lowerIsBetter: boolean
    ) {
        this.scores = new Float64Array(capacity);
        this.slots = new Int32Array(capacity);
    }

    private isWorse(a: number, b: number): boolean {
        return this.lowerIsBetter ? a > b : a < b;
    }

    add(score: number, slot: number) {
        if (this.size < this.capacity) {
            let position = this.size++;
            this.scores[position] = score;
            this.slots[position] = slot;
            while (position > 0) {
                const parent = (position - 1) >> 1;
                if (!this.isWorse(this.scores[position], this.scores[parent])) {
                    break;
                }
                this.swap(position, parent);
                position = parent;
            }
        } else if (this.isWorse(this.scores[0], score)) {
            this.scores[0] = score;
            this.slots[0] = slot;
            let position = 0;
            while (true) {
                const left = position * 2 + 1;
                const right = left + 1;
                let worst = position;
                if (left < this.size && this.isWorse(this.scores[left], this.scores[worst])) {
                    worst = left;
                }
                if (right < this.size && this.isWorse(this.scores[right], this.scores[worst])) {
                    worst = right;
                }
                if (worst === position) {
                    break;
                }
                this.swap(position, worst);
                position = worst;
            }
        }
    }

    private swap(a: number, b: number) {
        const score = this.scores[a];
        this.scores[a] = this.scores[b];
        this.scores[b] = score;
        const slot = this.slots[a];
        this.slots[a] = this.slots[b];
        this.slots[b] = slot;
    }

    /**
     * Returns the kept entries, best match first.
     */
    toSorted(): { slot: number; score: number; }[] {
        const ret: { slot: number; score: number; }[] = [];
        for (let i = 0; i < this.size; i++) {
            ret.push({ slot: this.slots[i], score: this.scores[i] });
        }
        ret.sort((a, b) => this.lowerIsBetter ? a.score - b.score : b.score - a.score);
        return ret;
    }
}

/**
 * An in-memory vector index that stores the vectors with TurboQuant
 * quantization instead of storing the raw float values.
 * At 4 bit it needs 8 times less memory than float32 vectors,
 * at 2 bit 16 times less and at 1 bit 32 times less.
 * @link https://arxiv.org/abs/2504.19874
 */
export class TurboQuantIndex {
    public readonly dimensions: number;
    public readonly bitWidth: TurboQuantBitWidth;
    public readonly seed: number;
    public readonly distance: TurboQuantDistance;
    public readonly rotation: TurboQuantRotation;
    public readonly codebook: TurboQuantCodebook;
    public readonly paddedDim: number;
    public readonly bytesPerVector: number;
    public readonly codesPerByte: number;

    public count = 0;
    public capacity = 0;
    public codes = new Uint8Array(0);
    /**
     * Length of each stored vector, needed for cosine and euclidean.
     */
    public norms = new Float32Array(0);
    /**
     * Correction factor that removes the bias of the quantization,
     * see the length-renormalization step of TurboQuant.
     */
    public renorms = new Float32Array(0);
    public ids: string[] = [];
    public idToSlot = new Map<string, number>();
    /**
     * Per coordinate calibration factors, null when the index is not calibrated.
     */
    public scales: Float64Array | null = null;

    private readonly sqrtPaddedDim: number;
    /**
     * forwardScale[j] maps a rotated coordinate into the space of the codebook,
     * inverseScale[j] maps a codebook centroid back. Both already contain
     * the sqrt(paddedDim) factor that turns the coordinates of a unit vector
     * into values with a variance of one.
     */
    private forwardScale: Float64Array;
    private inverseScale: Float64Array;

    private readonly unitBuffer: Float64Array;
    private readonly rotationBuffer: Float64Array;
    private readonly coordinateLut: Float64Array;
    private readonly byteLut: Float32Array;

    constructor(options: TurboQuantIndexOptions) {
        const dimensions = options.dimensions;
        if (!Number.isInteger(dimensions) || dimensions < 1) {
            throw newRxError('VQ2', {
                have: dimensions
            });
        }
        this.dimensions = dimensions;
        this.bitWidth = options.bitWidth ? options.bitWidth : DEFAULT_TURBO_QUANT_BIT_WIDTH;
        this.seed = typeof options.seed === 'number' ? options.seed : DEFAULT_TURBO_QUANT_SEED;
        this.distance = options.distance ? options.distance : DEFAULT_TURBO_QUANT_DISTANCE;
        this.codebook = getTurboQuantCodebook(this.bitWidth);
        this.rotation = new TurboQuantRotation(dimensions, this.seed);
        this.paddedDim = this.rotation.paddedDim;
        this.codesPerByte = 8 / this.bitWidth;
        this.bytesPerVector = this.paddedDim / this.codesPerByte;
        this.sqrtPaddedDim = Math.sqrt(this.paddedDim);

        this.forwardScale = new Float64Array(this.paddedDim);
        this.inverseScale = new Float64Array(this.paddedDim);
        this.applyScales(null);

        this.unitBuffer = new Float64Array(dimensions);
        this.rotationBuffer = new Float64Array(this.paddedDim);
        this.coordinateLut = new Float64Array(this.paddedDim * this.codebook.levels);
        this.byteLut = new Float32Array(this.bytesPerVector * 256);
    }

    get size(): number {
        return this.count;
    }

    has(id: string): boolean {
        return this.idToSlot.has(id);
    }

    getIds(): string[] {
        return this.ids.slice(0, this.count);
    }

    /**
     * Sets the calibration factors and updates the derived lookup values.
     */
    public applyScales(scales: Float64Array | null) {
        this.scales = scales;
        for (let j = 0; j < this.paddedDim; j++) {
            const scale = scales ? scales[j] : 1;
            this.forwardScale[j] = this.sqrtPaddedDim * scale;
            this.inverseScale[j] = 1 / this.forwardScale[j];
        }
    }

    /**
     * Normalizes a vector and rotates it into the quantization space.
     * Returns the length of the input vector, the rotated unit vector
     * is written into this.rotationBuffer.
     */
    private prepare(vector: TurboQuantVector): number {
        const dimensions = this.dimensions;
        if (vector.length !== dimensions) {
            throw newRxError('VQ3', {
                have: vector.length,
                should: dimensions
            });
        }
        let squaredNorm = 0;
        for (let i = 0; i < dimensions; i++) {
            const value = vector[i];
            squaredNorm += value * value;
        }
        const norm = Math.sqrt(squaredNorm);
        const unit = this.unitBuffer;
        if (norm > 0) {
            for (let i = 0; i < dimensions; i++) {
                unit[i] = vector[i] / norm;
            }
        } else {
            unit.fill(0);
        }
        this.rotation.rotate(unit, this.rotationBuffer);
        return norm;
    }

    /**
     * Stores a vector under the given id.
     * An already stored vector with the same id is overwritten.
     */
    add(id: string, vector: TurboQuantVector) {
        const norm = this.prepare(vector);
        const existingSlot = this.idToSlot.get(id);
        let slot: number;
        if (typeof existingSlot === 'number') {
            slot = existingSlot;
        } else {
            this.ensureCapacity(this.count + 1);
            slot = this.count++;
            this.ids[slot] = id;
            this.idToSlot.set(id, slot);
        }

        const paddedDim = this.paddedDim;
        const bitWidth = this.bitWidth;
        const codesPerByte = this.codesPerByte;
        const codes = this.codes;
        const centroids = this.codebook.centroids;
        const rotated = this.rotationBuffer;
        const offset = slot * this.bytesPerVector;
        codes.fill(0, offset, offset + this.bytesPerVector);

        /**
         * The dot product between the rotated unit vector and its own
         * quantized version. It is always smaller than one, storing
         * norm/dot corrects the resulting bias of every later search.
         */
        let dot = 0;
        for (let j = 0; j < paddedDim; j++) {
            const rotatedValue = rotated[j];
            const code = quantizeValue(this.codebook, rotatedValue * this.forwardScale[j]);
            codes[offset + ((j / codesPerByte) | 0)] |= code << ((j % codesPerByte) * bitWidth);
            dot += rotatedValue * centroids[code] * this.inverseScale[j];
        }

        this.norms[slot] = norm;
        this.renorms[slot] = dot !== 0 ? norm / dot : 0;
    }

    /**
     * Removes a vector by id in constant time
     * by moving the last stored vector into the freed slot.
     */
    remove(id: string): boolean {
        const slot = this.idToSlot.get(id);
        if (typeof slot !== 'number') {
            return false;
        }
        const lastSlot = this.count - 1;
        if (slot !== lastSlot) {
            const bytesPerVector = this.bytesPerVector;
            this.codes.copyWithin(
                slot * bytesPerVector,
                lastSlot * bytesPerVector,
                (lastSlot + 1) * bytesPerVector
            );
            this.norms[slot] = this.norms[lastSlot];
            this.renorms[slot] = this.renorms[lastSlot];
            const movedId = this.ids[lastSlot];
            this.ids[slot] = movedId;
            this.idToSlot.set(movedId, slot);
        }
        this.ids.length = lastSlot;
        this.count = lastSlot;
        this.idToSlot.delete(id);
        return true;
    }

    clear() {
        this.count = 0;
        this.ids = [];
        this.idToSlot.clear();
    }

    /**
     * Fits one factor per coordinate so that the codebook matches the
     * data more closely. This is the optional TQ+ step of TurboQuant.
     * It must run before any vector is added because it changes
     * how the coordinates are mapped to the codebook.
     */
    calibrate(vectors: TurboQuantVector[]) {
        if (this.count > 0) {
            throw newRxError('VQ4', {
                have: this.count
            });
        }
        if (vectors.length === 0) {
            return;
        }
        const paddedDim = this.paddedDim;
        const sampleCount = vectors.length;
        // coordinate major so that the values of one coordinate lie next to each other
        const samples = new Float32Array(paddedDim * sampleCount);
        for (let i = 0; i < sampleCount; i++) {
            this.prepare(vectors[i]);
            const rotated = this.rotationBuffer;
            for (let j = 0; j < paddedDim; j++) {
                samples[j * sampleCount + i] = rotated[j] * this.sqrtPaddedDim;
            }
        }
        const scales = new Float64Array(paddedDim);
        const values = new Float64Array(sampleCount);
        for (let j = 0; j < paddedDim; j++) {
            const start = j * sampleCount;
            for (let i = 0; i < sampleCount; i++) {
                values[i] = samples[start + i];
            }
            scales[j] = this.fitScale(values);
        }
        this.applyScales(scales);
    }

    /**
     * Searches the factor that gives the smallest reconstruction error
     * for one coordinate. A factor of one means the coordinate already
     * matches the codebook, which is what a perfect rotation produces,
     * so it is always part of the search.
     */
    private fitScale(values: Float64Array): number {
        const codebook = this.codebook;
        const centroids = codebook.centroids;
        const distortion = (scale: number): number => {
            let sum = 0;
            for (let i = 0; i < values.length; i++) {
                const value = values[i];
                const code = quantizeValue(codebook, value * scale);
                const difference = value - centroids[code] / scale;
                sum += difference * difference;
            }
            return sum;
        };
        let bestScale = 1;
        let bestDistortion = distortion(1);
        let low = 0.5;
        let high = 2;
        for (let pass = 0; pass < 2; pass++) {
            const step = (high - low) / 10;
            for (let i = 0; i <= 10; i++) {
                const scale = low + step * i;
                const current = distortion(scale);
                if (current < bestDistortion) {
                    bestDistortion = current;
                    bestScale = scale;
                }
            }
            low = Math.max(MIN_CALIBRATION_SCALE, bestScale - step);
            high = Math.min(MAX_CALIBRATION_SCALE, bestScale + step);
        }
        return bestScale;
    }

    /**
     * Returns the k best matches for the given vector.
     */
    search(
        query: TurboQuantVector,
        k: number,
        options: TurboQuantSearchOptions = {}
    ): TurboQuantSearchResult[] {
        const distance = options.distance ? options.distance : this.distance;
        if (query.length !== this.dimensions) {
            throw newRxError('VQ3', {
                have: query.length,
                should: this.dimensions
            });
        }
        if (this.count === 0 || k < 1) {
            return [];
        }
        const queryNorm = this.prepare(query);
        if (queryNorm === 0) {
            return [];
        }

        const paddedDim = this.paddedDim;
        const levels = this.codebook.levels;
        const centroids = this.codebook.centroids;
        const rotated = this.rotationBuffer;
        const coordinateLut = this.coordinateLut;
        for (let j = 0; j < paddedDim; j++) {
            const factor = rotated[j] * this.inverseScale[j];
            const start = j * levels;
            for (let c = 0; c < levels; c++) {
                coordinateLut[start + c] = factor * centroids[c];
            }
        }

        /**
         * Fold the per coordinate table into a per byte table so that
         * scoring one vector only needs one lookup per stored byte
         * instead of one lookup per dimension.
         */
        const bitWidth = this.bitWidth;
        const codesPerByte = this.codesPerByte;
        const mask = levels - 1;
        const byteLut = this.byteLut;
        const bytesPerVector = this.bytesPerVector;
        for (let byteIndex = 0; byteIndex < bytesPerVector; byteIndex++) {
            const firstCoordinate = byteIndex * codesPerByte;
            const lutStart = byteIndex * 256;
            for (let byteValue = 0; byteValue < 256; byteValue++) {
                let sum = 0;
                for (let s = 0; s < codesPerByte; s++) {
                    const code = (byteValue >> (s * bitWidth)) & mask;
                    sum += coordinateLut[(firstCoordinate + s) * levels + code];
                }
                byteLut[lutStart + byteValue] = sum;
            }
        }

        const lowerIsBetter = distance === 'euclidean';
        const topK = new TurboQuantTopK(Math.min(k, this.count), lowerIsBetter);
        const codes = this.codes;
        const norms = this.norms;
        const renorms = this.renorms;
        const squaredQueryNorm = queryNorm * queryNorm;

        const slots = this.resolveSlots(options.allowlist);
        const slotCount = slots ? slots.length : this.count;
        for (let i = 0; i < slotCount; i++) {
            const slot = slots ? slots[i] : i;
            const offset = slot * bytesPerVector;
            let sum = 0;
            for (let byteIndex = 0; byteIndex < bytesPerVector; byteIndex++) {
                sum += byteLut[byteIndex * 256 + codes[offset + byteIndex]];
            }
            /**
             * The estimated dot product between the stored vector
             * and the normalized query vector.
             */
            const unitDot = sum * renorms[slot];
            const norm = norms[slot];
            let score: number;
            if (distance === 'cosine') {
                score = norm > 0 ? unitDot / norm : 0;
            } else if (distance === 'euclidean') {
                const squared = squaredQueryNorm + norm * norm - 2 * unitDot * queryNorm;
                score = squared > 0 ? Math.sqrt(squared) : 0;
            } else {
                score = unitDot * queryNorm;
            }
            topK.add(score, slot);
        }

        return topK.toSorted().map(entry => ({
            id: this.ids[entry.slot],
            score: entry.score
        }));
    }

    /**
     * Turns an allowlist of ids into the slots that have to be scanned.
     * Returns null when all slots have to be scanned.
     */
    private resolveSlots(allowlist?: Iterable<string>): number[] | null {
        if (!allowlist) {
            return null;
        }
        const slots: number[] = [];
        for (const id of allowlist) {
            const slot = this.idToSlot.get(id);
            if (typeof slot === 'number') {
                slots.push(slot);
            }
        }
        return slots;
    }

    /**
     * Allocates the memory for the given amount of vectors up front.
     */
    reserve(count: number) {
        this.ensureCapacity(count);
    }

    private ensureCapacity(needed: number) {
        if (needed <= this.capacity) {
            return;
        }
        let capacity = this.capacity === 0 ? 32 : this.capacity;
        while (capacity < needed) {
            capacity = capacity * 2;
        }
        const codes = new Uint8Array(capacity * this.bytesPerVector);
        codes.set(this.codes);
        this.codes = codes;
        const norms = new Float32Array(capacity);
        norms.set(this.norms);
        this.norms = norms;
        const renorms = new Float32Array(capacity);
        renorms.set(this.renorms);
        this.renorms = renorms;
        this.capacity = capacity;
    }
}
