import { RX_STORAGE_NAME_DEXIE } from "./dexie-helper.js";
import { createDexieStorageInstance } from "./rx-storage-instance-dexie.js";
import { ensureRxStorageInstanceParamsAreCorrect } from "../../rx-storage-helper.js";
import { RXDB_VERSION } from "../utils/utils-rxdb-version.js";
export var RxStorageDexie = /*#__PURE__*/function () {
  function RxStorageDexie(settings) {
    this.name = RX_STORAGE_NAME_DEXIE;
    this.rxdbVersion = RXDB_VERSION;
    this.settings = settings;
  }
  var _proto = RxStorageDexie.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
    return createDexieStorageInstance(this, params, this.settings);
  };
  return RxStorageDexie;
}();
export function getRxStorageDexie(settings = {}) {
  var storage = new RxStorageDexie(settings);
  return storage;
}
//# sourceMappingURL=rx-storage-dexie.js.map