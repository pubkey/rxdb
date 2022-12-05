"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  addRxPlugin: true,
  createRxDatabase: true,
  removeRxDatabase: true,
  isRxDatabase: true,
  dbCount: true,
  isRxDatabaseFirstTimeInstantiated: true,
  ensureNoStartupErrors: true,
  overwritable: true,
  isRxCollection: true,
  RxCollectionBase: true,
  createRxCollection: true,
  fillObjectDataBeforeInsert: true,
  isRxDocument: true,
  flattenEvents: true,
  getDocumentOrmPrototype: true,
  getDocumentPrototype: true,
  isRxQuery: true,
  isRxSchema: true,
  createRxSchema: true,
  RxSchema: true,
  getIndexes: true,
  getPreviousVersions: true,
  toTypedRxJsonSchema: true,
  _clearHook: true
};
Object.defineProperty(exports, "RxCollectionBase", {
  enumerable: true,
  get: function get() {
    return _rxCollection.RxCollectionBase;
  }
});
Object.defineProperty(exports, "RxSchema", {
  enumerable: true,
  get: function get() {
    return _rxSchema.RxSchema;
  }
});
Object.defineProperty(exports, "_clearHook", {
  enumerable: true,
  get: function get() {
    return _hooks._clearHook;
  }
});
Object.defineProperty(exports, "addRxPlugin", {
  enumerable: true,
  get: function get() {
    return _plugin.addRxPlugin;
  }
});
Object.defineProperty(exports, "createRxCollection", {
  enumerable: true,
  get: function get() {
    return _rxCollection.createRxCollection;
  }
});
Object.defineProperty(exports, "createRxDatabase", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.createRxDatabase;
  }
});
Object.defineProperty(exports, "createRxSchema", {
  enumerable: true,
  get: function get() {
    return _rxSchema.createRxSchema;
  }
});
Object.defineProperty(exports, "dbCount", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.dbCount;
  }
});
Object.defineProperty(exports, "ensureNoStartupErrors", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.ensureNoStartupErrors;
  }
});
Object.defineProperty(exports, "fillObjectDataBeforeInsert", {
  enumerable: true,
  get: function get() {
    return _rxCollectionHelper.fillObjectDataBeforeInsert;
  }
});
Object.defineProperty(exports, "flattenEvents", {
  enumerable: true,
  get: function get() {
    return _rxChangeEvent.flattenEvents;
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
Object.defineProperty(exports, "getIndexes", {
  enumerable: true,
  get: function get() {
    return _rxSchema.getIndexes;
  }
});
Object.defineProperty(exports, "getPreviousVersions", {
  enumerable: true,
  get: function get() {
    return _rxSchema.getPreviousVersions;
  }
});
Object.defineProperty(exports, "isRxCollection", {
  enumerable: true,
  get: function get() {
    return _rxCollection.isRxCollection;
  }
});
Object.defineProperty(exports, "isRxDatabase", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.isRxDatabase;
  }
});
Object.defineProperty(exports, "isRxDatabaseFirstTimeInstantiated", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.isRxDatabaseFirstTimeInstantiated;
  }
});
Object.defineProperty(exports, "isRxDocument", {
  enumerable: true,
  get: function get() {
    return _rxDocument.isRxDocument;
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
Object.defineProperty(exports, "overwritable", {
  enumerable: true,
  get: function get() {
    return _overwritable.overwritable;
  }
});
Object.defineProperty(exports, "removeRxDatabase", {
  enumerable: true,
  get: function get() {
    return _rxDatabase.removeRxDatabase;
  }
});
Object.defineProperty(exports, "toTypedRxJsonSchema", {
  enumerable: true,
  get: function get() {
    return _rxSchema.toTypedRxJsonSchema;
  }
});
require("./types/modules/mocha.parallel.d");
require("./types/modules/modifiyjs.d");
var _plugin = require("./plugin");
var _rxDatabase = require("./rx-database");
var _rxError = require("./rx-error");
Object.keys(_rxError).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxError[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxError[key];
    }
  });
});
var _rxDatabaseInternalStore = require("./rx-database-internal-store");
Object.keys(_rxDatabaseInternalStore).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxDatabaseInternalStore[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxDatabaseInternalStore[key];
    }
  });
});
var _overwritable = require("./overwritable");
var _rxCollection = require("./rx-collection");
var _rxCollectionHelper = require("./rx-collection-helper");
var _rxDocument = require("./rx-document");
var _rxChangeEvent = require("./rx-change-event");
var _rxDocumentPrototypeMerge = require("./rx-document-prototype-merge");
var _rxQuery = require("./rx-query");
var _rxQueryHelper = require("./rx-query-helper");
Object.keys(_rxQueryHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxQueryHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxQueryHelper[key];
    }
  });
});
var _rxSchema = require("./rx-schema");
var _rxSchemaHelper = require("./rx-schema-helper");
Object.keys(_rxSchemaHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxSchemaHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxSchemaHelper[key];
    }
  });
});
var _rxStorageHelper = require("./rx-storage-helper");
Object.keys(_rxStorageHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxStorageHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStorageHelper[key];
    }
  });
});
var _rxStorageMessageChannel = require("./rx-storage-message-channel");
Object.keys(_rxStorageMessageChannel).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxStorageMessageChannel[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStorageMessageChannel[key];
    }
  });
});
var _index = require("./replication-protocol/index");
Object.keys(_index).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _index[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _index[key];
    }
  });
});
var _rxStorageMultiinstance = require("./rx-storage-multiinstance");
Object.keys(_rxStorageMultiinstance).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxStorageMultiinstance[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStorageMultiinstance[key];
    }
  });
});
var _customIndex = require("./custom-index");
Object.keys(_customIndex).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _customIndex[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _customIndex[key];
    }
  });
});
var _queryPlanner = require("./query-planner");
Object.keys(_queryPlanner).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _queryPlanner[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _queryPlanner[key];
    }
  });
});
var _pluginHelpers = require("./plugin-helpers");
Object.keys(_pluginHelpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _pluginHelpers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _pluginHelpers[key];
    }
  });
});
var _hooks = require("./hooks");
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
//# sourceMappingURL=index.js.map