"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageDenoKVStatics = exports.RX_STORAGE_NAME_DENOKV = exports.DENOKV_DOCUMENT_ROOT_PATH = exports.CLEANUP_INDEX = void 0;
exports.getDenoGlobal = getDenoGlobal;
exports.getDenoKVIndexName = getDenoKVIndexName;
var _rxStorageStatics = require("../../rx-storage-statics.js");
var RX_STORAGE_NAME_DENOKV = exports.RX_STORAGE_NAME_DENOKV = 'denokv';
var RxStorageDenoKVStatics = exports.RxStorageDenoKVStatics = _rxStorageStatics.RxStorageDefaultStatics;
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
 * TODO download the deno typings from somewhere
 * and use them.
 */
function getDenoGlobal() {
  return globalThis.Deno;
}
//# sourceMappingURL=denokv-helper.js.map