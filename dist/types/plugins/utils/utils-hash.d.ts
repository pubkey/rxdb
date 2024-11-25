import type { HashFunction } from '../../types/index.d.ts';
export declare function nativeSha256(input: string): Promise<string>;
export declare const defaultHashSha256: HashFunction;
export declare function hashStringToNumber(str: string): number;
