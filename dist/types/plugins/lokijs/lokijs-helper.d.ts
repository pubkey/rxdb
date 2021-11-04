import type { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import type { RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';
import { Collection } from 'lokijs';
import type { LokiDatabaseSettings, LokiDatabaseState } from '../../types';
export declare const CHANGES_COLLECTION_SUFFIX = "-rxdb-changes";
export declare const CHANGES_LOCAL_SUFFIX = "-rxdb-local";
export declare const LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = "rxdb-lokijs-remote-request";
export declare const LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = "rxdb-lokijs-remote-request-key-object";
export declare function getLokiEventKey(isLocal: boolean, primary: string, revision: string): string;
/**
 * Used to check in tests if all instances have been cleaned up.
 */
export declare const OPEN_LOKIJS_STORAGE_INSTANCES: Set<RxStorageKeyObjectInstanceLoki | RxStorageInstanceLoki<any>>;
export declare const LOKIJS_COLLECTION_DEFAULT_OPTIONS: Partial<CollectionOptions<any>>;
export declare function getLokiDatabase(databaseName: string, databaseSettings: LokiDatabaseSettings): Promise<LokiDatabaseState>;
export declare function closeLokiCollections(databaseName: string, collections: Collection[]): Promise<void>;
