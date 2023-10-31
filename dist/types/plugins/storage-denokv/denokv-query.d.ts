import type { RxStorageQueryResult } from '../../types/index.d.ts';
import { RxStorageInstanceDenoKV } from "./rx-storage-instance-denokv.ts";
import type { DenoKVPreparedQuery } from "./denokv-types.ts";
export declare function queryDenoKV<RxDocType>(instance: RxStorageInstanceDenoKV<RxDocType>, preparedQuery: DenoKVPreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
