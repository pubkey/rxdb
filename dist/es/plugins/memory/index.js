import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import { flatClone } from '../../util';
import { RxStorageDexieStatics } from '../dexie/dexie-statics';
import { createMemoryStorageInstance } from './rx-storage-instance-memory';
export function getRxStorageMemory() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = {
    name: 'memory',
    statics: RxStorageDexieStatics,
    collectionStates: new Map(),
    createStorageInstance: function createStorageInstance(params) {
      ensureRxStorageInstanceParamsAreCorrect(params);

      // TODO we should not need to append the schema version here.
      params = flatClone(params);
      params.collectionName = params.collectionName + '-' + params.schema.version;
      var useSettings = Object.assign({}, settings, params.options);
      return createMemoryStorageInstance(this, params, useSettings);
    }
  };
  return storage;
}
export * from './memory-helper';
export * from './binary-search-bounds';
export * from './memory-types';
export * from './memory-indexes';
export * from './rx-storage-instance-memory';
//# sourceMappingURL=index.js.map