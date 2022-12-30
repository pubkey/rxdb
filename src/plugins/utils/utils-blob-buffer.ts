import type {
    BlobBuffer
} from '../../types';
import { arrayBufferToBase64 } from './utils-base64';

/**
 * This is an abstraction over the Blob/Buffer data structure.
 * We need this because it behaves different in different JavaScript runtimes.
 * Since RxDB 13.0.0 we switch to Blob-only because Node.js does not support
 * the Blob data structure which is also supported by the browsers.
 */
export const blobBufferUtil = {
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     */
    createBlobBuffer(
        data: string,
        type: string
    ): BlobBuffer {
        const blobBuffer = new Blob([data], {
            type
        });
        return blobBuffer;
    },
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     */
    async createBlobBufferFromBase64(
        base64String: string,
        type: string
    ): Promise<BlobBuffer> {
        const base64Response = await fetch(`data:${type};base64,${base64String}`);
        const blob = await base64Response.blob();
        return blob;

    },
    isBlobBuffer(data: any): boolean {
        if (data instanceof Blob || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))) {
            return true;
        } else {
            return false;
        }
    },
    toString(blobBuffer: BlobBuffer | string): Promise<string> {
        /**
         * in the electron-renderer we have a typed array insteaf of a blob
         * so we have to transform it.
         * @link https://github.com/pubkey/rxdb/issues/1371
         */
        const blobBufferType = Object.prototype.toString.call(blobBuffer);
        if (blobBufferType === '[object Uint8Array]') {
            blobBuffer = new Blob([blobBuffer]);
        }
        if (typeof blobBuffer === 'string') {
            return Promise.resolve(blobBuffer);
        }

        return (blobBuffer as Blob).text();
    },
    async toBase64String(blobBuffer: BlobBuffer | string): Promise<string> {
        if (typeof blobBuffer === 'string') {
            return blobBuffer;
        }

        /**
         * in the electron-renderer we have a typed array insteaf of a blob
         * so we have to transform it.
         * @link https://github.com/pubkey/rxdb/issues/1371
         */
        const blobBufferType = Object.prototype.toString.call(blobBuffer);
        if (blobBufferType === '[object Uint8Array]') {
            blobBuffer = new Blob([blobBuffer]);
        }

        const arrayBuffer = await fetch(URL.createObjectURL(blobBuffer as Blob)).then(res => res.arrayBuffer());
        return arrayBufferToBase64(arrayBuffer);
    },
    size(blobBuffer: BlobBuffer): number {
        return (blobBuffer as Blob).size;
    }
};
