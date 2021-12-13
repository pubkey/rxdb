import type { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import type { RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';
import { Collection } from 'lokijs';
import type { LokiDatabaseSettings, LokiDatabaseState, MangoQuery, RxJsonSchema } from '../../types';
import type { DeterministicSortComparator } from 'event-reduce-js';
import { LeaderElector } from 'broadcast-channel';
import type { RxStorageLoki } from './rx-storage-lokijs';
export declare const CHANGES_COLLECTION_SUFFIX = "-rxdb-changes";
export declare const LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = "rxdb-lokijs-remote-request";
export declare const LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = "rxdb-lokijs-remote-request-key-object";
/**
 * Loki attaches a $loki property to all data
 * which must be removed before returning the data back to RxDB.
 */
export declare function stripLokiKey<T>(docData: T & {
    $loki?: number;
}): T;
export declare function getLokiEventKey(isLocal: boolean, primary: string, revision: string): string;
/**
 * Used to check in tests if all instances have been cleaned up.
 */
export declare const OPEN_LOKIJS_STORAGE_INSTANCES: Set<RxStorageKeyObjectInstanceLoki | RxStorageInstanceLoki<any>>;
export declare const LOKIJS_COLLECTION_DEFAULT_OPTIONS: Partial<CollectionOptions<any>>;
export declare function getLokiDatabase(databaseName: string, databaseSettings: LokiDatabaseSettings): Promise<LokiDatabaseState>;
export declare function closeLokiCollections(databaseName: string, collections: Collection[]): Promise<void>;
/**
 * This function is at lokijs-helper
 * because we need it in multiple places.
 */
export declare function getLokiSortComparator<RxDocType>(schema: RxJsonSchema<RxDocType>, query: MangoQuery<RxDocType>): DeterministicSortComparator<RxDocType>;
export declare function getLokiLeaderElector(storage: RxStorageLoki, databaseName: string): LeaderElector;
export declare function removeLokiLeaderElectorReference(storage: RxStorageLoki, databaseName: string): void;
