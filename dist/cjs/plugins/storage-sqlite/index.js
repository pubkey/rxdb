"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxStorageSQLiteTrial: true,
  getRxStorageSQLiteTrial: true
};
exports.RxStorageSQLiteTrial = void 0;
exports.getRxStorageSQLiteTrial = getRxStorageSQLiteTrial;
var _index = require("../../index.js");
var _sqliteHelpers = require("./sqlite-helpers.js");
Object.keys(_sqliteHelpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _sqliteHelpers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _sqliteHelpers[key];
    }
  });
});
var _sqliteStorageInstance = require("./sqlite-storage-instance.js");
Object.keys(_sqliteStorageInstance).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _sqliteStorageInstance[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _sqliteStorageInstance[key];
    }
  });
});
var _utilsRxdbVersion = require("../utils/utils-rxdb-version.js");
var _sqliteTypes = require("./sqlite-types.js");
Object.keys(_sqliteTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _sqliteTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _sqliteTypes[key];
    }
  });
});
var _sqliteBasicsHelpers = require("./sqlite-basics-helpers.js");
Object.keys(_sqliteBasicsHelpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _sqliteBasicsHelpers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _sqliteBasicsHelpers[key];
    }
  });
});
var RxStorageSQLiteTrial = exports.RxStorageSQLiteTrial = /*#__PURE__*/function () {
  function RxStorageSQLiteTrial(settings) {
    this.name = _sqliteHelpers.RX_STORAGE_NAME_SQLITE;
    this.rxdbVersion = _utilsRxdbVersion.RXDB_VERSION;
    this.settings = settings;
  }
  var _proto = RxStorageSQLiteTrial.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    (0, _index.ensureRxStorageInstanceParamsAreCorrect)(params);
    return (0, _sqliteStorageInstance.createSQLiteTrialStorageInstance)(this, params, this.settings);
  };
  return RxStorageSQLiteTrial;
}();
var warningShown = false;
function getRxStorageSQLiteTrial(settings) {
  if (!warningShown) {
    warningShown = true;
    console.warn(['-------------- RxDB SQLite Trial Version in Use -------------------------------', 'You are using the trial version of the SQLite RxStorage from RxDB https://rxdb.info/rx-storage-sqlite.html?console=sqlite ', 'While this is a great option to try out RxDB itself, notice that you should never use the trial version in production. It is way slower compared to the "real" SQLite storage', 'and it has several limitations like not using indexes and being limited to store a maximum of 300 documents.', 'For production environments, use the premium SQLite RxStorage:', ' https://rxdb.info/premium/?console=sqlite ', 'If you already purchased premium access, ensure that you have imported the correct sqlite storage from the premium plugins.', '-------------------------------------------------------------------------------'].join('\n'));
  }
  var storage = new RxStorageSQLiteTrial(settings);
  return storage;
}
//# sourceMappingURL=index.js.map