"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = void 0;
exports.couchDBDocToRxDocData = couchDBDocToRxDocData;
exports.mergeUrlQueryParams = mergeUrlQueryParams;
var _pouchdb = require("../pouchdb");
var COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-couchdb-';
exports.COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX;
function mergeUrlQueryParams(params) {
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
function couchDBDocToRxDocData(primaryPath, couchDocData) {
  var doc = (0, _pouchdb.pouchSwapIdToPrimary)(primaryPath, couchDocData);

  // ensure deleted flag is set.
  doc._deleted = !!doc._deleted;
  return doc;
}
//# sourceMappingURL=couchdb-helper.js.map