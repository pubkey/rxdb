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

import { newRxError } from './rx-error';

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
export function isInstanceOf(obj) {
  return obj instanceof PouchDBCore;
}
export var PouchDB = PouchDBCore;
//# sourceMappingURL=pouch-db.js.map