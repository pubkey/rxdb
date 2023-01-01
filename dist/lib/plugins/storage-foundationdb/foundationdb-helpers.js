"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CLEANUP_INDEX = void 0;
exports.getFoundationDBIndexName = getFoundationDBIndexName;
function getFoundationDBIndexName(index) {
  return index.join('|');
}
var CLEANUP_INDEX = ['_deleted', '_meta.lwt'];
exports.CLEANUP_INDEX = CLEANUP_INDEX;
//# sourceMappingURL=foundationdb-helpers.js.map