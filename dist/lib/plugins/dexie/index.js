"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _rxStorageDexie = require("./rx-storage-dexie");

Object.keys(_rxStorageDexie).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageDexie[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStorageDexie[key];
    }
  });
});

var _rxStorageInstanceDexie = require("./rx-storage-instance-dexie");

Object.keys(_rxStorageInstanceDexie).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageInstanceDexie[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStorageInstanceDexie[key];
    }
  });
});

var _rxStorageKeyObjectInstanceDexie = require("./rx-storage-key-object-instance-dexie");

Object.keys(_rxStorageKeyObjectInstanceDexie).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageKeyObjectInstanceDexie[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStorageKeyObjectInstanceDexie[key];
    }
  });
});

var _dexieHelper = require("./dexie-helper");

Object.keys(_dexieHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _dexieHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _dexieHelper[key];
    }
  });
});

var _dexieQuery = require("./query/dexie-query");

Object.keys(_dexieQuery).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _dexieQuery[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _dexieQuery[key];
    }
  });
});

var _queryPlanner = require("./query/pouchdb-find-query-planer/query-planner");

Object.keys(_queryPlanner).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _queryPlanner[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _queryPlanner[key];
    }
  });
});

var _indexeddbFind = require("./query/pouchdb-find-query-planer/indexeddb-find");

Object.keys(_indexeddbFind).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _indexeddbFind[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _indexeddbFind[key];
    }
  });
});
//# sourceMappingURL=index.js.map