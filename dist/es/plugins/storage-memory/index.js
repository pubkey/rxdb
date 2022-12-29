import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import { flatClone } from '../../util';
import { RxStorageDexieStatics } from '../storage-dexie/dexie-statics';
import { createMemoryStorageInstance } from './rx-storage-instance-memory';

/**
 * Keep the state even when the storage instance is closed.
 * This makes it easier to use the memory storage
 * to test filesystem-like and multiInstance behaviors.
 */
var COLLECTION_STATES = new Map();
export function getRxStorageMemory() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = {
    name: 'memory',
    statics: RxStorageDexieStatics,
    collectionStates: COLLECTION_STATES,
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