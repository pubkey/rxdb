import { newRxError } from '../../rx-error.ts';
import type { HashFunction } from '../../types/index.d.ts';

/**
 * Cache this here so we do not have to run the try-catch
 * each time for better performance.
 * If your JavaScript runtime does not support crypto.subtle.digest,
 * provide your own hash function when calling createRxDatabase().
 */
let hashFn: typeof crypto.subtle.digest;
function getHashFn() {
    if (hashFn) {
        return hashFn;
    }
    if (
        typeof crypto === 'undefined' ||
        typeof crypto.subtle === 'undefined' ||
        typeof crypto.subtle.digest !== 'function'
    ) {
        throw newRxError('UT8', {
            args: {
                typeof_crypto: typeof crypto,
                typeof_crypto_subtle: typeof crypto?.subtle,
                typeof_crypto_subtle_digest: typeof crypto?.subtle?.digest
            }
        });
    }
    hashFn = crypto.subtle.digest.bind(crypto.subtle);
    return hashFn;
}

export async function nativeSha256(input: string) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await getHashFn()('SHA-256', data);
    /**
     * @link https://jameshfisher.com/2017/10/30/web-cryptography-api-hello-world/
     */
    const hash = Array.prototype.map.call(
        new Uint8Array(hashBuffer),
        x => (('00' + x.toString(16)).slice(-2))
    ).join('');
    return hash;
}

export const defaultHashSha256: HashFunction = nativeSha256;


export function hashStringToNumber(str: string): number {
    let nr = 0;
    const len = str.length;
    for (let i = 0; i < len; i++) {
        nr = nr + str.charCodeAt(i);
        nr |= 0; // Convert to 32bit integer, improves performance
    }
    return nr;
}
