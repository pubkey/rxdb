/**
 * atob() and btoa() do not work well with non ascii chars,
 * so we have to use these helper methods instead.
 * @link https://stackoverflow.com/a/30106551/3443137
 */
export declare function b64EncodeUnicode(str: string): string;
export declare function b64DecodeUnicode(str: string): string;
/**
 * @link https://stackoverflow.com/a/9458996/3443137
 */
export declare function arrayBufferToBase64(buffer: ArrayBuffer): string;
