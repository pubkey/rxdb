import type { HashFunction } from '../../types/index.d.ts';

export async function nativeSha256(input: string) {
    const data = new TextEncoder().encode(input);
    /**
     * If your JavaScript runtime does not support crypto.subtle.digest,
     * provide your own hash function when calling createRxDatabase().
     */

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
