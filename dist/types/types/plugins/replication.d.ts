import type { Observable } from 'rxjs';
import type { RxReplicationStateBase } from '../../plugins/replication';
import type {
    DeepReadonlyObject,
    RxCollection,
    RxDocumentData,
    WithDeleted
} from '../../types';

export type ReplicationCheckpointDocument = { _id: string; value: number; };

export type ReplicationPullHandlerResult<RxDocType> = {
    /**
     * The documents that got pulled from the remote actor.
     */
    documents: (WithDeleted<RxDocType> | DeepReadonlyObject<WithDeleted<RxDocType>>)[];
    /**
     * True if there can be more changes on the remote,
     * so the pulling will run again.
     */
    hasMoreDocuments: boolean;
};


export type ReplicationPullOptions<RxDocType> = {
    /**
     * A handler that pulls the new remote changes
     * from the remote actor.
     */
    handler: (latestPulledDocument: RxDocumentData<RxDocType> | null) => Promise<ReplicationPullHandlerResult<RxDocType>>
};

export type ReplicationPushOptions<RxDocType> = {
    /**
     * A handler that sends the new local changes
     * to the remote actor.
     * On error, all documents are send again at later time.
     */
    handler: (docs: WithDeleted<RxDocType>[]) => Promise<void>;
    /**
     * How many local changes to process at once.
     */
    batchSize?: number;
}

export type RxReplicationState<RxDocType> = RxReplicationStateBase<RxDocType> & {
    readonly received$: Observable<RxDocumentData<RxDocType>>;
    readonly send$: Observable<any>;
    readonly error$: Observable<any>;
    readonly canceled$: Observable<any>;
    readonly active$: Observable<boolean>;
}

export type ReplicationOptions<RxDocType> = {
    replicationIdentifier: string,
    collection: RxCollection<RxDocType>,
    pull?: ReplicationPullOptions<RxDocType>,
    push?: ReplicationPushOptions<RxDocType>,
    /**
     * default=false
     */
    live?: boolean,
    /**
     * Interval in milliseconds on when to run() again,
     * Set this to 0 when you have a back-channel from your server
     * that like a websocket that tells the client when to pull.
     */
    liveInterval?: number,
    /**
     * Time in milliseconds
     */
    retryTime?: number,
    /**
     * If set to false,
     * it will not wait until the current instance becomes leader.
     * This means it can happen that multiple browser tabs
     * run the replication at the same time which is dangerous.
     * 
     */
    waitForLeadership?: boolean; // default=true
}
