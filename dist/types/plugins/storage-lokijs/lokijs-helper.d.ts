import { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import { Collection } from 'lokijs';
import type { LokiDatabaseSettings, LokiDatabaseState, LokiLocalDatabaseState, MangoQuery, RxDocumentData, RxJsonSchema } from '../../types';
import type { DeterministicSortComparator } from 'event-reduce-js';
import { LeaderElector } from 'broadcast-channel';
export declare const CHANGES_COLLECTION_SUFFIX = "-rxdb-changes";
export declare const LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = "rxdb-lokijs-remote-request";
export declare const LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = "rxdb-lokijs-remote-request-key-object";
export declare const RX_STORAGE_NAME_LOKIJS = "lokijs";
/**
 * Loki attaches a $loki property to all data
 * which must be removed before returning the data back to RxDB.
 */
export declare function stripLokiKey<T>(docData: RxDocumentData<T> & {
    $loki?: number;
}): T;
/**
 * Used to check in tests if all instances have been cleaned up.
 */
export declare const OPEN_LOKIJS_STORAGE_INSTANCES: Set<RxStorageInstanceLoki<any>>;
export declare const LOKIJS_COLLECTION_DEFAULT_OPTIONS: Partial<CollectionOptions<any>>;
export declare function getLokiDatabase(databaseName: string, databaseSettings: LokiDatabaseSettings): Promise<LokiDatabaseState>;
export declare function closeLokiCollections(databaseName: string, collections: Collection[]): Promise<void>;
/**
 * This function is at lokijs-helper
 * because we need it in multiple places.
 */
export declare function getLokiSortComparator<RxDocType>(_schema: RxJsonSchema<RxDocumentData<RxDocType>>, query: MangoQuery<RxDocType>): DeterministicSortComparator<RxDocType>;
export declare function getLokiLeaderElector(databaseInstanceToken: string, broadcastChannelRefObject: any, databaseName: string): LeaderElector;
/**
 * For multi-instance usage, we send requests to the RxStorage
 * to the current leading instance over the BroadcastChannel.
 */
export declare function requestRemoteInstance(instance: RxStorageInstanceLoki<any>, operation: string, params: any[]): Promise<any | any[]>;
/**
 * Handles a request that came from a remote instance via requestRemoteInstance()
 * Runs the requested operation over the local db instance and sends back the result.
 */
export declare function handleRemoteRequest(instance: RxStorageInstanceLoki<any>, msg: any): Promise<void>;
export declare function waitUntilHasLeader(leaderElector: LeaderElector): Promise<void>;
/**
 * If the local state must be used, that one is returned.
 * Returns false if a remote instance must be used.
 */
export declare function mustUseLocalState(instance: RxStorageInstanceLoki<any>): Promise<LokiLocalDatabaseState | false>;
