import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper.ts';
import type { RxStorage, RxStorageInstance, RxStorageInstanceCreationParams } from '../../types/index';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';
import {
    LocalstorageInstanceCreationOptions,
    LocalstorageStorageInternals,
    LocalstorageStorageSettings,
    RX_STORAGE_NAME_LOCALSTORAGE,
    RxStorageInstanceLocalstorage,
    createLocalstorageStorageInstance
} from './rx-storage-instance-localstorage.ts';
export * from './localstorage-mock.ts';

export class RxStorageLocalstorage implements RxStorage<
    LocalstorageStorageInternals,
    LocalstorageInstanceCreationOptions
> {
    public name = RX_STORAGE_NAME_LOCALSTORAGE;
    readonly rxdbVersion = RXDB_VERSION;

    constructor(
        public settings: LocalstorageStorageSettings
    ) { }

    public createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, LocalstorageInstanceCreationOptions>
    ): Promise<RxStorageInstanceLocalstorage<RxDocType>> {
        ensureRxStorageInstanceParamsAreCorrect(params);
        const useSettings = Object.assign(
            {},
            this.settings,
            params.options
        );
        return createLocalstorageStorageInstance(this, params, useSettings);
    }
}


export function getRxStorageLocalstorage(
    settings: Partial<LocalstorageStorageSettings> = {}
): RxStorageLocalstorage {
    const storage = new RxStorageLocalstorage(settings);
    return storage;
}
