import type { PreparedQuery, RxStorageQueryResult } from '../../types/index.d.ts';
import { RxStorageInstanceDenoKV } from "./rx-storage-instance-denokv.ts";
export declare function queryDenoKV<RxDocType>(instance: RxStorageInstanceDenoKV<RxDocType>, preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
