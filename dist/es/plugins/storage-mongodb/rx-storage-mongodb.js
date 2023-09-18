import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import { DEFAULT_CHECKPOINT_SCHEMA, getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { RX_STORAGE_NAME_MONGODB, primarySwapMongoDBQuerySelector, swapToMongoSort } from './mongodb-helper';
import { createMongoDBStorageInstance } from './rx-storage-instance-mongodb';
export var RxStorageMongoDBStatics = {
  prepareQuery(schema, mutateableQuery) {
    var primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    var preparedQuery = {
      query: mutateableQuery,
      mongoSelector: primarySwapMongoDBQuerySelector(primaryKey, mutateableQuery.selector),
      mongoSort: swapToMongoSort(mutateableQuery.sort)
    };
    return preparedQuery;
  },
  checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};
export var RxStorageMongoDB = /*#__PURE__*/function () {
  function RxStorageMongoDB(databaseSettings) {
    this.name = RX_STORAGE_NAME_MONGODB;
    this.statics = RxStorageMongoDBStatics;
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