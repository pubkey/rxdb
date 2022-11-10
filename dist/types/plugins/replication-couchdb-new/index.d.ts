import type { RxCollection, RxPlugin, ReplicationPullOptions, ReplicationPushOptions } from '../../types';
import { RxReplicationState } from '../replication';
import type { CouchDBCheckpointType, FetchMethodType, SyncOptionsCouchDBNew } from './couchdb-types';
export * from './couchdb-helper';
export * from './couchdb-types';
export declare class RxCouchDBNewReplicationState<RxDocType> extends RxReplicationState<RxDocType, CouchDBCheckpointType> {
    readonly url: string;
    fetch: FetchMethodType;
    readonly replicationIdentifierHash: string;
    readonly collection: RxCollection<RxDocType>;
    readonly pull?: ReplicationPullOptions<RxDocType, CouchDBCheckpointType> | undefined;
    readonly push?: ReplicationPushOptions<RxDocType> | undefined;
    readonly live: boolean;
    retryTime: number;
    autoStart: boolean;
    constructor(url: string, fetch: FetchMethodType, replicationIdentifierHash: string, collection: RxCollection<RxDocType>, pull?: ReplicationPullOptions<RxDocType, CouchDBCheckpointType> | undefined, push?: ReplicationPushOptions<RxDocType> | undefined, live?: boolean, retryTime?: number, autoStart?: boolean);
}
export declare function syncCouchDBNew<RxDocType>(this: RxCollection<RxDocType>, options: SyncOptionsCouchDBNew<RxDocType>): RxCouchDBNewReplicationState<RxDocType>;
export declare const RxDBReplicationCouchDBNewPlugin: RxPlugin;
