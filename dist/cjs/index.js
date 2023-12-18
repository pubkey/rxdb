"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _plugin = require("./plugin.js");
Object.keys(_plugin).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _plugin[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _plugin[key];
    }
  });
});
var _rxDatabase = require("./rx-database.js");
Object.keys(_rxDatabase).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxDatabase[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxDatabase[key];
    }
  });
});
var _rxError = require("./rx-error.js");
Object.keys(_rxError).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxError[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxError[key];
    }
  });
});
var _rxDatabaseInternalStore = require("./rx-database-internal-store.js");
Object.keys(_rxDatabaseInternalStore).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxDatabaseInternalStore[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxDatabaseInternalStore[key];
    }
  });
});
var _overwritable = require("./overwritable.js");
Object.keys(_overwritable).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _overwritable[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _overwritable[key];
    }
  });
});
var _rxCollection = require("./rx-collection.js");
Object.keys(_rxCollection).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxCollection[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxCollection[key];
    }
  });
});
var _rxCollectionHelper = require("./rx-collection-helper.js");
Object.keys(_rxCollectionHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxCollectionHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxCollectionHelper[key];
    }
  });
});
var _rxDocument = require("./rx-document.js");
Object.keys(_rxDocument).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxDocument[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxDocument[key];
    }
  });
});
var _rxChangeEvent = require("./rx-change-event.js");
Object.keys(_rxChangeEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxChangeEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxChangeEvent[key];
    }
  });
});
var _rxDocumentPrototypeMerge = require("./rx-document-prototype-merge.js");
Object.keys(_rxDocumentPrototypeMerge).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxDocumentPrototypeMerge[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxDocumentPrototypeMerge[key];
    }
  });
});
var _rxQuery = require("./rx-query.js");
Object.keys(_rxQuery).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxQuery[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxQuery[key];
    }
  });
});
var _rxQuerySingleResult = require("./rx-query-single-result.js");
Object.keys(_rxQuerySingleResult).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxQuerySingleResult[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxQuerySingleResult[key];
    }
  });
});
var _rxQueryHelper = require("./rx-query-helper.js");
Object.keys(_rxQueryHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxQueryHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxQueryHelper[key];
    }
  });
});
var _rxSchema = require("./rx-schema.js");
Object.keys(_rxSchema).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxSchema[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxSchema[key];
    }
  });
});
var _rxSchemaHelper = require("./rx-schema-helper.js");
Object.keys(_rxSchemaHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxSchemaHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxSchemaHelper[key];
    }
  });
});
var _rxStorageHelper = require("./rx-storage-helper.js");
Object.keys(_rxStorageHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageHelper[key];
    }
  });
});
var _index = require("./replication-protocol/index.js");
Object.keys(_index).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _index[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index[key];
    }
  });
});
var _rxStorageMultiinstance = require("./rx-storage-multiinstance.js");
Object.keys(_rxStorageMultiinstance).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageMultiinstance[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageMultiinstance[key];
    }
  });
});
var _customIndex = require("./custom-index.js");
Object.keys(_customIndex).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _customIndex[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _customIndex[key];
    }
  });
});
var _queryPlanner = require("./query-planner.js");
Object.keys(_queryPlanner).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _queryPlanner[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _queryPlanner[key];
    }
  });
});
var _pluginHelpers = require("./plugin-helpers.js");
Object.keys(_pluginHelpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _pluginHelpers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _pluginHelpers[key];
    }
  });
});
var _index2 = require("./plugins/utils/index.js");
Object.keys(_index2).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _index2[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index2[key];
    }
  });
});
var _hooks = require("./hooks.js");
Object.keys(_hooks).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _hooks[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _hooks[key];
    }
  });
});
var _queryCache = require("./query-cache.js");
Object.keys(_queryCache).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _queryCache[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _queryCache[key];
    }
  });
});
//# sourceMappingURL=index.js.map