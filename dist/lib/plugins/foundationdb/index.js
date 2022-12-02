"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  getRxStorageFoundationDB: true
};
exports.getRxStorageFoundationDB = getRxStorageFoundationDB;
var _rxStorageHelper = require("../../rx-storage-helper");
var _dexieStatics = require("../dexie/dexie-statics");
var _rxStorageInstanceFoundationdb = require("./rx-storage-instance-foundationdb");
var _foundationdbTypes = require("./foundationdb-types");
Object.keys(_foundationdbTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _foundationdbTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _foundationdbTypes[key];
    }
  });
});
var _foundationdbHelpers = require("./foundationdb-helpers");
Object.keys(_foundationdbHelpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _foundationdbHelpers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _foundationdbHelpers[key];
    }
  });
});
var versionSet;
function getRxStorageFoundationDB(settings) {
  if (versionSet && versionSet !== settings.apiVersion) {
    throw new Error('foundationdb already initialized with api version ' + versionSet);
  } else if (!versionSet) {
    versionSet = settings.apiVersion;
    var _require = require('foundationdb'),
      setAPIVersion = _require.setAPIVersion;
    setAPIVersion(settings.apiVersion);
  }
  var storage = {
    name: 'foundationdb',
    statics: _dexieStatics.RxStorageDexieStatics,
    createStorageInstance: function createStorageInstance(params) {
      (0, _rxStorageHelper.ensureRxStorageInstanceParamsAreCorrect)(params);
      var useSettings = Object.assign({}, settings, params.options);
      if (!useSettings.batchSize) {
        useSettings.batchSize = 50;
      }
      return (0, _rxStorageInstanceFoundationdb.createFoundationDBStorageInstance)(this, params, useSettings);
    }
  };
  return storage;
}
//# sourceMappingURL=index.js.map