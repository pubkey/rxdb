'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.isRxSchema = exports.isRxQuery = exports.isRxDocument = exports.isRxCollection = exports.isRxDatabase = exports.removeDatabase = exports.create = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.plugin = plugin;

var _RxDatabase = require('./RxDatabase');

var _RxDatabase2 = _interopRequireDefault(_RxDatabase);

var _RxSchema = require('./RxSchema');

var _RxSchema2 = _interopRequireDefault(_RxSchema);

var _RxDocument = require('./RxDocument');

var _RxDocument2 = _interopRequireDefault(_RxDocument);

var _RxQuery = require('./RxQuery');

var _RxQuery2 = _interopRequireDefault(_RxQuery);

var _RxCollection = require('./RxCollection');

var _RxCollection2 = _interopRequireDefault(_RxCollection);

var _QueryChangeDetector = require('./QueryChangeDetector');

var _QueryChangeDetector2 = _interopRequireDefault(_QueryChangeDetector);

var _Plugin = require('./Plugin');

var _Plugin2 = _interopRequireDefault(_Plugin);

var _PouchDB = require('./PouchDB');

var _PouchDB2 = _interopRequireDefault(_PouchDB);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */

var create = exports.create = _RxDatabase2['default'].create;
var removeDatabase = exports.removeDatabase = _RxDatabase2['default'].removeDatabase;

function plugin(mod) {
    if (mod.rxdb) {
        // rxdb-plugin
        _Plugin2['default'].addPlugin(mod);
    } else {
        // pouchdb-plugin
        if ((typeof mod === 'undefined' ? 'undefined' : (0, _typeof3['default'])(mod)) === 'object' && mod['default']) mod = mod['default'];
        _PouchDB2['default'].plugin(mod);
    }
}

var isRxDatabase = exports.isRxDatabase = _RxDatabase2['default'].isInstanceOf;
var isRxCollection = exports.isRxCollection = _RxCollection2['default'].isInstanceOf;
var isRxDocument = exports.isRxDocument = _RxDocument2['default'].isInstanceOf;
var isRxQuery = exports.isRxQuery = _RxQuery2['default'].isInstanceOf;
var isRxSchema = exports.isRxSchema = _RxSchema2['default'].isInstanceOf;

exports['default'] = {
    create: create,
    removeDatabase: removeDatabase,
    plugin: plugin,
    isRxDatabase: isRxDatabase,
    isRxCollection: isRxCollection,
    isRxDocument: isRxDocument,
    isRxQuery: isRxQuery,
    isRxSchema: isRxSchema,
    RxSchema: _RxSchema2['default'],
    PouchDB: _PouchDB2['default'],
    QueryChangeDetector: _QueryChangeDetector2['default'],
    RxDatabase: _RxDatabase2['default']
};
