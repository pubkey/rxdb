import type { BlobBuffer } from '../../types';
/**
 * This is an abstraction over the Blob/Buffer data structure.
 * We need this because it behaves different in different JavaScript runtimes.
 * Since RxDB 13.0.0 we switch to Blob-only because Node.js does not support
 * the Blob data structure which is also supported by the browsers.
 */
export declare const blobBufferUtil: {
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     */
    createBlobBuffer(data: string, type: string): BlobBuffer;
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     */
    createBlobBufferFromBase64(base64String: string, type: string): Promise<BlobBuffer>;
    isBlobBuffer(data: any): boolean;
    toString(blobBuffer: BlobBuffer | string): Promise<string>;
    toBase64String(blobBuffer: BlobBuffer | string): Promise<string>;
    size(blobBuffer: BlobBuffer): number;
};
