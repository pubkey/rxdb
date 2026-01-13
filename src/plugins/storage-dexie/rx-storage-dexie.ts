import type {
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types/index.d.ts';
import {
    RX_STORAGE_NAME_DEXIE
} from './dexie-helper.ts';
import type {
    DexieSettings,
    DexieStorageInternals
} from '../../types/plugins/dexie.d.ts';
import {
    createDexieStorageInstance,
    RxStorageInstanceDexie
} from './rx-storage-instance-dexie.ts';
import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';
import { newRxError } from '../../rx-error.ts';



export class RxStorageDexie implements RxStorage<DexieStorageInternals, DexieSettings> {
    public name = RX_STORAGE_NAME_DEXIE;
    public readonly rxdbVersion = RXDB_VERSION;
    constructor(
        public settings: DexieSettings
    ) { }

    public createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>
    ): Promise<RxStorageInstanceDexie<RxDocType>> {
        ensureRxStorageInstanceParamsAreCorrect(params);

        /**
         * Dexie does not support non-required indexes and must throw if that is used.
         * @link https://github.com/pubkey/rxdb/pull/6643#issuecomment-2505310082
         */
        if (params.schema.indexes) {
            const indexFields = params.schema.indexes.flat();
            indexFields
                .filter(indexField => !indexField.includes('.'))
                .forEach(indexField => {
                    if (!params.schema.required || !params.schema.required.includes(indexField as any)) {
                        throw newRxError('DXE1', {
                            field: indexField,
                            schema: params.schema,
                        });
                    }
                });
        }

        return createDexieStorageInstance(this, params, this.settings);
    }
}


export function getRxStorageDexie(
    settings: DexieSettings = {}
): RxStorageDexie {
    const storage = new RxStorageDexie(settings);
    return storage;
}
