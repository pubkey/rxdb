import { newRxError } from '../../rx-error.ts';
import {
    normalCdf,
    normalPdf,
    normalQuantile
} from './normal-distribution.ts';
import type {
    TurboQuantBitWidth,
    TurboQuantCodebook
} from './types.ts';

export const TURBO_QUANT_BIT_WIDTHS: TurboQuantBitWidth[] = [1, 2, 4];

const CODEBOOK_CACHE = new Map<TurboQuantBitWidth, TurboQuantCodebook>();

/**
 * Builds the Lloyd-Max optimal scalar quantizer for the
 * standard normal distribution with the Lloyd iteration:
 * A bucket boundary is the middle between its two neighbor centroids
 * and a centroid is the conditional mean of its bucket.
 * The result only depends on the bit width, not on the data,
 * which is why the codebook can be cached and shared between all indexes.
 * @link https://en.wikipedia.org/wiki/Lloyd%27s_algorithm
 */
export function getTurboQuantCodebook(bitWidth: TurboQuantBitWidth): TurboQuantCodebook {
    const cached = CODEBOOK_CACHE.get(bitWidth);
    if (cached) {
        return cached;
    }
    if (!TURBO_QUANT_BIT_WIDTHS.includes(bitWidth)) {
        throw newRxError('VQ1', {
            have: bitWidth,
            should: TURBO_QUANT_BIT_WIDTHS.join(', ')
        });
    }

    const levels = 1 << bitWidth;
    const boundaries = new Float64Array(levels - 1);
    const centroids = new Float64Array(levels);

    // start with buckets that all have the same probability mass
    for (let i = 1; i < levels; i++) {
        boundaries[i - 1] = normalQuantile(i / levels);
    }

    for (let iteration = 0; iteration < 300; iteration++) {
        for (let i = 0; i < levels; i++) {
            const isFirst = i === 0;
            const isLast = i === levels - 1;
            const low = isFirst ? -Infinity : boundaries[i - 1];
            const high = isLast ? Infinity : boundaries[i];
            /**
             * The conditional mean of a standard normal on (low, high)
             * is (pdf(low) - pdf(high)) / (cdf(high) - cdf(low)).
             */
            const pdfLow = isFirst ? 0 : normalPdf(low);
            const pdfHigh = isLast ? 0 : normalPdf(high);
            const cdfLow = isFirst ? 0 : normalCdf(low);
            const cdfHigh = isLast ? 1 : normalCdf(high);
            const mass = cdfHigh - cdfLow;
            centroids[i] = mass > 0 ? (pdfLow - pdfHigh) / mass : (low + high) / 2;
        }
        for (let i = 0; i < levels - 1; i++) {
            boundaries[i] = (centroids[i] + centroids[i + 1]) / 2;
        }
    }

    const codebook: TurboQuantCodebook = {
        bitWidth,
        levels,
        boundaries,
        centroids
    };
    CODEBOOK_CACHE.set(bitWidth, codebook);
    return codebook;
}

/**
 * Returns the bucket of a value.
 */
export function quantizeValue(codebook: TurboQuantCodebook, value: number): number {
    const boundaries = codebook.boundaries;
    let low = 0;
    let high = codebook.levels - 1;
    while (low < high) {
        const middle = (low + high) >> 1;
        if (value < boundaries[middle]) {
            high = middle;
        } else {
            low = middle + 1;
        }
    }
    return low;
}
