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
 * TODO download the deno typings from somewhere
 * and use them.
 */
export function getDenoGlobal() {
  return globalThis.Deno;
}
//# sourceMappingURL=denokv-helper.js.map