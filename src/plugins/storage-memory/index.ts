import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper.ts';
import type { RxStorageInstanceCreationParams } from '../../types/index.d.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';
import type {
    RxStorageMemory,
    RxStorageMemoryInstanceCreationOptions,
    RxStorageMemorySettings
} from './memory-types.ts';
import {
    createMemoryStorageInstance,
    RxStorageInstanceMemory
} from './rx-storage-instance-memory.ts';

/**
 * Keep the state even when the storage instance is closed.
 * This makes it easier to use the memory storage
 * to test filesystem-like and multiInstance behaviors.
 */
const COLLECTION_STATES = new Map();

export function getRxStorageMemory(
    settings: RxStorageMemorySettings = {}
): RxStorageMemory {

    const storage: RxStorageMemory = {
        name: 'memory',
        rxdbVersion: RXDB_VERSION,
        collectionStates: COLLECTION_STATES,
        createStorageInstance<RxDocType>(
            params: RxStorageInstanceCreationParams<RxDocType, RxStorageMemoryInstanceCreationOptions>
        ): Promise<RxStorageInstanceMemory<RxDocType>> {
            ensureRxStorageInstanceParamsAreCorrect(params);
            const useSettings = Object.assign(
                {},
                settings,
                params.options
            );


            return createMemoryStorageInstance(this, params, useSettings);
        }
    };

    return storage;
}


export * from './memory-helper.ts';
export * from './binary-search-bounds.ts';
export * from './memory-types.ts';
export * from './memory-indexes.ts';
export * from './rx-storage-instance-memory.ts';
