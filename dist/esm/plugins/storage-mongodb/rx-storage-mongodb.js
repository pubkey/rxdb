import { ensureRxStorageInstanceParamsAreCorrect } from "../../rx-storage-helper.js";
import { RX_STORAGE_NAME_MONGODB } from "./mongodb-helper.js";
import { createMongoDBStorageInstance } from "./rx-storage-instance-mongodb.js";
import { RXDB_VERSION } from "../utils/utils-rxdb-version.js";
export var RxStorageMongoDB = /*#__PURE__*/function () {
  function RxStorageMongoDB(databaseSettings) {
    this.name = RX_STORAGE_NAME_MONGODB;
    this.rxdbVersion = RXDB_VERSION;
    this.databaseSettings = databaseSettings;
  }
  var _proto = RxStorageMongoDB.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
    return createMongoDBStorageInstance(this, params, this.databaseSettings);
  };
  return RxStorageMongoDB;
}();
export function getRxStorageMongoDB(databaseSettings) {
  var storage = new RxStorageMongoDB(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-mongodb.js.map