import type { RxStorage, CompressionMode } from '../../types/index.d.ts';
export declare function compressBase64(_mode: CompressionMode, base64String: string): string;
export declare function decompressBase64(_mode: CompressionMode, base64String: string): string;
/**
 * A RxStorage wrapper that compresses attachment data on writes
 * and decompresses the data on reads.
 * This is currently using the 'pako' module
 * @link https://www.npmjs.com/package/pako
 *
 * In the future when firefox supports the CompressionStream API,
 * we should switch to using the native API in browsers and the zlib package in node.js
 * @link https://caniuse.com/?search=compressionstream
 */
export declare function wrappedAttachmentsCompressionStorage<Internals, InstanceCreationOptions>(args: {
    storage: RxStorage<Internals, InstanceCreationOptions>;
}): RxStorage<Internals, InstanceCreationOptions>;
