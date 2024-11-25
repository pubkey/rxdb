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
 * Deno has no way to just "download" the deno typings,
 * so we have to use the "any" type here.
 */
export declare function getDenoGlobal(): any;
