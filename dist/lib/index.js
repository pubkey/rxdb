'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxDatabase = exports.QueryChangeDetector = exports.PouchDB = exports.RxSchema = exports.removeDatabase = exports.create = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

/**
 * create a database
 * @param  {string} prefix as databaseName for the storage (this can be the foldername)
 * @param  {Object} storageEngine any leveldown instance
 * @param  {String} password if the database contains encrypted fields
 * @param  {boolean} multiInstance if true, multiInstance-handling will be done
 * @return {Promise<Database>}
 */
var create = exports.create = function () {
    var _ref = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee(args) {
        return _regenerator2['default'].wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        return _context.abrupt('return', RxDatabase.create(args));

                    case 1:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function create(_x) {
        return _ref.apply(this, arguments);
    };
}();

/**
 * removes the database and all its known data
 * @param  {string} databaseName
 * @param  {Object} adapter
 * @return {Promise}
 */


var removeDatabase = exports.removeDatabase = function () {
    var _ref2 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee2(databaseName, adapter) {
        return _regenerator2['default'].wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        return _context2.abrupt('return', RxDatabase.removeDatabase(databaseName, adapter));

                    case 1:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function removeDatabase(_x2, _x3) {
        return _ref2.apply(this, arguments);
    };
}();

exports.plugin = plugin;
exports.isRxDatabase = isRxDatabase;
exports.isRxCollection = isRxCollection;
exports.isRxDocument = isRxDocument;
exports.isRxQuery = isRxQuery;
exports.isRxSchema = isRxSchema;

var _RxDatabase = require('./RxDatabase');

var RxDatabase = _interopRequireWildcard(_RxDatabase);

var _RxSchema = require('./RxSchema');

var RxSchema = _interopRequireWildcard(_RxSchema);

var _RxDocument = require('./RxDocument');

var RxDocument = _interopRequireWildcard(_RxDocument);

var _RxQuery = require('./RxQuery');

var RxQuery = _interopRequireWildcard(_RxQuery);

var _RxCollection = require('./RxCollection');

var RxCollection = _interopRequireWildcard(_RxCollection);

var _QueryChangeDetector = require('./QueryChangeDetector');

var QueryChangeDetector = _interopRequireWildcard(_QueryChangeDetector);

var _PouchDB = require('./PouchDB');

var _PouchDB2 = _interopRequireDefault(_PouchDB);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function plugin(mod) {
    if ((typeof mod === 'undefined' ? 'undefined' : (0, _typeof3['default'])(mod)) === 'object' && mod['default']) mod = mod['default'];
    _PouchDB2['default'].plugin(mod);
}

function isRxDatabase(obj) {
    return RxDatabase.isInstanceOf(obj);
}
function isRxCollection(obj) {
    return RxCollection.isInstanceOf(obj);
}
function isRxDocument(obj) {
    return RxDocument.isInstanceOf(obj);
}
function isRxQuery(obj) {
    return RxQuery.isInstanceOf(obj);
}
function isRxSchema(obj) {
    return RxSchema.isInstanceOf(obj);
}

exports.RxSchema = RxSchema;
exports.PouchDB = _PouchDB2['default'];
exports.QueryChangeDetector = QueryChangeDetector;
exports.RxDatabase = RxDatabase;
