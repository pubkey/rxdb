import { ensureRxStorageInstanceParamsAreCorrect } from "../../rx-storage-helper.js";
import { RXDB_VERSION } from "../utils/utils-rxdb-version.js";
import { RX_STORAGE_NAME_LOCALSTORAGE, createLocalstorageStorageInstance } from "./rx-storage-instance-localstorage.js";
export * from "./localstorage-mock.js";
export var RxStorageLocalstorage = /*#__PURE__*/function () {
  function RxStorageLocalstorage(settings) {
    this.name = RX_STORAGE_NAME_LOCALSTORAGE;
    this.rxdbVersion = RXDB_VERSION;
    this.settings = settings;
  }
  var _proto = RxStorageLocalstorage.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
    var useSettings = Object.assign({}, this.settings, params.options);
    return createLocalstorageStorageInstance(this, params, useSettings);
  };
  return RxStorageLocalstorage;
}();
export function getRxStorageLocalstorage(settings = {}) {
  var storage = new RxStorageLocalstorage(settings);
  return storage;
}
//# sourceMappingURL=index.js.map