"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FOUNDATION_DB_WRITE_BATCH_SIZE = exports.CLEANUP_INDEX = void 0;
exports.getFoundationDBIndexName = getFoundationDBIndexName;
function getFoundationDBIndexName(index) {
  return index.join('|');
}
var CLEANUP_INDEX = ['_deleted', '_meta.lwt'];
exports.CLEANUP_INDEX = CLEANUP_INDEX;
var FOUNDATION_DB_WRITE_BATCH_SIZE = 2000;
exports.FOUNDATION_DB_WRITE_BATCH_SIZE = FOUNDATION_DB_WRITE_BATCH_SIZE;
//# sourceMappingURL=foundationdb-helpers.js.map