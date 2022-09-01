import type { RxStorageQueryResult } from '../../types';
import type { FoundationDBPreparedQuery } from './foundationdb-types';
import { RxStorageInstanceFoundationDB } from './rx-storage-instance-foundationdb';
export declare function queryFoundationDB<RxDocType>(instance: RxStorageInstanceFoundationDB<RxDocType>, preparedQuery: FoundationDBPreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
