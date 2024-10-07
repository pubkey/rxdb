import type { HashFunction } from '../../types/index.d.ts';
/**
 * TODO in the future we should no longer provide a
 * fallback to crypto.subtle.digest.
 * Instead users without crypto.subtle.digest support, should have to provide their own
 * hash function.
 */
export declare function jsSha256(input: string): Promise<string>;
export declare function nativeSha256(input: string): Promise<string>;
export declare const canUseCryptoSubtle: boolean;
/**
 * Default hash method used to hash
 * strings and do equal comparisons.
 *
 * IMPORTANT: Changing the default hashing method
 * requires a BREAKING change!
 */
export declare const defaultHashSha256: HashFunction;
export declare function hashStringToNumber(str: string): number;
