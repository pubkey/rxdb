import type { RxStorage, CompressionMode } from '../../types/index.d.ts';
/**
 * @link https://github.com/WICG/compression/blob/main/explainer.md
 */
export declare function compressBase64(mode: CompressionMode, base64String: string): Promise<string>;
export declare function decompressBase64(mode: CompressionMode, base64String: string): Promise<string>;
/**
 * A RxStorage wrapper that compresses attachment data on writes
 * and decompresses the data on reads.
 *
 * This is using the CompressionStream API,
 * @link https://caniuse.com/?search=compressionstream
 */
export declare function wrappedAttachmentsCompressionStorage<Internals, InstanceCreationOptions>(args: {
    storage: RxStorage<Internals, InstanceCreationOptions>;
}): RxStorage<Internals, InstanceCreationOptions>;
