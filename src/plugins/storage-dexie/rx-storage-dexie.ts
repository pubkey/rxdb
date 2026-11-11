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
         * IndexedDB does not add a document to an index when the key path
         * cannot be resolved, so each part of a nested index field must be required.
         * @link https://github.com/pubkey/rxdb/pull/6643#issuecomment-2505310082
         */
        if (params.schema.indexes) {
            const indexFields = params.schema.indexes.flat();
            indexFields.forEach(indexField => {
                let schemaPart: {
                    required?: string[] | readonly string[] | boolean;
                    properties?: Record<string, any>;
                } | undefined = params.schema as any;
                for (const pathPart of indexField.split('.')) {
                    const required: unknown = schemaPart ? schemaPart.required : undefined;
                    if (!Array.isArray(required) || !required.includes(pathPart)) {
                        throw newRxError('DXE1', {
                            field: indexField,
                            schema: params.schema,
                        });
                    }
                    schemaPart = schemaPart && schemaPart.properties ? schemaPart.properties[pathPart] : undefined;
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
