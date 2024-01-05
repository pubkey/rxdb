import { ensureRxStorageInstanceParamsAreCorrect } from "../../rx-storage-helper.js";
import { RXDB_VERSION } from "../utils/utils-rxdb-version.js";
import { createMemoryStorageInstance } from "./rx-storage-instance-memory.js";

/**
 * Keep the state even when the storage instance is closed.
 * This makes it easier to use the memory storage
 * to test filesystem-like and multiInstance behaviors.
 */
var COLLECTION_STATES = new Map();
export function getRxStorageMemory(settings = {}) {
  var storage = {
    name: 'memory',
    rxdbVersion: RXDB_VERSION,
    collectionStates: COLLECTION_STATES,
    createStorageInstance(params) {
      ensureRxStorageInstanceParamsAreCorrect(params);
      var useSettings = Object.assign({}, settings, params.options);
      return createMemoryStorageInstance(this, params, useSettings);
    }
  };
  return storage;
}
export * from "./memory-helper.js";
export * from "./binary-search-bounds.js";
export * from "./memory-types.js";
export * from "./memory-indexes.js";
export * from "./rx-storage-instance-memory.js";
//# sourceMappingURL=index.js.map