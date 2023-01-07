import { ensureNoBooleanIndex, RxStorageDexieStatics, RX_STORAGE_NAME_DEXIE } from './dexie-helper';
import { createDexieStorageInstance } from './rx-storage-instance-dexie';
import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
export var RxStorageDexie = /*#__PURE__*/function () {
  function RxStorageDexie(settings) {
    this.name = RX_STORAGE_NAME_DEXIE;
    this.statics = RxStorageDexieStatics;
    this.settings = settings;
  }
  var _proto = RxStorageDexie.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
    ensureNoBooleanIndex(params.schema);
    return createDexieStorageInstance(this, params, this.settings);
  };
  return RxStorageDexie;
}();
export function getRxStorageDexie(settings = {}) {
  var storage = new RxStorageDexie(settings);
  return storage;
}
//# sourceMappingURL=rx-storage-dexie.js.map