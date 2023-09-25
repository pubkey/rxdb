import { sha256 } from 'ohash';
import type { HashFunction } from '../../types';


export function jsSha256(input: string) {
    return Promise.resolve(sha256(input));
}

const TEXT_ENCODER = new TextEncoder();
export async function nativeSha256(input: string) {
    const data = TEXT_ENCODER.encode(input);
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
