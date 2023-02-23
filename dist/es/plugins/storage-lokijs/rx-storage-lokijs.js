import { ensureNotFalsy, flatClone } from '../utils';
import { createLokiStorageInstance } from './rx-storage-instance-loki';
import { RX_STORAGE_NAME_LOKIJS } from './lokijs-helper';
import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import { DEFAULT_CHECKPOINT_SCHEMA } from '../../rx-schema-helper';
export var RxStorageLokiStatics = {
  prepareQuery(_schema, mutateableQuery) {
    mutateableQuery = flatClone(mutateableQuery);
    if (Object.keys(ensureNotFalsy(mutateableQuery.selector)).length > 0) {
      mutateableQuery.selector = {
        $and: [{
          _deleted: false
        }, mutateableQuery.selector]
      };
    } else {
      mutateableQuery.selector = {
        _deleted: false
      };
    }
    return mutateableQuery;
  },
  checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};
export var RxStorageLoki = /*#__PURE__*/function () {
  /**
   * Create one leader elector by db name.
   * This is done inside of the storage, not globally
   * to make it easier to test multi-tab behavior.
   */

  function RxStorageLoki(databaseSettings) {
    this.name = RX_STORAGE_NAME_LOKIJS;
    this.statics = RxStorageLokiStatics;
    this.leaderElectorByLokiDbName = new Map();
    this.databaseSettings = databaseSettings;
  }
  var _proto = RxStorageLoki.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
    return createLokiStorageInstance(this, params, this.databaseSettings);
  };
  return RxStorageLoki;
}();
export function getRxStorageLoki(databaseSettings = {}) {
  var storage = new RxStorageLoki(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-lokijs.js.map