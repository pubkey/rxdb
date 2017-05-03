'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _pouchdbCore = require('pouchdb-core');

var _pouchdbCore2 = _interopRequireDefault(_pouchdbCore);

var _pouchdbFind = require('pouchdb-find');

var PouchDBFind = _interopRequireWildcard(_pouchdbFind);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * this handles the pouchdb-instance
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * to easy add modules and manipulate things
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Adapters can be found here:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


// pouchdb-find


_pouchdbCore2.default.plugin(PouchDBFind);

/**
 * get the number of all undeleted documents
 * @param  {PouchDB}  pouchdb instance
 * @return {Promise(number)} number of documents
 */
_pouchdbCore2.default.countAllUndeleted = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(pouchdb) {
        var docs;
        return regeneratorRuntime.wrap(function _callee$(_context) {
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
_pouchdbCore2.default.getBatch = function () {
    var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(pouchdb, limit) {
        var docs;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
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

exports.default = _pouchdbCore2.default;
