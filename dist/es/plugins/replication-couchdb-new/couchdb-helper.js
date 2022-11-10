import { pouchSwapIdToPrimary } from '../pouchdb';
export var COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-couchdb-';
export function mergeUrlQueryParams(params) {
  return Object.entries(params).filter(function (_ref) {
    var _k = _ref[0],
      value = _ref[1];
    return typeof value !== 'undefined';
  }).map(function (_ref2) {
    var key = _ref2[0],
      value = _ref2[1];
    return key + '=' + value;
  }).join('&');
}
export function couchDBDocToRxDocData(primaryPath, couchDocData) {
  var doc = pouchSwapIdToPrimary(primaryPath, couchDocData);

  // ensure deleted flag is set.
  doc._deleted = !!doc._deleted;
  return doc;
}
//# sourceMappingURL=couchdb-helper.js.map