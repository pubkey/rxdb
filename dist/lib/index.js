'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDatabase = exports.QueryChangeDetector = exports.PouchDB = exports.RxSchema = exports.isRxSchema = exports.isRxQuery = exports.isRxDocument = exports.isRxCollection = exports.isRxDatabase = exports.plugin = exports.removeDatabase = exports.create = undefined;

var _core = require('./core');

var _core2 = _interopRequireDefault(_core);

var _schemaCheck = require('./modules/schema-check');

var _schemaCheck2 = _interopRequireDefault(_schemaCheck);

var _validate = require('./modules/validate');

var _validate2 = _interopRequireDefault(_validate);

var _keyCompression = require('./modules/key-compression');

var _keyCompression2 = _interopRequireDefault(_keyCompression);

var _leaderElection = require('./modules/leader-election');

var _leaderElection2 = _interopRequireDefault(_leaderElection);

var _encryption = require('./modules/encryption');

var _encryption2 = _interopRequireDefault(_encryption);

var _update = require('./modules/update');

var _update2 = _interopRequireDefault(_update);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this is the default rxdb-export
 * It has a batteries-included garantie.
 * It basically just rxdb-core with some default plugins
 */

_core2['default'].plugin(_schemaCheck2['default']);

// default plugins

_core2['default'].plugin(_validate2['default']);

_core2['default'].plugin(_keyCompression2['default']);

_core2['default'].plugin(_leaderElection2['default']);

_core2['default'].plugin(_encryption2['default']);

_core2['default'].plugin(_update2['default']);

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

var isRxDatabase = exports.isRxDatabase = _core2['default'].isRxDatabase;
var isRxCollection = exports.isRxCollection = _core2['default'].isRxCollection;
var isRxDocument = exports.isRxDocument = _core2['default'].isRxDocument;
var isRxQuery = exports.isRxQuery = _core2['default'].isRxQuery;
var isRxSchema = exports.isRxSchema = _core2['default'].isRxSchema;
var RxSchema = exports.RxSchema = _core2['default'].RxSchema;
var PouchDB = exports.PouchDB = _core2['default'].PouchDB;
var QueryChangeDetector = exports.QueryChangeDetector = _core2['default'].QueryChangeDetector;
var RxDatabase = exports.RxDatabase = _core2['default'].RxDatabase;

exports['default'] = {
  create: create,
  removeDatabase: removeDatabase,
  plugin: plugin,
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
