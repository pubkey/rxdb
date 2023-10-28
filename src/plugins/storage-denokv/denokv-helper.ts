import { RxStorageDefaultStatics } from "../../rx-storage-statics.ts";

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

export const CLEANUP_INDEX: string[] = ['_deleted', '_meta.lwt'];
