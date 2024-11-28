export var RX_STORAGE_NAME_DENOKV = 'denokv';
export function getDenoKVIndexName(index) {
  return index.join('|');
}

/**
 * Used for non-index rows that contain the document data,
 * not just a documentId
 */
export var DENOKV_DOCUMENT_ROOT_PATH = '||';
export var CLEANUP_INDEX = ['_deleted', '_meta.lwt'];

/**
 * Get the global Deno variable from globalThis.Deno
 * so that compiling with plain typescript does not fail.
 * Deno has no way to just "download" the deno typings,
 * so we have to use the "any" type here.
 */
export function getDenoGlobal() {
  return globalThis.Deno;
}
//# sourceMappingURL=denokv-helper.js.map