"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {};
exports["default"] = void 0;

var _core = _interopRequireWildcard(require("./core"));

Object.keys(_core).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _core[key];
    }
  });
});

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

_core["default"].plugin(_localDocuments["default"]); // rexport things from core


// TODO no more default exports
var _default = {
  create: _core.create,
  checkAdapter: _core.checkAdapter,
  removeDatabase: _core.removeDatabase,
  plugin: _core.plugin,
  dbCount: _core.dbCount,
  isRxDatabase: _core.isRxDatabase,
  isRxCollection: _core.isRxCollection,
  isRxDocument: _core.isRxDocument,
  isRxQuery: _core.isRxQuery,
  isRxSchema: _core.isRxSchema,
  PouchDB: _core.PouchDB,
  QueryChangeDetector: _core.QueryChangeDetector
};
exports["default"] = _default;

//# sourceMappingURL=index.js.map