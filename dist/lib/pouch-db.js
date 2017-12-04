'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _pouchdbCore = require('pouchdb-core');

var _pouchdbCore2 = _interopRequireDefault(_pouchdbCore);

var _pouchdbFind = require('pouchdb-find');

var _pouchdbFind2 = _interopRequireDefault(_pouchdbFind);

var _rxError = require('./rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
_pouchdbCore2['default'].plugin(_pouchdbFind2['default']);

// pouchdb-find


/**
 * get the number of all undeleted documents
 * @param  {PouchDB}  pouchdb instance
 * @return {Promise<number>} number of documents
 */
_pouchdbCore2['default'].countAllUndeleted = function (pouchdb) {
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
_pouchdbCore2['default'].getBatch = function (pouchdb, limit) {
    if (limit <= 1) {
        throw _rxError2['default'].newRxError('P1', {
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

exports['default'] = _pouchdbCore2['default'];
