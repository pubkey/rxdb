/**
 * The storage is defined in a separate file
 * so that it can be swappet out in the CI to test
 * different storages.
 */
import { getRxStorageMemory } from 'rxdb/plugins/memory';
export const STORAGE = getRxStorageMemory();
