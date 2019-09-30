"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.countAllUndeleted = countAllUndeleted;
exports.getBatch = getBatch;
exports.isInstanceOf = isInstanceOf;
exports.PouchDB = void 0;

var _pouchdbCore = _interopRequireDefault(require("pouchdb-core"));

var _pouchdbFind = _interopRequireDefault(require("pouchdb-find"));

var _rxError = require("./rx-error");

/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
// pouchdb-find
_pouchdbCore["default"].plugin(_pouchdbFind["default"]);
/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/


/**
 * get the number of all undeleted documents
 */
function countAllUndeleted(pouchdb) {
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


function getBatch(pouchdb, limit) {
  if (limit <= 1) {
    throw (0, _rxError.newRxError)('P1', {
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

function isInstanceOf(obj) {
  return obj instanceof _pouchdbCore["default"];
}

var PouchDB = _pouchdbCore["default"];
exports.PouchDB = PouchDB;

//# sourceMappingURL=pouch-db.js.map