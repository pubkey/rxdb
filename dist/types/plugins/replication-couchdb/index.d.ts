import type { RxCollection, ReplicationPullOptions, ReplicationPushOptions } from '../../types';
import { RxReplicationState } from '../replication';
import type { CouchDBCheckpointType, FetchMethodType, SyncOptionsCouchDB } from './couchdb-types';
export * from './couchdb-helper';
export * from './couchdb-types';
export declare class RxCouchDBReplicationState<RxDocType> extends RxReplicationState<RxDocType, CouchDBCheckpointType> {
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
export declare function replicateCouchDB<RxDocType>(options: SyncOptionsCouchDB<RxDocType>): RxCouchDBReplicationState<RxDocType>;
