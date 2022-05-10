import type { DexiePreparedQuery, RxQueryPlan, RxStorageQueryResult } from '../../types';
import type { RxStorageInstanceDexie } from './rx-storage-instance-dexie';
export declare function getKeyRangeByQueryPlan(queryPlan: RxQueryPlan, IDBKeyRange?: any): any;
/**
 * Runs mango queries over the Dexie.js database.
 */
export declare function dexieQuery<RxDocType>(instance: RxStorageInstanceDexie<RxDocType>, preparedQuery: DexiePreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
