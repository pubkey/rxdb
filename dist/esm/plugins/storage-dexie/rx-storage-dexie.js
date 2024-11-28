import { RX_STORAGE_NAME_DEXIE } from "./dexie-helper.js";
import { createDexieStorageInstance } from "./rx-storage-instance-dexie.js";
import { ensureRxStorageInstanceParamsAreCorrect } from "../../rx-storage-helper.js";
import { RXDB_VERSION } from "../utils/utils-rxdb-version.js";
import { newRxError } from "../../rx-error.js";
export var RxStorageDexie = /*#__PURE__*/function () {
  function RxStorageDexie(settings) {
    this.name = RX_STORAGE_NAME_DEXIE;
    this.rxdbVersion = RXDB_VERSION;
    this.settings = settings;
  }
  var _proto = RxStorageDexie.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);

    /**
     * Dexie does not support non-required indexes and must throw if that is used.
     * @link https://github.com/pubkey/rxdb/pull/6643#issuecomment-2505310082
     */
    if (params.schema.indexes) {
      var indexFields = params.schema.indexes.flat();
      indexFields.filter(indexField => !indexField.includes('.')).forEach(indexField => {
        if (!params.schema.required || !params.schema.required.includes(indexField)) {
          throw newRxError('DXE1', {
            field: indexField,
            schema: params.schema
          });
        }
      });
    }
    return createDexieStorageInstance(this, params, this.settings);
  };
  return RxStorageDexie;
}();
export function getRxStorageDexie(settings = {}) {
  var storage = new RxStorageDexie(settings);
  return storage;
}
//# sourceMappingURL=rx-storage-dexie.js.map