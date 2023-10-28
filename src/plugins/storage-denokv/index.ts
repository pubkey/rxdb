import type {
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types/index.d.ts';
import type {
    DexieSettings,
    DexieStorageInternals
} from '../../types/plugins/dexie.d.ts';
import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper.ts';
import type { DenoKVSettings } from './denokv-types.ts';
import { RX_STORAGE_NAME_DENOKV, RxStorageDenoKVStatics } from "./denokv-helper.ts";
import { RxStorageInstanceDenoKV, createDenoKVStorageInstance } from "./rx-storage-instance-denokv.ts";



export class RxStorageDenoKV implements RxStorage<DexieStorageInternals, DexieSettings> {
    public name = RX_STORAGE_NAME_DENOKV;
    public statics = RxStorageDenoKVStatics;

    constructor(
        public settings: DenoKVSettings
    ) { }

    public createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>
    ): Promise<RxStorageInstanceDenoKV<RxDocType>> {
        ensureRxStorageInstanceParamsAreCorrect(params);
        return createDenoKVStorageInstance(this, params, this.settings);
    }
}


export function getRxStorageDenoKV(
    settings: DenoKVSettings = {}
): RxStorageDenoKV {
    const storage = new RxStorageDenoKV(settings);
    return storage;
}
