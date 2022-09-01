import { Observable } from 'rxjs';
import type {
    InternalStoreDocType,
    MaybePromise,
    RxCollection,
    RxDocumentData,
    RxReplicationPullStreamItem,
    RxReplicationWriteToMasterRow,
    WithDeleted
} from '../../types';


export type InternalStoreReplicationPushDocType = InternalStoreDocType<{
    checkpoint: any;
}>;
export type InternalStoreReplicationPullDocType<RxDocType> = InternalStoreDocType<{
    lastPulledDoc: RxDocumentData<RxDocType>;
}>;

export type ReplicationPullHandlerResult<RxDocType> = {
    checkpoint: any;
    documents: WithDeleted<RxDocType>[];
};

export type ReplicationPullHandler<RxDocType, CheckpointType> = (lastPulledCheckpoint: CheckpointType, batchSize: number) => Promise<ReplicationPullHandlerResult<RxDocType>>;
export type ReplicationPullOptions<RxDocType, CheckpointType> = {
    /**
     * A handler that pulls the new remote changes
     * from the remote actor.
     */
    handler: ReplicationPullHandler<RxDocType, CheckpointType>;


    /**
     * An observable that streams all document changes
     * that are happening on the backend.
     * Emits an document bulk together with the latest checkpoint of these documents.
     * Also can emit a 'RESYNC' event when the client was offline and is online again.
     * 
     * Not required for non-live replication.
     */
    stream$?: Observable<RxReplicationPullStreamItem<RxDocType, CheckpointType>>;

    /**
     * Amount of documents that the remote will send in one request.
     * If the response contains less then [batchSize] documents,
     * RxDB will assume there are no more changes on the backend
     * that are not replicated.
     * [default=100]
     */
    batchSize?: number;

    /**
     * A modifier that runs on all documents that are pulled,
     * before they are used by RxDB.
     * - the ones from the pull handler
     * - the ones from the pull stream
     */
    modifier?: (docData: any) => MaybePromise<WithDeleted<RxDocType>>;
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
     * A modifier that runs on all pushed documents before
     * they are send into the push handler.
     */
    modifier?: (docData: WithDeleted<RxDocType>) => MaybePromise<any>;

    /**
     * How many local changes to process at once.
     */
    batchSize?: number;
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
    deletedField?: '_deleted' | string;
    pull?: ReplicationPullOptions<RxDocType, CheckpointType>;
    push?: ReplicationPushOptions<RxDocType>;
    /**
     * default=false
     */
    live?: boolean;
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
