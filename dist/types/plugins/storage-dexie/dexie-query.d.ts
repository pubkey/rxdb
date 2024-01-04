import type { PreparedQuery, RxQueryPlan, RxStorageQueryResult } from '../../types/index.d.ts';
import type { RxStorageInstanceDexie } from './rx-storage-instance-dexie.ts';
export declare function mapKeyForKeyRange(k: any): any;
export declare function getKeyRangeByQueryPlan(booleanIndexes: string[], queryPlan: RxQueryPlan, IDBKeyRange?: any): any;
/**
 * Runs mango queries over the Dexie.js database.
 */
export declare function dexieQuery<RxDocType>(instance: RxStorageInstanceDexie<RxDocType>, preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
export declare function dexieCount<RxDocType>(instance: RxStorageInstanceDexie<RxDocType>, preparedQuery: PreparedQuery<RxDocType>): Promise<number>;
