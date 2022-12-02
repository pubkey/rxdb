import type {
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types';
import {
    ensureNoBooleanIndex,
    RX_STORAGE_NAME_DEXIE
} from './dexie-helper';
import type {
    DexieSettings,
    DexieStorageInternals
} from '../../types/plugins/dexie';
import {
    createDexieStorageInstance,
    RxStorageInstanceDexie
} from './rx-storage-instance-dexie';
import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import { RxStorageDexieStatics } from './dexie-statics';



export class RxStorageDexie implements RxStorage<DexieStorageInternals, DexieSettings> {
    public name = RX_STORAGE_NAME_DEXIE;
    public statics = RxStorageDexieStatics;

    constructor(
        public settings: DexieSettings
    ) { }

    public createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>
    ): Promise<RxStorageInstanceDexie<RxDocType>> {
        ensureRxStorageInstanceParamsAreCorrect(params);
        ensureNoBooleanIndex(params.schema);
        return createDexieStorageInstance(this, params, this.settings);
    }
}


export function getRxStorageDexie(
    settings: DexieSettings = {}
): RxStorageDexie {
    const storage = new RxStorageDexie(settings);
    return storage;
}
