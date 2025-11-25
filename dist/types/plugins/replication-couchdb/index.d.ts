import type { RxCollection, ReplicationPullOptions, ReplicationPushOptions } from '../../types/index.d.ts';
import { RxReplicationState } from '../replication/index.ts';
import type { CouchDBCheckpointType, FetchMethodType, SyncOptionsCouchDB } from './couchdb-types.ts';
export * from './couchdb-helper.ts';
export * from './couchdb-types.ts';
export declare class RxCouchDBReplicationState<RxDocType> extends RxReplicationState<RxDocType, CouchDBCheckpointType> {
    readonly url: string;
    fetch: FetchMethodType;
    readonly replicationIdentifier: string;
    readonly collection: RxCollection<RxDocType, any, any, any>;
    readonly pull?: ReplicationPullOptions<RxDocType, CouchDBCheckpointType> | undefined;
    readonly push?: ReplicationPushOptions<RxDocType> | undefined;
    readonly live: boolean;
    retryTime: number;
    autoStart: boolean;
    constructor(url: string, fetch: FetchMethodType, replicationIdentifier: string, collection: RxCollection<RxDocType, any, any, any>, pull?: ReplicationPullOptions<RxDocType, CouchDBCheckpointType> | undefined, push?: ReplicationPushOptions<RxDocType> | undefined, live?: boolean, retryTime?: number, autoStart?: boolean);
}
export declare function replicateCouchDB<RxDocType>(options: SyncOptionsCouchDB<RxDocType>): RxCouchDBReplicationState<RxDocType>;
