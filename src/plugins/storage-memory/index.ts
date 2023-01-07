import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import type { RxStorageInstanceCreationParams } from '../../types';
import { flatClone } from '../../plugins/utils';
import type {
    RxStorageMemory,
    RxStorageMemoryInstanceCreationOptions,
    RxStorageMemorySettings
} from './memory-types';
import {
    createMemoryStorageInstance,
    RxStorageInstanceMemory
} from './rx-storage-instance-memory';
import { RxStorageDefaultStatics } from '../../rx-storage-statics';

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
        statics: RxStorageDefaultStatics,
        collectionStates: COLLECTION_STATES,
        createStorageInstance<RxDocType>(
            params: RxStorageInstanceCreationParams<RxDocType, RxStorageMemoryInstanceCreationOptions>
        ): Promise<RxStorageInstanceMemory<RxDocType>> {
            ensureRxStorageInstanceParamsAreCorrect(params);

            // TODO we should not need to append the schema version here.
            params = flatClone(params);
            params.collectionName = params.collectionName + '-' + params.schema.version;

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


export * from './memory-helper';
export * from './binary-search-bounds';
export * from './memory-types';
export * from './memory-indexes';
export * from './rx-storage-instance-memory';
