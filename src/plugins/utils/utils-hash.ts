import { sha256 } from 'ohash';
import type { HashFunction } from '../../types/index.d.ts';


/**
 * TODO in the future we should no longer provide a
 * fallback to crypto.subtle.digest.
 * Instead users without crypto.subtle.digest support, should have to provide their own
 * hash function.
 */
export function jsSha256(input: string) {
    return Promise.resolve(sha256(input));
}

export async function nativeSha256(input: string) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    /**
     * @link https://jameshfisher.com/2017/10/30/web-cryptography-api-hello-world/
     */
    const hash = Array.prototype.map.call(
        new Uint8Array(hashBuffer),
        x => (('00' + x.toString(16)).slice(-2))
    ).join('');
    return hash;
}


export const canUseCryptoSubtle = typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.digest === 'function';

/**
 * Default hash method used to hash
 * strings and do equal comparisons.
 *
 * IMPORTANT: Changing the default hashing method
 * requires a BREAKING change!
 */

export const defaultHashSha256: HashFunction = canUseCryptoSubtle ? nativeSha256 : jsSha256;


export function hashStringToNumber(str: string): number {
    let nr = 0;
    const len = str.length;
    for (let i = 0; i < len; i++) {
        nr = nr + str.charCodeAt(i);
        nr |= 0; // Convert to 32bit integer, improves performance
    }
    return nr;
}
