"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _core = require("./core");

Object.keys(_core).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
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

var _watchForChanges = require("./plugins/watch-for-changes");

var _replication = require("./plugins/replication");

var _adapterCheck = require("./plugins/adapter-check");

var _jsonDump = require("./plugins/json-dump");

var _inMemory = require("./plugins/in-memory");

var _attachments = require("./plugins/attachments");

var _localDocuments = require("./plugins/local-documents");

var _queryBuilder = require("./plugins/query-builder");

/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */
// default plugins
(0, _core.addRxPlugin)(_devMode.RxDBDevModePlugin);
(0, _core.addRxPlugin)(_validate.RxDBValidatePlugin);
(0, _core.addRxPlugin)(_keyCompression.RxDBKeyCompressionPlugin);
(0, _core.addRxPlugin)(_migration.RxDBMigrationPlugin);
(0, _core.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
(0, _core.addRxPlugin)(_encryption.RxDBEncryptionPlugin);
(0, _core.addRxPlugin)(_update.RxDBUpdatePlugin);
(0, _core.addRxPlugin)(_watchForChanges.RxDBWatchForChangesPlugin);
(0, _core.addRxPlugin)(_replication.RxDBReplicationPlugin);
(0, _core.addRxPlugin)(_adapterCheck.RxDBAdapterCheckPlugin);
(0, _core.addRxPlugin)(_jsonDump.RxDBJsonDumpPlugin);
(0, _core.addRxPlugin)(_inMemory.RxDBInMemoryPlugin);
(0, _core.addRxPlugin)(_attachments.RxDBAttachmentsPlugin);
(0, _core.addRxPlugin)(_localDocuments.RxDBLocalDocumentsPlugin);
(0, _core.addRxPlugin)(_queryBuilder.RxDBQueryBuilderPlugin); // re-export things from core

//# sourceMappingURL=index.js.map