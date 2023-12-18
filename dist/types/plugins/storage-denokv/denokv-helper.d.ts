export declare const RX_STORAGE_NAME_DENOKV = "denokv";
export declare function getDenoKVIndexName(index: string[]): string;
/**
 * Used for non-index rows that contain the document data,
 * not just a documentId
 */
export declare const DENOKV_DOCUMENT_ROOT_PATH = "||";
export declare const CLEANUP_INDEX: string[];
/**
 * Get the global Deno variable from globalThis.Deno
 * so that compiling with plain typescript does not fail.
 * TODO download the deno typings from somewhere
 * and use them.
 */
export declare function getDenoGlobal(): any;
