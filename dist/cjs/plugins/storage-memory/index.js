"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  getRxStorageMemory: true
};
exports.getRxStorageMemory = getRxStorageMemory;
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _utilsRxdbVersion = require("../utils/utils-rxdb-version.js");
var _rxStorageInstanceMemory = require("./rx-storage-instance-memory.js");
Object.keys(_rxStorageInstanceMemory).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxStorageInstanceMemory[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageInstanceMemory[key];
    }
  });
});
var _memoryHelper = require("./memory-helper.js");
Object.keys(_memoryHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _memoryHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _memoryHelper[key];
    }
  });
});
var _binarySearchBounds = require("./binary-search-bounds.js");
Object.keys(_binarySearchBounds).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _binarySearchBounds[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _binarySearchBounds[key];
    }
  });
});
var _memoryTypes = require("./memory-types.js");
Object.keys(_memoryTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _memoryTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _memoryTypes[key];
    }
  });
});
var _memoryIndexes = require("./memory-indexes.js");
Object.keys(_memoryIndexes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _memoryIndexes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _memoryIndexes[key];
    }
  });
});
/**
 * Keep the state even when the storage instance is closed.
 * This makes it easier to use the memory storage
 * to test filesystem-like and multiInstance behaviors.
 */
var COLLECTION_STATES = new Map();
function getRxStorageMemory(settings = {}) {
  var storage = {
    name: 'memory',
    rxdbVersion: _utilsRxdbVersion.RXDB_VERSION,
    collectionStates: COLLECTION_STATES,
    createStorageInstance(params) {
      (0, _rxStorageHelper.ensureRxStorageInstanceParamsAreCorrect)(params);
      var useSettings = Object.assign({}, settings, params.options);
      return (0, _rxStorageInstanceMemory.createMemoryStorageInstance)(this, params, useSettings);
    }
  };
  return storage;
}
//# sourceMappingURL=index.js.map