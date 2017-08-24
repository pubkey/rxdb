'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _pouchdbCore = require('pouchdb-core');

var _pouchdbCore2 = _interopRequireDefault(_pouchdbCore);

var _pouchdbFind = require('pouchdb-find');

var _pouchdbFind2 = _interopRequireDefault(_pouchdbFind);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
_pouchdbCore2['default'].plugin(_pouchdbFind2['default']);

/**
 * get the number of all undeleted documents
 * @param  {PouchDB}  pouchdb instance
 * @return {Promise(number)} number of documents
 */


// pouchdb-find
_pouchdbCore2['default'].countAllUndeleted = function () {
    var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee(pouchdb) {
        var docs;
        return _regenerator2['default'].wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return pouchdb.allDocs({
                            include_docs: false,
                            attachments: false
                        });

                    case 2:
                        docs = _context.sent;
                        return _context.abrupt('return', docs.rows.filter(function (row) {
                            return !row.id.startsWith('_design/');
                        }).length);

                    case 4:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function (_x) {
        return _ref.apply(this, arguments);
    };
}();

/**
 * get a batch of documents from the pouch-instance
 * @param  {PouchDB}  pouchdb instance
 * @param  {number}  limit
 * @return {{}[]} array with documents
 */
_pouchdbCore2['default'].getBatch = function () {
    var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2(pouchdb, limit) {
        var docs;
        return _regenerator2['default'].wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        if (!(limit <= 1)) {
                            _context2.next = 2;
                            break;
                        }

                        throw new Error('PouchDB.getBatch: limit must be > 2');

                    case 2:
                        _context2.next = 4;
                        return pouchdb.allDocs({
                            include_docs: true,
                            attachments: false,
                            limit: limit
                        });

                    case 4:
                        docs = _context2.sent;
                        return _context2.abrupt('return', docs.rows.map(function (row) {
                            return row.doc;
                        }).filter(function (doc) {
                            return !doc._id.startsWith('_design');
                        }));

                    case 6:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function (_x2, _x3) {
        return _ref2.apply(this, arguments);
    };
}();

exports['default'] = _pouchdbCore2['default'];
