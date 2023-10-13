"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FOUNDATION_DB_WRITE_BATCH_SIZE = exports.CLEANUP_INDEX = void 0;
exports.getFoundationDBIndexName = getFoundationDBIndexName;
function getFoundationDBIndexName(index) {
  return index.join('|');
}
var CLEANUP_INDEX = exports.CLEANUP_INDEX = ['_deleted', '_meta.lwt'];
var FOUNDATION_DB_WRITE_BATCH_SIZE = exports.FOUNDATION_DB_WRITE_BATCH_SIZE = 2000;
//# sourceMappingURL=foundationdb-helpers.js.map