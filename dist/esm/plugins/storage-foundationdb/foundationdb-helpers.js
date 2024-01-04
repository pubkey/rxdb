export function getFoundationDBIndexName(index) {
  return index.join('|');
}
export var CLEANUP_INDEX = ['_deleted', '_meta.lwt'];
export var FOUNDATION_DB_WRITE_BATCH_SIZE = 2000;
//# sourceMappingURL=foundationdb-helpers.js.map