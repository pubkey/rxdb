import { Observable } from 'rxjs';
import type {
    InternalStoreDocType,
    MaybePromise,
    RxCollection,
    RxDocumentData,
    RxReplicationPullStreamItem,
    RxReplicationWriteToMasterRow,
    WithDeleted
} from '../../types/index.d.ts';


export type InternalStoreReplicationPushDocType = InternalStoreDocType<{
    checkpoint: any;
}>;
export type InternalStoreReplicationPullDocType<RxDocType> = InternalStoreDocType<{
    lastPulledDoc: RxDocumentData<RxDocType>;
}>;

export type ReplicationPullHandlerResult<RxDocType, CheckpointType> = {
    checkpoint: CheckpointType | undefined;
    documents: WithDeleted<RxDocType>[];
};

export type ReplicationPushHandlerResult<RxDocType> = RxDocType[];

export type ReplicationPullHandler<RxDocType, CheckpointType> = (
    lastPulledCheckpoint: CheckpointType | undefined,
    batchSize: number
) => Promise<ReplicationPullHandlerResult<RxDocType, CheckpointType>>;

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

    /**
     * If set, the push replication
     * will start from the given checkpoint.
     */
    initialCheckpoint?: any;
};

/**
 * Gets the new write rows.
 * Returns the current master state of all conflicting writes,
 * so that they can be resolved on the client.
 */
export type ReplicationPushHandler<RxDocType> = (
    docs: RxReplicationWriteToMasterRow<RxDocType>[]
) => Promise<WithDeleted<RxDocType>[]>;
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
    modifier?: (docData: WithDeleted<RxDocType>) => MaybePromise<any | null>;

    /**
     * How many local changes to process at once.
     */
    batchSize?: number;

    /**
     * If set, the push replication
     * will start from the given checkpoint.
     */
    initialCheckpoint?: any;
};


export type ReplicationOptions<RxDocType, CheckpointType> = {
    /**
     * An id for the replication to identify it
     * and so that RxDB is able to resume the replication on app reload.
     * If you replicate with a remote server, it is recommended to put the
     * server url into the replicationIdentifier.
     * Like 'my-rest-replication-to-https://example.com/api/sync'
     */
    replicationIdentifier: string;
    collection: RxCollection<RxDocType, unknown, unknown, unknown>;
    /**
     * Define a custom property that is used
     * to flag a document as being deleted.
     * @default '_deleted'
     */
    deletedField?: '_deleted' | string;
    pull?: ReplicationPullOptions<RxDocType, CheckpointType>;
    push?: ReplicationPushOptions<RxDocType>;
    /**
     * By default it will do an ongoing realtime replication.
     * By settings live: false the replication will run once until the local state
     * is in sync with the remote state, then it will cancel itself.
     * @default true
     */
    live?: boolean;
    /**
     * Time in milliseconds after when a failed backend request
     * has to be retried.
     * This time will be skipped if a offline->online switch is detected
     * via `navigator.onLine`
     * @default 5000
     */
    retryTime?: number;
    /**
     * When multiInstance is `true`, like when you use RxDB in multiple browser tabs,
     * the replication should always run in only one of the open browser tabs.
     * If waitForLeadership is `true`, it will wait until the current instance is leader.
     * If waitForLeadership is `false`, it will start replicating, even if it is not leader.
     * @default true
     */
    waitForLeadership?: boolean;

    toggleOnDocumentVisible?: boolean;

    /**
     * If this is set to `false`,
     * the replication will not start automatically
     * but will wait for `replicationState.start()` being called.
     * @default true
     */
    autoStart?: boolean;
};
