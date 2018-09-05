"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.checkAdapter = exports.RxDatabase = exports.QueryChangeDetector = exports.PouchDB = exports.RxSchema = exports.isRxSchema = exports.isRxQuery = exports.isRxDocument = exports.isRxCollection = exports.isRxDatabase = exports.dbCount = exports.plugin = exports.removeDatabase = exports.create = void 0;

var _core = _interopRequireDefault(require("./core"));

var _schemaCheck = _interopRequireDefault(require("./plugins/schema-check"));

var _errorMessages = _interopRequireDefault(require("./plugins/error-messages"));

var _validate = _interopRequireDefault(require("./plugins/validate"));

var _keyCompression = _interopRequireDefault(require("./plugins/key-compression"));

var _leaderElection = _interopRequireDefault(require("./plugins/leader-election"));

var _encryption = _interopRequireDefault(require("./plugins/encryption"));

var _update = _interopRequireDefault(require("./plugins/update"));

var _watchForChanges = _interopRequireDefault(require("./plugins/watch-for-changes"));

var _replication = _interopRequireDefault(require("./plugins/replication"));

var _adapterCheck = _interopRequireDefault(require("./plugins/adapter-check"));

var _jsonDump = _interopRequireDefault(require("./plugins/json-dump"));

var _inMemory = _interopRequireDefault(require("./plugins/in-memory"));

var _attachments = _interopRequireDefault(require("./plugins/attachments"));

var _localDocuments = _interopRequireDefault(require("./plugins/local-documents"));

/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */
// default plugins
_core["default"].plugin(_schemaCheck["default"]);

_core["default"].plugin(_errorMessages["default"]);

_core["default"].plugin(_validate["default"]);

_core["default"].plugin(_keyCompression["default"]);

_core["default"].plugin(_leaderElection["default"]);

_core["default"].plugin(_encryption["default"]);

_core["default"].plugin(_update["default"]);

_core["default"].plugin(_watchForChanges["default"]);

_core["default"].plugin(_replication["default"]);

_core["default"].plugin(_adapterCheck["default"]);

_core["default"].plugin(_jsonDump["default"]);

_core["default"].plugin(_inMemory["default"]);

_core["default"].plugin(_attachments["default"]);

_core["default"].plugin(_localDocuments["default"]);
/**
 * create a database
 * @param  {string} prefix as databaseName for the storage (this can be the foldername)
 * @param  {Object} storageEngine any leveldown instance
 * @param  {String} password if the database contains encrypted fields
 * @param  {boolean} multiInstance if true, multiInstance-handling will be done
 * @return {Promise<Database>}
 */


var create = _core["default"].create;
/**
 * removes the database and all its known data
 * @param  {string} databaseName
 * @param  {Object} adapter
 * @return {Promise}
 */

exports.create = create;
var removeDatabase = _core["default"].removeDatabase;
/**
 * add a plugin for rxdb or pouchdb
 */

exports.removeDatabase = removeDatabase;
var plugin = _core["default"].plugin;
exports.plugin = plugin;
var dbCount = _core["default"].dbCount;
exports.dbCount = dbCount;
var isRxDatabase = _core["default"].isRxDatabase;
exports.isRxDatabase = isRxDatabase;
var isRxCollection = _core["default"].isRxCollection;
exports.isRxCollection = isRxCollection;
var isRxDocument = _core["default"].isRxDocument;
exports.isRxDocument = isRxDocument;
var isRxQuery = _core["default"].isRxQuery;
exports.isRxQuery = isRxQuery;
var isRxSchema = _core["default"].isRxSchema;
exports.isRxSchema = isRxSchema;
var RxSchema = _core["default"].RxSchema;
exports.RxSchema = RxSchema;
var PouchDB = _core["default"].PouchDB;
exports.PouchDB = PouchDB;
var QueryChangeDetector = _core["default"].QueryChangeDetector;
exports.QueryChangeDetector = QueryChangeDetector;
var RxDatabase = _core["default"].RxDatabase;
exports.RxDatabase = RxDatabase;
var checkAdapter = _core["default"].checkAdapter;
exports.checkAdapter = checkAdapter;
var _default = {
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
exports["default"] = _default;
