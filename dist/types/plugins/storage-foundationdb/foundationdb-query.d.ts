import type { RxStorageQueryResult } from '../../types/index.d.ts';
import type { FoundationDBPreparedQuery } from './foundationdb-types.ts';
import { RxStorageInstanceFoundationDB } from './rx-storage-instance-foundationdb.ts';
export declare function queryFoundationDB<RxDocType>(instance: RxStorageInstanceFoundationDB<RxDocType>, preparedQuery: FoundationDBPreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
