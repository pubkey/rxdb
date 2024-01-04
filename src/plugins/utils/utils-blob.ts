import { arrayBufferToBase64 } from './utils-base64.ts';

/**
 * Since RxDB 13.0.0 we only use Blob instead of falling back to Buffer,
 * because Node.js >18 supports Blobs anyway.
 */
/**
 * depending if we are on node or browser,
 * we have to use Buffer(node) or Blob(browser)
 */
export function createBlob(
    data: string,
    type: string
): Blob {
    const blob = new Blob([data], {
        type
    });
    return blob;
}

export async function createBlobFromBase64(
    base64String: string,
    type: string
): Promise<Blob> {
    const base64Response = await fetch(`data:${type};base64,${base64String}`);
    const blob = await base64Response.blob();
    return blob;
}

export function blobToString(blob: Blob | string): Promise<string> {
    /**
     * in the electron-renderer we have a typed array instead of a blob
     * so we have to transform it.
     * @link https://github.com/pubkey/rxdb/issues/1371
     */
    const blobType = Object.prototype.toString.call(blob);
    if (blobType === '[object Uint8Array]') {
        blob = new Blob([blob]);
    }
    if (typeof blob === 'string') {
        return Promise.resolve(blob);
    }

    return blob.text();
}

export async function blobToBase64String(blob: Blob | string): Promise<string> {
    if (typeof blob === 'string') {
        return blob;
    }

    /**
     * in the electron-renderer we have a typed array instead of a blob
     * so we have to transform it.
     * @link https://github.com/pubkey/rxdb/issues/1371
     */
    const blobType = Object.prototype.toString.call(blob);
    if (blobType === '[object Uint8Array]') {
        blob = new Blob([blob]);
    }

    const arrayBuffer = await blob.arrayBuffer();
    return arrayBufferToBase64(arrayBuffer);
}

export function getBlobSize(blob: Blob): number {
    return blob.size;
}
