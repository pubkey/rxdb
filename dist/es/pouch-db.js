/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDBCore from 'pouchdb-core'; // pouchdb-find

import PouchDBFind from 'pouchdb-find';
PouchDBCore.plugin(PouchDBFind);
/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/

import { newRxError, newRxTypeError } from './rx-error';

/**
 * get the number of all undeleted documents
 */
export function countAllUndeleted(pouchdb) {
  return pouchdb.allDocs({
    include_docs: false,
    attachments: false
  }).then(function (docs) {
    return docs.rows.filter(function (row) {
      return !row.id.startsWith('_design/');
    }).length;
  });
}
/**
 * get a batch of documents from the pouch-instance
 */

export function getBatch(pouchdb, limit) {
  if (limit <= 1) {
    throw newRxError('P1', {
      limit: limit
    });
  }

  return pouchdb.allDocs({
    include_docs: true,
    attachments: false,
    limit: limit
  }).then(function (docs) {
    return docs.rows.map(function (row) {
      return row.doc;
    }).filter(function (doc) {
      return !doc._id.startsWith('_design');
    });
  });
}
/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */

export function isLevelDown(adapter) {
  if (!adapter || typeof adapter.super_ !== 'function') {
    throw newRxError('UT4', {
      adapter: adapter
    });
  }
}
/**
 * validates that a given string is ok to be used with couchdb-collection-names
 * @link https://wiki.apache.org/couchdb/HTTP_database_API
 * @throws  {Error}
 */

export function validateCouchDBString(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw newRxTypeError('UT1', {
      name: name
    });
  } // do not check, if foldername is given


  if (name.includes('/') || // unix
  name.includes('\\') // windows
  ) return true;
  var regStr = '^[a-z][_$a-z0-9]*$';
  var reg = new RegExp(regStr);

  if (!name.match(reg)) {
    throw newRxError('UT2', {
      regex: regStr,
      givenName: name
    });
  }

  return true;
}
/**
 * get the correct function-name for pouchdb-replication
 */

export function pouchReplicationFunction(pouch, _ref) {
  var _ref$pull = _ref.pull,
      pull = _ref$pull === void 0 ? true : _ref$pull,
      _ref$push = _ref.push,
      push = _ref$push === void 0 ? true : _ref$push;
  if (pull && push) return pouch.sync.bind(pouch);
  if (!pull && push) return pouch.replicate.to.bind(pouch);
  if (pull && !push) return pouch.replicate.from.bind(pouch);

  if (!pull && !push) {
    throw newRxError('UT3', {
      pull: pull,
      push: push
    });
  }
}
export function isInstanceOf(obj) {
  return obj instanceof PouchDBCore;
}
export var PouchDB = PouchDBCore;
//# sourceMappingURL=pouch-db.js.map