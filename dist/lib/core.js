"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  addRxPlugin: true,
  PouchDB: true,
  validateCouchDBString: true,
  getBatch: true,
  countAllUndeleted: true,
  createRxDatabase: true,
  removeRxDatabase: true,
  checkAdapter: true,
  isRxDatabase: true,
  dbCount: true,
  _collectionNamePrimary: true,
  isRxCollection: true,
  _createRxCollection: true,
  isRxDocument: true,
  getDocumentOrmPrototype: true,
  getDocumentPrototype: true,
  isRxQuery: true,
  isRxSchema: true,
  createRxSchema: true,
  RxSchema: true,
  getIndexes: true,
  normalize: true,
  getFinalFields: true,
  getPreviousVersions: true,
  RxChangeEvent: true,
  getRxStoragePouchDb: true,
  getPouchLocation: true,
  _clearHook: true,
  createCrypter: true
};
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
Object.defineProperty(exports, "validateCouchDBString", {
  enumerable: true,
  get: function get() {
    return _pouchDb.validateCouchDBString;
  }
});
Object.defineProperty(exports, "getBatch", {
  enumerable: true,
  get: function get() {
    return _pouchDb.getBatch;
  }
});
Object.defineProperty(exports, "countAllUndeleted", {
  enumerable: true,
  get: function get() {
    return _pouchDb.countAllUndeleted;
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
Object.defineProperty(exports, "_collectionNamePrimary", {
  enumerable: true,
  get: function get() {
    return _rxDatabase._collectionNamePrimary;
  }
});
Object.defineProperty(exports, "isRxCollection", {
  enumerable: true,
  get: function get() {
    return _rxCollection.isInstanceOf;
  }
});
Object.defineProperty(exports, "_createRxCollection", {
  enumerable: true,
  get: function get() {
    return _rxCollection.create;
  }
});
Object.defineProperty(exports, "isRxDocument", {
  enumerable: true,
  get: function get() {
    return _rxDocument.isInstanceOf;
  }
});
Object.defineProperty(exports, "getDocumentOrmPrototype", {
  enumerable: true,
  get: function get() {
    return _rxDocumentPrototypeMerge.getDocumentOrmPrototype;
  }
});
Object.defineProperty(exports, "getDocumentPrototype", {
  enumerable: true,
  get: function get() {
    return _rxDocumentPrototypeMerge.getDocumentPrototype;
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
Object.defineProperty(exports, "getIndexes", {
  enumerable: true,
  get: function get() {
    return _rxSchema.getIndexes;
  }
});
Object.defineProperty(exports, "normalize", {
  enumerable: true,
  get: function get() {
    return _rxSchema.normalize;
  }
});
Object.defineProperty(exports, "getFinalFields", {
  enumerable: true,
  get: function get() {
    return _rxSchema.getFinalFields;
  }
});
Object.defineProperty(exports, "getPreviousVersions", {
  enumerable: true,
  get: function get() {
    return _rxSchema.getPreviousVersions;
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
Object.defineProperty(exports, "getPouchLocation", {
  enumerable: true,
  get: function get() {
    return _rxStoragePouchdb.getPouchLocation;
  }
});
Object.defineProperty(exports, "_clearHook", {
  enumerable: true,
  get: function get() {
    return _hooks._clearHook;
  }
});
Object.defineProperty(exports, "createCrypter", {
  enumerable: true,
  get: function get() {
    return _crypter.createCrypter;
  }
});

require("./types/modules/crypto-js.d");

require("./types/modules/graphql-client.d");

require("./types/modules/mocha.parallel.d");

require("./types/modules/modifiyjs.d");

require("./types/modules/pouchdb-selector-core.d");

require("./types/modules/random-token.d");

var _plugin = require("./plugin");

var _pouchDb = require("./pouch-db");

var _rxDatabase = require("./rx-database");

var _rxCollection = require("./rx-collection");

var _rxDocument = require("./rx-document");

var _rxDocumentPrototypeMerge = require("./rx-document-prototype-merge");

var _rxQuery = require("./rx-query");

var _rxSchema = require("./rx-schema");

var _rxChangeEvent = require("./rx-change-event");

var _rxStoragePouchdb = require("./rx-storage-pouchdb");

var _hooks = require("./hooks");

var _crypter = require("./crypter");

var _queryCache = require("./query-cache");

Object.keys(_queryCache).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _queryCache[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _queryCache[key];
    }
  });
});

var _util = require("./util");

Object.keys(_util).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _util[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _util[key];
    }
  });
});

//# sourceMappingURL=core.js.map