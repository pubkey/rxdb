/**
 * Size of a single Walsh-Hadamard block.
 * Must be a power of two. Padding the vectors to a multiple of 64
 * wastes at most 63 dimensions, while padding to the next power of two
 * would waste up to 33% for the common embedding sizes like 768 or 1536.
 */
export const TURBO_QUANT_BLOCK_SIZE = 64;

const BLOCK_NORMALIZATION = 1 / Math.sqrt(TURBO_QUANT_BLOCK_SIZE);

/**
 * Small deterministic pseudo random number generator.
 * The rotation must be reproducible from the seed alone so that
 * a serialized index can be read again without storing the whole matrix.
 * @link https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 */
export function mulberry32(seed: number) {
    let state = seed | 0;
    return function (): number {
        state = state + 0x6D2B79F5 | 0;
        let t = Math.imul(state ^ state >>> 15, 1 | state);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function padDimensions(dimensions: number): number {
    return Math.ceil(dimensions / TURBO_QUANT_BLOCK_SIZE) * TURBO_QUANT_BLOCK_SIZE;
}

/**
 * A random rotation that is applied to every vector before it is quantized.
 * After the rotation each coordinate follows the same normal distribution,
 * no matter what the input data looked like. This is what makes the
 * quantizer data-oblivious: the codebook can be precomputed
 * and never has to be trained on the data.
 *
 * A full random orthogonal matrix would need d*d memory and d*d operations
 * per vector. Instead this uses a randomized block Walsh-Hadamard transform:
 * each round flips the sign of every coordinate, runs a Walsh-Hadamard
 * transform on each block and then permutes all coordinates so that the
 * next round mixes the blocks with each other. Every step is orthogonal,
 * so the whole rotation preserves norms and dot products exactly,
 * and it runs in d * log(blockSize) time.
 */
export class TurboQuantRotation {
    public readonly paddedDim: number;
    public readonly rounds: number;
    private readonly signs: Float64Array[] = [];
    private readonly permutations: Int32Array[] = [];
    private readonly scratch: Float64Array;

    constructor(
        public readonly dimensions: number,
        public readonly seed: number,
        rounds: number = 3
    ) {
        this.rounds = rounds;
        this.paddedDim = padDimensions(dimensions);
        this.scratch = new Float64Array(this.paddedDim);

        const random = mulberry32(seed);
        for (let round = 0; round < rounds; round++) {
            /**
             * The normalization of the Walsh-Hadamard transform is folded into
             * the signs. Scaling the input of a linear transform is the same as
             * scaling its output, and this way it costs no extra pass.
             */
            const signs = new Float64Array(this.paddedDim);
            for (let i = 0; i < this.paddedDim; i++) {
                signs[i] = (random() < 0.5 ? -1 : 1) * BLOCK_NORMALIZATION;
            }
            this.signs.push(signs);

            // the last round does not permute, see rotate()
            if (round === rounds - 1) {
                continue;
            }
            const permutation = new Int32Array(this.paddedDim);
            for (let i = 0; i < this.paddedDim; i++) {
                permutation[i] = i;
            }
            // Fisher-Yates shuffle
            for (let i = this.paddedDim - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                const swap = permutation[i];
                permutation[i] = permutation[j];
                permutation[j] = swap;
            }
            this.permutations.push(permutation);
        }
    }

    /**
     * Writes the rotated vector into the given output buffer
     * which must have the length of this.paddedDim.
     */
    rotate(input: ArrayLike<number>, output: Float64Array): Float64Array {
        const paddedDim = this.paddedDim;
        const dimensions = this.dimensions;
        const blockSize = TURBO_QUANT_BLOCK_SIZE;
        const rounds = this.rounds;
        const lastRound = rounds - 1;

        for (let i = 0; i < dimensions; i++) {
            output[i] = input[i];
        }
        for (let i = dimensions; i < paddedDim; i++) {
            output[i] = 0;
        }

        /**
         * The permutation of a round writes into the other buffer instead of
         * copying the values back, so both buffers switch their role each round.
         */
        let current = output;
        let other = this.scratch;
        for (let round = 0; round < rounds; round++) {
            const signs = this.signs[round];
            for (let i = 0; i < paddedDim; i++) {
                current[i] *= signs[i];
            }
            for (let blockStart = 0; blockStart < paddedDim; blockStart += blockSize) {
                for (let length = 1; length < blockSize; length <<= 1) {
                    const step = length << 1;
                    for (let i = blockStart; i < blockStart + blockSize; i += step) {
                        for (let left = i; left < i + length; left++) {
                            const right = left + length;
                            const a = current[left];
                            const b = current[right];
                            current[left] = a + b;
                            current[right] = a - b;
                        }
                    }
                }
            }
            /**
             * The permutation mixes the blocks with each other so that the next
             * round does not stay inside the same block. After the last round
             * it would only relabel the coordinates, so it is left out.
             */
            if (round < lastRound) {
                const permutation = this.permutations[round];
                for (let i = 0; i < paddedDim; i++) {
                    other[permutation[i]] = current[i];
                }
                const swap = current;
                current = other;
                other = swap;
            }
        }
        if (current !== output) {
            output.set(current);
        }
        return output;
    }
}
