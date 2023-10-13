import { b64EncodeUnicode, flatClone } from "../../plugins/utils/index.js";
export var COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'couchdb';
export function mergeUrlQueryParams(params) {
  return Object.entries(params).filter(([_k, value]) => typeof value !== 'undefined').map(([key, value]) => key + '=' + value).join('&');
}
export function couchDBDocToRxDocData(primaryPath, couchDocData) {
  var doc = couchSwapIdToPrimary(primaryPath, couchDocData);

  // ensure deleted flag is set.
  doc._deleted = !!doc._deleted;
  delete doc._rev;
  return doc;
}
export function couchSwapIdToPrimary(primaryKey, docData) {
  if (primaryKey === '_id' || docData[primaryKey]) {
    return flatClone(docData);
  }
  docData = flatClone(docData);
  docData[primaryKey] = docData._id;
  delete docData._id;
  return docData;
}

/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */
export function couchSwapPrimaryToId(primaryKey, docData) {
  // optimisation shortcut
  if (primaryKey === '_id') {
    return docData;
  }
  var idValue = docData[primaryKey];
  var ret = flatClone(docData);
  delete ret[primaryKey];
  ret._id = idValue;
  return ret;
}
export function getDefaultFetch() {
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
export function getFetchWithCouchDBAuthorization(username, password) {
  var ret = (url, options) => {
    options = Object.assign({}, options);
    if (!options.headers) {
      options.headers = {};
    }
    options.headers['Authorization'] = 'Basic ' + b64EncodeUnicode(username + ':' + password);
    return fetch(url, options);
  };
  return ret;
}
//# sourceMappingURL=couchdb-helper.js.map