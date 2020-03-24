"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "addRxPlugin", {
  enumerable: true,
  get: function get() {
    return _plugin.addRxPlugin;
  }
});
Object.defineProperty(exports, "PouchDB", {
  enumerable: true,
  get: function get() {
    return _pouchDb.PouchDB;
  }
});
Object.defineProperty(exports, "createRxDatabase", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.createRxDatabase;
  }
});
Object.defineProperty(exports, "removeRxDatabase", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.removeRxDatabase;
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
Object.defineProperty(exports, "getRxStoragePouchDb", {
  enumerable: true,
  get: function get() {
    return _rxStoragePouchdb.getRxStoragePouchDb;
  }
});

var _plugin = require("./plugin");

var _pouchDb = require("./pouch-db");

var _rxDatabase = require("./rx-database");

var _rxCollection = require("./rx-collection");

var _rxDocument = require("./rx-document");

var _rxQuery = require("./rx-query");

var _rxSchema = require("./rx-schema");

var _rxChangeEvent = require("./rx-change-event");

var _rxStoragePouchdb = require("./rx-storage-pouchdb");

//# sourceMappingURL=core.js.map