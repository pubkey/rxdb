"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "QueryChangeDetector", {
  enumerable: true,
  get: function get() {
    return _queryChangeDetector.QueryChangeDetector;
  }
});
Object.defineProperty(exports, "PouchDB", {
  enumerable: true,
  get: function get() {
    return _pouchDb.PouchDB;
  }
});
Object.defineProperty(exports, "create", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.create;
  }
});
Object.defineProperty(exports, "removeDatabase", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.removeDatabase;
  }
});
Object.defineProperty(exports, "checkAdapter", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.checkAdapter;
  }
});
Object.defineProperty(exports, "isRxDatabase", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.isInstanceOf;
  }
});
Object.defineProperty(exports, "dbCount", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.dbCount;
  }
});
Object.defineProperty(exports, "createRxDatabase", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.create;
  }
});
Object.defineProperty(exports, "isRxCollection", {
  enumerable: true,
  get: function get() {
    return _rxCollection.isInstanceOf;
  }
});
Object.defineProperty(exports, "isRxDocument", {
  enumerable: true,
  get: function get() {
    return _rxDocument.isInstanceOf;
  }
});
Object.defineProperty(exports, "isRxQuery", {
  enumerable: true,
  get: function get() {
    return _rxQuery.isInstanceOf;
  }
});
Object.defineProperty(exports, "isRxSchema", {
  enumerable: true,
  get: function get() {
    return _rxSchema.isInstanceOf;
  }
});
Object.defineProperty(exports, "createRxSchema", {
  enumerable: true,
  get: function get() {
    return _rxSchema.createRxSchema;
  }
});
Object.defineProperty(exports, "RxSchema", {
  enumerable: true,
  get: function get() {
    return _rxSchema.RxSchema;
  }
});
Object.defineProperty(exports, "RxChangeEvent", {
  enumerable: true,
  get: function get() {
    return _rxChangeEvent.RxChangeEvent;
  }
});
exports["default"] = exports.plugin = void 0;

var _queryChangeDetector = require("./query-change-detector");

var _plugin = _interopRequireDefault(require("./plugin"));

var _pouchDb = require("./pouch-db");

var _rxDatabase = require("./rx-database");

var _rxCollection = require("./rx-collection");

var _rxDocument = require("./rx-document");

var _rxQuery = require("./rx-query");

var _rxSchema = require("./rx-schema");

var _rxChangeEvent = require("./rx-change-event");

/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */
var plugin = _plugin["default"];
exports.plugin = plugin;
var _default = {
  create: _rxDatabase.create,
  removeDatabase: _rxDatabase.removeDatabase,
  checkAdapter: _rxDatabase.checkAdapter,
  plugin: plugin,
  dbCount: _rxDatabase.dbCount,
  isRxDatabase: _rxDatabase.isInstanceOf,
  isRxCollection: _rxCollection.isInstanceOf,
  isRxDocument: _rxDocument.isInstanceOf,
  isRxQuery: _rxQuery.isInstanceOf,
  isRxSchema: _rxSchema.isInstanceOf,
  PouchDB: _pouchDb.PouchDB,
  QueryChangeDetector: _queryChangeDetector.QueryChangeDetector
};
exports["default"] = _default;

//# sourceMappingURL=core.js.map