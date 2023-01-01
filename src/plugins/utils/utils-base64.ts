
/**
 * NO! We cannot just use btoa() and atob()
 * because they do not work correctly with binary data.
 * @link https://stackoverflow.com/q/30106476/3443137
 */
import { encode, decode } from 'js-base64';

/**
 * atob() and btoa() do not work well with non ascii chars,
 * so we have to use these helper methods instead.
 * @link https://stackoverflow.com/a/30106551/3443137
 */
// Encoding UTF8 -> base64
export function b64EncodeUnicode(str: string) {
    return encode(str);
}

// Decoding base64 -> UTF8
export function b64DecodeUnicode(str: string) {
    return decode(str);
}

/**
 * @link https://stackoverflow.com/a/9458996/3443137
 */
export function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

