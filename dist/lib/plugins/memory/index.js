"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  getRxStorageMemory: true
};
exports.getRxStorageMemory = getRxStorageMemory;
var _rxStorageHelper = require("../../rx-storage-helper");
var _util = require("../../util");
var _dexieStatics = require("../dexie/dexie-statics");
var _rxStorageInstanceMemory = require("./rx-storage-instance-memory");
Object.keys(_rxStorageInstanceMemory).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxStorageInstanceMemory[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStorageInstanceMemory[key];
    }
  });
});
var _memoryHelper = require("./memory-helper");
Object.keys(_memoryHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _memoryHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _memoryHelper[key];
    }
  });
});
var _binarySearchBounds = require("./binary-search-bounds");
Object.keys(_binarySearchBounds).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _binarySearchBounds[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _binarySearchBounds[key];
    }
  });
});
var _memoryTypes = require("./memory-types");
Object.keys(_memoryTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _memoryTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _memoryTypes[key];
    }
  });
});
var _memoryIndexes = require("./memory-indexes");
Object.keys(_memoryIndexes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _memoryIndexes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _memoryIndexes[key];
    }
  });
});
function getRxStorageMemory() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = {
    name: 'memory',
    statics: _dexieStatics.RxStorageDexieStatics,
    collectionStates: new Map(),
    createStorageInstance: function createStorageInstance(params) {
      (0, _rxStorageHelper.ensureRxStorageInstanceParamsAreCorrect)(params);

      // TODO we should not need to append the schema version here.
      params = (0, _util.flatClone)(params);
      params.collectionName = params.collectionName + '-' + params.schema.version;
      var useSettings = Object.assign({}, settings, params.options);
      return (0, _rxStorageInstanceMemory.createMemoryStorageInstance)(this, params, useSettings);
    }
  };
  return storage;
}
//# sourceMappingURL=index.js.map