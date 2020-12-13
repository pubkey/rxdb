/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDBCore from 'pouchdb-core'; // pouchdb-find

import PouchDBFind from 'pouchdb-find';
import { binaryMd5 } from 'pouchdb-md5';
PouchDBCore.plugin(PouchDBFind);
/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/

import { newRxError, newRxTypeError } from './rx-error';
import { isFolderPath } from './util';
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
var validCouchDBStringRegexStr = '^[a-z][_$a-z0-9]*$';
var validCouchDBStringRegex = new RegExp(validCouchDBStringRegexStr);
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


  if (isFolderPath(name)) {
    return true;
  }

  if (!name.match(validCouchDBStringRegex)) {
    throw newRxError('UT2', {
      regex: validCouchDBStringRegexStr,
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
/**
 * create the same diggest as an attachment with that data
 * would have
 */

export function pouchAttachmentBinaryHash(data) {
  return new Promise(function (res) {
    binaryMd5(data, function (d) {
      res('md5-' + d);
    });
  });
}
export function isInstanceOf(obj) {
  return obj instanceof PouchDBCore;
}
export var PouchDB = PouchDBCore;
//# sourceMappingURL=pouch-db.js.map