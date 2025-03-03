import { ensureRxStorageInstanceParamsAreCorrect } from "../../index.js";
import { RX_STORAGE_NAME_SQLITE } from "./sqlite-helpers.js";
import { createSQLiteTrialStorageInstance } from "./sqlite-storage-instance.js";
import { RXDB_VERSION } from "../utils/utils-rxdb-version.js";
export * from "./sqlite-helpers.js";
export * from "./sqlite-types.js";
export * from "./sqlite-storage-instance.js";
export * from "./sqlite-basics-helpers.js";
export var RxStorageSQLiteTrial = /*#__PURE__*/function () {
  function RxStorageSQLiteTrial(settings) {
    this.name = RX_STORAGE_NAME_SQLITE;
    this.rxdbVersion = RXDB_VERSION;
    this.settings = settings;
  }
  var _proto = RxStorageSQLiteTrial.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
    return createSQLiteTrialStorageInstance(this, params, this.settings);
  };
  return RxStorageSQLiteTrial;
}();
var warningShown = false;
export function getRxStorageSQLiteTrial(settings) {
  if (!warningShown) {
    warningShown = true;
    console.warn(['-------------- RxDB SQLite Trial Version in Use -------------------------------', 'You are using the trial version of the SQLite RxStorage from RxDB https://rxdb.info/rx-storage-sqlite.html?console=sqlite ', 'While this is a great option to try out RxDB itself, notice that you should never use the trial version in production. It is way slower compared to the "real" SQLite storage', 'and it has several limitations like not using indexes and being limited to store a maximum of 300 documents.', 'For production environments, use the premium SQLite RxStorage:', ' https://rxdb.info/premium/?console=sqlite ', 'If you already purchased premium access, ensure that you have imported the correct sqlite storage from the premium plugins.', '-------------------------------------------------------------------------------'].join('\n'));
  }
  var storage = new RxStorageSQLiteTrial(settings);
  return storage;
}
//# sourceMappingURL=index.js.map