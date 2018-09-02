"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _pouchdbCore = _interopRequireDefault(require("pouchdb-core"));

var _pouchdbFind = _interopRequireDefault(require("pouchdb-find"));

var _rxError = _interopRequireDefault(require("./rx-error"));

/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */

/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/
// pouchdb-find
_pouchdbCore["default"].plugin(_pouchdbFind["default"]);

/**
 * get the number of all undeleted documents
 * @param  {PouchDB}  pouchdb instance
 * @return {Promise<number>} number of documents
 */
_pouchdbCore["default"].countAllUndeleted = function (pouchdb) {
  return pouchdb.allDocs({
    include_docs: false,
    attachments: false
  }).then(function (docs) {
    return docs.rows.filter(function (row) {
      return !row.id.startsWith('_design/');
    }).length;
  });
};
/**
 * get a batch of documents from the pouch-instance
 * @param  {PouchDB}  pouchdb instance
 * @param  {number}  limit
 * @return {Promise<{}[]>} array with documents
 */


_pouchdbCore["default"].getBatch = function (pouchdb, limit) {
  if (limit <= 1) {
    throw _rxError["default"].newRxError('P1', {
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
};

_pouchdbCore["default"].isInstanceOf = function (obj) {
  return obj instanceof _pouchdbCore["default"];
};

var _default = _pouchdbCore["default"];
exports["default"] = _default;
