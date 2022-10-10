"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _pouchDb = require("./pouch-db");
Object.keys(_pouchDb).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _pouchDb[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _pouchDb[key];
    }
  });
});
var _rxStoragePouchdb = require("./rx-storage-pouchdb");
Object.keys(_rxStoragePouchdb).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStoragePouchdb[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStoragePouchdb[key];
    }
  });
});
var _adapterCheck = require("./adapter-check");
Object.keys(_adapterCheck).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _adapterCheck[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _adapterCheck[key];
    }
  });
});
var _customEventsPlugin = require("./custom-events-plugin");
Object.keys(_customEventsPlugin).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _customEventsPlugin[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _customEventsPlugin[key];
    }
  });
});
var _pouchdbHelper = require("./pouchdb-helper");
Object.keys(_pouchdbHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _pouchdbHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _pouchdbHelper[key];
    }
  });
});
var _pouchStatics = require("./pouch-statics");
Object.keys(_pouchStatics).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _pouchStatics[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _pouchStatics[key];
    }
  });
});
var _rxStorageInstancePouch = require("./rx-storage-instance-pouch");
Object.keys(_rxStorageInstancePouch).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageInstancePouch[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStorageInstancePouch[key];
    }
  });
});
//# sourceMappingURL=index.js.map