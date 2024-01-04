export const RX_STORAGE_NAME_DENOKV = 'denokv';

export function getDenoKVIndexName(index: string[]): string {
    return index.join('|');
}

/**
 * Used for non-index rows that contain the document data,
 * not just a documentId
 */
export const DENOKV_DOCUMENT_ROOT_PATH = '||';

export const CLEANUP_INDEX: string[] = ['_deleted', '_meta.lwt'];


/**
 * Get the global Deno variable from globalThis.Deno
 * so that compiling with plain typescript does not fail.
 * TODO download the deno typings from somewhere
 * and use them.
 */
export function getDenoGlobal(): any {
    return (globalThis as any).Deno;
}
