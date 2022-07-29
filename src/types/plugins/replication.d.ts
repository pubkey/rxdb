import type { Observable } from 'rxjs';
import type { RxReplicationStateBase } from '../../plugins/replication';
import { RxReplicationError } from '../../plugins/replication/rx-replication-error';
import type {
    InternalStoreDocType,
    RxCollection,
    RxDocumentData,
    RxReplicationWriteToMasterRow,
    WithDeleted
} from '../../types';


export type InternalStoreReplicationPushDocType = InternalStoreDocType<{
    checkpoint: any;
}>;
export type InternalStoreReplicationPullDocType<RxDocType> = InternalStoreDocType<{
    lastPulledDoc: RxDocumentData<RxDocType>;
}>;

export type PullRunResult =
    'ok' |      // pull was sucessfull 
    'error' |   // pull errored and must be retried
    'drop';     // pulled document where dropped because a local write happened in between -> re-run the whole run() cycle

export type ReplicationPullHandlerResult<RxDocType> = {
    checkpoint: any;
    documents: WithDeleted<RxDocType>[];
};

export type ReplicationPullHandler<RxDocType, CheckpointType> = (lastPulledCheckpoint: CheckpointType, bulkSize: number) => Promise<ReplicationPullHandlerResult<RxDocType>>;
export type ReplicationPullOptions<RxDocType, CheckpointType> = {
    /**
     * A handler that pulls the new remote changes
     * from the remote actor.
     */
    handler: ReplicationPullHandler<RxDocType, CheckpointType>;
};

/**
 * Gets the new write rows.
 * Returns the current master state of all conflicting writes,
 * so that they can be resolved on the client.
 */
export type ReplicationPushHandler<RxDocType> = (docs: RxReplicationWriteToMasterRow<RxDocType>[]) => Promise<WithDeleted<RxDocType>[]>;
export type ReplicationPushOptions<RxDocType> = {
    /**
     * A handler that sends the new local changes
     * to the remote actor.
     * On error, all documents are send again at later time.
     */
    handler: ReplicationPushHandler<RxDocType>;
    /**
     * How many local changes to process at once.
     */
    batchSize?: number;
}

export type RxReplicationState<RxDocType, CheckpointType> = RxReplicationStateBase<RxDocType, CheckpointType> & {
    readonly received$: Observable<RxDocumentData<RxDocType>>;
    readonly send$: Observable<WithDeleted<RxDocType>>;
    readonly error$: Observable<RxReplicationError<RxDocType, CheckpointType>>;
    readonly canceled$: Observable<any>;
    readonly active$: Observable<boolean>;
}

export type ReplicationOptions<RxDocType, CheckpointType> = {
    /**
     * An id for the replication to identify it
     * and so that RxDB is able to resume the replication on app reload.
     * If you replicate with a remote server, it is recommended to put the
     * server url into the replicationIdentifier.
     * Like 'my-rest-replication-to-https://example.com/rest'
     */
    replicationIdentifier: string;
    collection: RxCollection<RxDocType>;
    /**
     * Define a custom property that is used
     * to flag a document as being deleted.
     * [default='_deleted']
     */
    deletedFlag?: '_deleted' | string;
    pull?: ReplicationPullOptions<RxDocType, CheckpointType>;
    push?: ReplicationPushOptions<RxDocType>;
    /**
     * default=false
     */
    live?: boolean;
    /**
     * Interval in milliseconds on when to run() again,
     * Set this to 0 when you have a back-channel from your server
     * that like a websocket that tells the client when to pull.
     */
    liveInterval?: number;
    /**
     * Time in milliseconds
     */
    retryTime?: number;
    /**
     * If set to false,
     * it will not wait until the current instance becomes leader.
     * This means it can happen that multiple browser tabs
     * run the replication at the same time which is dangerous.
     */
    waitForLeadership?: boolean; // default=true
    /**
     * Calling `replicateRxCollection()` implies to run a replication.
     * If set to false, it will not run replication on `replicateRxCollection()`.
     * This means you need to call replicationState.run() to trigger the first replication.
     */
    autoStart?: boolean; // default=true
}
