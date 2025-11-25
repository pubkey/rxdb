import type { RxStorage, RxStorageInstanceCreationParams } from '../../types/index.d.ts';
import type { DenoKVSettings, DenoKVStorageInternals } from './denokv-types.ts';
import { RxStorageInstanceDenoKV } from "./rx-storage-instance-denokv.ts";
export declare class RxStorageDenoKV implements RxStorage<DenoKVStorageInternals<any>, DenoKVSettings> {
    settings: DenoKVSettings;
    name: string;
    readonly rxdbVersion = "16.20.0";
    constructor(settings: DenoKVSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, DenoKVSettings>): Promise<RxStorageInstanceDenoKV<RxDocType>>;
}
export declare function getRxStorageDenoKV(settings?: DenoKVSettings): RxStorageDenoKV;
