'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.isRxSchema = exports.isRxQuery = exports.isRxDocument = exports.isRxCollection = exports.dbCount = exports.isRxDatabase = exports.plugin = exports.checkAdapter = exports.removeDatabase = exports.create = undefined;

var _rxDatabase = require('./rx-database');

var _rxDatabase2 = _interopRequireDefault(_rxDatabase);

var _rxSchema = require('./rx-schema');

var _rxSchema2 = _interopRequireDefault(_rxSchema);

var _rxDocument = require('./rx-document');

var _rxDocument2 = _interopRequireDefault(_rxDocument);

var _rxQuery = require('./rx-query');

var _rxQuery2 = _interopRequireDefault(_rxQuery);

var _rxCollection = require('./rx-collection');

var _rxCollection2 = _interopRequireDefault(_rxCollection);

var _queryChangeDetector = require('./query-change-detector');

var _queryChangeDetector2 = _interopRequireDefault(_queryChangeDetector);

var _plugin = require('./plugin');

var _plugin2 = _interopRequireDefault(_plugin);

var _pouchDb = require('./pouch-db');

var _pouchDb2 = _interopRequireDefault(_pouchDb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */

var create = exports.create = _rxDatabase2['default'].create;
var removeDatabase = exports.removeDatabase = _rxDatabase2['default'].removeDatabase;
var checkAdapter = exports.checkAdapter = _rxDatabase2['default'].checkAdapter;

var plugin = exports.plugin = _plugin2['default'].addPlugin;

var isRxDatabase = exports.isRxDatabase = _rxDatabase2['default'].isInstanceOf;
var dbCount = exports.dbCount = _rxDatabase2['default'].dbCount;
var isRxCollection = exports.isRxCollection = _rxCollection2['default'].isInstanceOf;
var isRxDocument = exports.isRxDocument = _rxDocument2['default'].isInstanceOf;
var isRxQuery = exports.isRxQuery = _rxQuery2['default'].isInstanceOf;
var isRxSchema = exports.isRxSchema = _rxSchema2['default'].isInstanceOf;

exports['default'] = {
    create: create,
    removeDatabase: removeDatabase,
    checkAdapter: checkAdapter,
    plugin: plugin,
    dbCount: dbCount,
    isRxDatabase: isRxDatabase,
    isRxCollection: isRxCollection,
    isRxDocument: isRxDocument,
    isRxQuery: isRxQuery,
    isRxSchema: isRxSchema,
    RxSchema: _rxSchema2['default'],
    PouchDB: _pouchDb2['default'],
    QueryChangeDetector: _queryChangeDetector2['default'],
    RxDatabase: _rxDatabase2['default']
};
