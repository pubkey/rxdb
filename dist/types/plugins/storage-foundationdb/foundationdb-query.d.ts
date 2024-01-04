import type { PreparedQuery, RxStorageQueryResult } from '../../types/index.d.ts';
import { RxStorageInstanceFoundationDB } from './rx-storage-instance-foundationdb.ts';
export declare function queryFoundationDB<RxDocType>(instance: RxStorageInstanceFoundationDB<RxDocType>, preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
