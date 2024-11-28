"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_STORAGE_NAME_DENOKV = exports.DENOKV_DOCUMENT_ROOT_PATH = exports.CLEANUP_INDEX = void 0;
exports.getDenoGlobal = getDenoGlobal;
exports.getDenoKVIndexName = getDenoKVIndexName;
var RX_STORAGE_NAME_DENOKV = exports.RX_STORAGE_NAME_DENOKV = 'denokv';
function getDenoKVIndexName(index) {
  return index.join('|');
}

/**
 * Used for non-index rows that contain the document data,
 * not just a documentId
 */
var DENOKV_DOCUMENT_ROOT_PATH = exports.DENOKV_DOCUMENT_ROOT_PATH = '||';
var CLEANUP_INDEX = exports.CLEANUP_INDEX = ['_deleted', '_meta.lwt'];

/**
 * Get the global Deno variable from globalThis.Deno
 * so that compiling with plain typescript does not fail.
 * Deno has no way to just "download" the deno typings,
 * so we have to use the "any" type here.
 */
function getDenoGlobal() {
  return globalThis.Deno;
}
//# sourceMappingURL=denokv-helper.js.map