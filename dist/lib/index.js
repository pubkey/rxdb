'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkAdapter = exports.RxDatabase = exports.QueryChangeDetector = exports.PouchDB = exports.RxSchema = exports.isRxSchema = exports.isRxQuery = exports.isRxDocument = exports.isRxCollection = exports.isRxDatabase = exports.dbCount = exports.plugin = exports.removeDatabase = exports.create = undefined;

var _core = require('./core');

var _core2 = _interopRequireDefault(_core);

var _schemaCheck = require('./plugins/schema-check');

var _schemaCheck2 = _interopRequireDefault(_schemaCheck);

var _errorMessages = require('./plugins/error-messages');

var _errorMessages2 = _interopRequireDefault(_errorMessages);

var _validate = require('./plugins/validate');

var _validate2 = _interopRequireDefault(_validate);

var _keyCompression = require('./plugins/key-compression');

var _keyCompression2 = _interopRequireDefault(_keyCompression);

var _leaderElection = require('./plugins/leader-election');

var _leaderElection2 = _interopRequireDefault(_leaderElection);

var _encryption = require('./plugins/encryption');

var _encryption2 = _interopRequireDefault(_encryption);

var _update = require('./plugins/update');

var _update2 = _interopRequireDefault(_update);

var _replication = require('./plugins/replication');

var _replication2 = _interopRequireDefault(_replication);

var _adapterCheck = require('./plugins/adapter-check');

var _adapterCheck2 = _interopRequireDefault(_adapterCheck);

var _jsonDump = require('./plugins/json-dump');

var _jsonDump2 = _interopRequireDefault(_jsonDump);

var _inMemory = require('./plugins/in-memory');

var _inMemory2 = _interopRequireDefault(_inMemory);

var _attachments = require('./plugins/attachments');

var _attachments2 = _interopRequireDefault(_attachments);

var _localDocuments = require('./plugins/local-documents');

var _localDocuments2 = _interopRequireDefault(_localDocuments);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */

_core2['default'].plugin(_schemaCheck2['default']);

// default plugins

_core2['default'].plugin(_errorMessages2['default']);

_core2['default'].plugin(_validate2['default']);

_core2['default'].plugin(_keyCompression2['default']);

_core2['default'].plugin(_leaderElection2['default']);

_core2['default'].plugin(_encryption2['default']);

_core2['default'].plugin(_update2['default']);

_core2['default'].plugin(_replication2['default']);

_core2['default'].plugin(_adapterCheck2['default']);

_core2['default'].plugin(_jsonDump2['default']);

_core2['default'].plugin(_inMemory2['default']);

_core2['default'].plugin(_attachments2['default']);

_core2['default'].plugin(_localDocuments2['default']);

/**
 * create a database
 * @param  {string} prefix as databaseName for the storage (this can be the foldername)
 * @param  {Object} storageEngine any leveldown instance
 * @param  {String} password if the database contains encrypted fields
 * @param  {boolean} multiInstance if true, multiInstance-handling will be done
 * @return {Promise<Database>}
 */
var create = exports.create = _core2['default'].create;

/**
 * removes the database and all its known data
 * @param  {string} databaseName
 * @param  {Object} adapter
 * @return {Promise}
 */
var removeDatabase = exports.removeDatabase = _core2['default'].removeDatabase;

/**
 * add a plugin for rxdb or pouchdb
 */
var plugin = exports.plugin = _core2['default'].plugin;
var dbCount = exports.dbCount = _core2['default'].dbCount;
var isRxDatabase = exports.isRxDatabase = _core2['default'].isRxDatabase;
var isRxCollection = exports.isRxCollection = _core2['default'].isRxCollection;
var isRxDocument = exports.isRxDocument = _core2['default'].isRxDocument;
var isRxQuery = exports.isRxQuery = _core2['default'].isRxQuery;
var isRxSchema = exports.isRxSchema = _core2['default'].isRxSchema;
var RxSchema = exports.RxSchema = _core2['default'].RxSchema;
var PouchDB = exports.PouchDB = _core2['default'].PouchDB;
var QueryChangeDetector = exports.QueryChangeDetector = _core2['default'].QueryChangeDetector;
var RxDatabase = exports.RxDatabase = _core2['default'].RxDatabase;
var checkAdapter = exports.checkAdapter = _core2['default'].checkAdapter;

exports['default'] = {
  create: create,
  checkAdapter: checkAdapter,
  removeDatabase: removeDatabase,
  plugin: plugin,
  dbCount: dbCount,
  isRxDatabase: isRxDatabase,
  isRxCollection: isRxCollection,
  isRxDocument: isRxDocument,
  isRxQuery: isRxQuery,
  isRxSchema: isRxSchema,
  RxSchema: RxSchema,
  PouchDB: PouchDB,
  QueryChangeDetector: QueryChangeDetector,
  RxDatabase: RxDatabase
};
