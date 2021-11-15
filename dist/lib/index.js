"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  addDefaultRxPlugins: true,
  createRxDatabase: true
};
exports.addDefaultRxPlugins = addDefaultRxPlugins;
exports.createRxDatabase = createRxDatabase;

var _core = require("./core");

Object.keys(_core).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _core[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _core[key];
    }
  });
});

var _devMode = require("./plugins/dev-mode");

var _validate = require("./plugins/validate");

var _keyCompression = require("./plugins/key-compression");

var _migration = require("./plugins/migration");

var _leaderElection = require("./plugins/leader-election");

var _encryption = require("./plugins/encryption");

var _update = require("./plugins/update");

var _replicationCouchdb = require("./plugins/replication-couchdb");

var _jsonDump = require("./plugins/json-dump");

var _inMemory = require("./plugins/in-memory");

var _attachments = require("./plugins/attachments");

var _localDocuments = require("./plugins/local-documents");

var _queryBuilder = require("./plugins/query-builder");

var _pouchdb = require("./plugins/pouchdb");

Object.keys(_pouchdb).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _pouchdb[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _pouchdb[key];
    }
  });
});

/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */
// default plugins
var defaultPluginsAdded = false;
/**
 * Adds the default plugins
 * that are used on non-custom builds.
 */

function addDefaultRxPlugins() {
  if (defaultPluginsAdded) {
    return;
  }

  defaultPluginsAdded = true;
  (0, _core.addRxPlugin)(_devMode.RxDBDevModePlugin);
  (0, _core.addRxPlugin)(_validate.RxDBValidatePlugin);
  (0, _core.addRxPlugin)(_keyCompression.RxDBKeyCompressionPlugin);
  (0, _core.addRxPlugin)(_migration.RxDBMigrationPlugin);
  (0, _core.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
  (0, _core.addRxPlugin)(_encryption.RxDBEncryptionPlugin);
  (0, _core.addRxPlugin)(_update.RxDBUpdatePlugin);
  (0, _core.addRxPlugin)(_replicationCouchdb.RxDBReplicationCouchDBPlugin);
  (0, _core.addRxPlugin)(_jsonDump.RxDBJsonDumpPlugin);
  (0, _core.addRxPlugin)(_inMemory.RxDBInMemoryPlugin);
  (0, _core.addRxPlugin)(_attachments.RxDBAttachmentsPlugin);
  (0, _core.addRxPlugin)(_localDocuments.RxDBLocalDocumentsPlugin);
  (0, _core.addRxPlugin)(_queryBuilder.RxDBQueryBuilderPlugin);
}
/**
 * Because we have set sideEffects: false
 * in the package.json, we have to ensure that the default plugins
 * are added before the first database is created.
 * So we have to wrap the createRxDatabase function.
 * Always ensure that this function has the same typings as in the rx-database.ts
 * TODO create a type for that function and use it on both sides.
 */


function createRxDatabase(params) {
  addDefaultRxPlugins();
  return (0, _core.createRxDatabase)(params);
} // re-export things from core
//# sourceMappingURL=index.js.map