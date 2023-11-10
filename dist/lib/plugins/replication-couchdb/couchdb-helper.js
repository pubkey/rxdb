"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = void 0;
exports.couchDBDocToRxDocData = couchDBDocToRxDocData;
exports.couchSwapIdToPrimary = couchSwapIdToPrimary;
exports.couchSwapPrimaryToId = couchSwapPrimaryToId;
exports.getDefaultFetch = getDefaultFetch;
exports.getFetchWithCouchDBAuthorization = getFetchWithCouchDBAuthorization;
exports.mergeUrlQueryParams = mergeUrlQueryParams;
var _utils = require("../../plugins/utils");
var COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = exports.COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'couchdb';
function mergeUrlQueryParams(params) {
  return Object.entries(params).filter(([_k, value]) => typeof value !== 'undefined').map(([key, value]) => key + '=' + value).join('&');
}
function couchDBDocToRxDocData(primaryPath, couchDocData) {
  var doc = couchSwapIdToPrimary(primaryPath, couchDocData);

  // ensure deleted flag is set.
  doc._deleted = !!doc._deleted;
  delete doc._rev;
  return doc;
}
function couchSwapIdToPrimary(primaryKey, docData) {
  if (primaryKey === '_id' || docData[primaryKey]) {
    return (0, _utils.flatClone)(docData);
  }
  docData = (0, _utils.flatClone)(docData);
  docData[primaryKey] = docData._id;
  delete docData._id;
  return docData;
}

/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */
function couchSwapPrimaryToId(primaryKey, docData) {
  // optimisation shortcut
  if (primaryKey === '_id') {
    return docData;
  }
  var idValue = docData[primaryKey];
  var ret = (0, _utils.flatClone)(docData);
  delete ret[primaryKey];
  ret._id = idValue;
  return ret;
}
function getDefaultFetch() {
  if (typeof window === 'object' && window['fetch']) {
    /**
     * @link https://stackoverflow.com/a/47180009/3443137
     */
    return window.fetch.bind(window);
  } else {
    return fetch;
  }
}

/**
 * Returns a fetch handler that contains the username and password
 * in the Authorization header
 */
function getFetchWithCouchDBAuthorization(username, password) {
  var ret = (url, options) => {
    options = Object.assign({}, options);
    if (!options.headers) {
      options.headers = {};
    }
    options.headers['Authorization'] = 'Basic ' + (0, _utils.b64EncodeUnicode)(username + ':' + password);
    return fetch(url, options);
  };
  return ret;
}
//# sourceMappingURL=couchdb-helper.js.map