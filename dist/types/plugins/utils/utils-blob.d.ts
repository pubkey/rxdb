/**
 * Since RxDB 13.0.0 we only use Blob instead of falling back to Buffer,
 * because Node.js >18 supports Blobs anyway.
 */
/**
 * depending if we are on node or browser,
 * we have to use Buffer(node) or Blob(browser)
 */
export declare function createBlob(data: string, type: string): Blob;
export declare function createBlobFromBase64(base64String: string, type: string): Promise<Blob>;
export declare function blobToString(blob: Blob | string): Promise<string>;
export declare function blobToBase64String(blob: Blob | string): Promise<string>;
export declare function getBlobSize(blob: Blob): number;
