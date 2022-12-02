import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import type { RxStorageInstanceCreationParams } from '../../types';
import { flatClone } from '../../util';
import { RxStorageDexieStatics } from '../dexie/dexie-statics';
import type {
    RxStorageMemory,
    RxStorageMemoryInstanceCreationOptions,
    RxStorageMemorySettings
} from './memory-types';
import {
    createMemoryStorageInstance,
    RxStorageInstanceMemory
} from './rx-storage-instance-memory';

export function getRxStorageMemory(
    settings: RxStorageMemorySettings = {}
): RxStorageMemory {

    const storage: RxStorageMemory = {
        name: 'memory',
        statics: RxStorageDexieStatics,
        collectionStates: new Map(),
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
