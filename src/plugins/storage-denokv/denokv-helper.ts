import { RxStorageDefaultStatics } from "../../rx-storage-statics.ts";
import type { RxDocumentData } from '../../types/rx-storage';

export const RX_STORAGE_NAME_DENOKV = 'denokv';
export const RxStorageDenoKVStatics = RxStorageDefaultStatics;

export function getDenoKVIndexName(index: string[]): string {
    return index.join('|');
}

/**
 * Used for non-index rows that contain the document data,
 * not just a documentId
 */
export const DENOKV_DOCUMENT_ROOT_PATH = '||';

export const DENOKV_VERSION_META_FLAG = 'denokv';
export const CLEANUP_INDEX: string[] = ['_deleted', '_meta.lwt'];



export function denoKvRowToDocument<RxDocType>(row: any): RxDocumentData<RxDocType> {
    const docData = row.value;
    docData._meta[DENOKV_VERSION_META_FLAG] = row.versionstamp;
    return docData;
}

/**
 * Get the global Deno variable from globalThis.Deno
 * so that compiling with plain typescript does not fail.
 * TODO download the deno typings from somewhere
 * and use them.
 */
export function getDenoGlobal(): any {
    return (globalThis as any).Deno;
}
