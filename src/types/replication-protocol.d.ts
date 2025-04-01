import { BehaviorSubject, Observable, Subject } from 'rxjs';
import type {
    RxConflictHandler,
    RxConflictHandlerInput
} from './conflict-handling.d.ts';
import type { RxError, RxTypeError } from './rx-error.d.ts';
import type {
    BulkWriteRow,
    RxDocumentData,
    WithDeleted,
    WithDeletedAndAttachments
} from './rx-storage.d.ts';
import type {
    RxStorageInstance
} from './rx-storage.interface.d.ts';
import type { HashFunction } from './util.d.ts';

export type RxStorageReplicationMeta<RxDocType, CheckpointType> = {

    /**
     * Combined primary key consisting
     * of: [replicationId, itemId, isCheckpoint]
     * so that the same RxStorageInstance
     * can be used for multiple replication states.
     */
    id: string;

    /**
     * Either the document primaryKey
     * or the id of the replication checkpoint.
     */
    itemId: string;

    /**
     * True if the doc data is about a checkpoint,
     * False if it is about a document state from the master.
     * Stored as a string so it can be used
     * in the combined primary key 'id'
     */
    isCheckpoint: '0' | '1';
    checkpointData?: CheckpointType;

    /**
     * the document state of the master
     * only set if not checkpoint.
     */
    docData?: RxDocType | RxDocumentData<RxDocType> | any;
    /**
     * If the current assumed master was written while
     * resolving a conflict, this field contains
     * the revision of the conflict-solution that
     * is stored in the forkInstance.
     */
    isResolvedConflict?: string;
};

export type RxReplicationWriteToMasterRow<RxDocType> = {
    assumedMasterState?: WithDeletedAndAttachments<RxDocType>;
    newDocumentState: WithDeletedAndAttachments<RxDocType>;
};


export type DocumentsWithCheckpoint<RxDocType, CheckpointType> = {
    documents: WithDeletedAndAttachments<RxDocType>[];
    checkpoint: CheckpointType;
};


export type RxReplicationPullStreamItem<RxDocType, MasterCheckpointType> = DocumentsWithCheckpoint<RxDocType, MasterCheckpointType> |
    /**
         * Emit this when the masterChangeStream$ might have missed out
         * some events because the fork lost the connection to the master.
         * Like when the user went offline and reconnects.
         */
    'RESYNC';

/**
 * The replication handler contains all logic
 * that is required by the replication protocol
 * to interact with the master instance.
 * This is an abstraction so that we can use different
 * handlers for GraphQL, REST or any other transportation layer.
 * Even a RxStorageInstance can be wrapped in a way to represent a replication handler.
 *
 * The RxStorage instance of the master branch that is
 * replicated with the fork branch.
 * The replication algorithm is made to make
 * as less writes on the master as possible.
 * The master instance is always 'the truth' which
 * does never contain conflicting document states.
 * All conflicts are handled on the fork branch
 * before being replicated to the master.
 */
export type RxReplicationHandler<RxDocType, MasterCheckpointType> = {
    masterChangeStream$: Observable<RxReplicationPullStreamItem<RxDocType, MasterCheckpointType>>;
    masterChangesSince(
        checkpoint: MasterCheckpointType,
        batchSize: number
    ): Promise<DocumentsWithCheckpoint<RxDocType, MasterCheckpointType>>;
    /**
     * Writes the fork changes to the master.
     * Only returns the conflicts if there are any.
     * (otherwise returns an empty array.)
     */
    masterWrite(
        rows: RxReplicationWriteToMasterRow<RxDocType>[]
    ): Promise<WithDeleted<RxDocType>[]>;
};

export type RxStorageInstanceReplicationInput<RxDocType> = {
    /**
     * A string that uniquely identifies
     * the replication.
     * Ensures that checkpoint are not
     * mixed with other replications.
     */
    identifier: string;
    pullBatchSize: number;
    pushBatchSize: number;
    replicationHandler: RxReplicationHandler<RxDocType, any>;
    conflictHandler: RxConflictHandler<RxDocType>;

    // can be set to also replicate the _meta field of the document.
    keepMeta?: boolean;

    /**
     * The fork is the one that contains the forked chain of document writes.
     * All conflicts are solved on the fork and only resolved correct document data
     * is written back to the parent.
     */
    forkInstance: RxStorageInstance<RxDocType, any, any>;

    /**
     * The replication needs to store some meta data
     * for documents to know which state is at the master
     * and how/if it diverges from the fork.
     * In the past this was stored in the _meta field of
     * the forkInstance documents but that was not a good design decision
     * because it required additional writes on the forkInstance
     * to know which documents have been upstream replicated
     * to not cause conflicts.
     * Using the metaInstance instead leads to better overall performance
     * because RxDB will not re-emit query results or document state
     * when replication meta data is written.
     *
     * In addition to per-document meta data,
     * the replication checkpoints are also stored in this instance.
     *
     */
    metaInstance: RxStorageInstance<RxStorageReplicationMeta<RxDocType, any>, any, any>;

    /**
     * When a write happens to the fork,
     * normally the replication will directly try to persist.
     *
     * For many use cases, it is better to await the next event loop tick
     * or to wait until the RxDatabase is idle or requestIdleCallback() calls
     * to ensure the CPU is idle.
     * This can improve performance because the persistence will not affect UI
     * renders.
     *
     * But: The longer you wait here, the higher is the risk of losing fork
     * writes when the replication is closed unexpected.
     */
    waitBeforePersist?: () => Promise<any>;

    hashFunction: HashFunction;

    initialCheckpoint?: {
        upstream?: any;
        downstream?: any;
    };
};

export type RxStorageInstanceReplicationState<RxDocType> = {
    // store the primaryPath here for better reuse and performance.
    primaryPath: string;
    hasAttachments: boolean;
    input: RxStorageInstanceReplicationInput<RxDocType>;

    events: {
        /**
         * Streams all document writes that have successfully
         * been written in one direction.
         */
        processed: {
            up: Subject<RxReplicationWriteToMasterRow<RxDocType>>;
            down: Subject<BulkWriteRow<RxDocType>>;
        };
        resolvedConflicts: Subject<{
            input: RxConflictHandlerInput<RxDocType>;
            output: WithDeleted<RxDocType>;
        }>;
        /**
         * Contains the cancel state.
         * Emit true here to cancel the replication.
         */
        canceled: BehaviorSubject<boolean>;
        /**
         * Contains the pause state.
         * Emit true here to pause the replication.
         */
        paused: BehaviorSubject<boolean>;
        /**
         * Contains true if the replication is doing something
         * at this point in time.
         * If this is false, it means that the replication
         * is idle AND in sync.
         */
        active: {
            [direction in RxStorageReplicationDirection]: BehaviorSubject<boolean>;
        };
        /**
         * All errors that would otherwise be unhandled,
         * get emitted here.
         */
        error: Subject<RxError | RxTypeError>;
    };


    /**
     * Contains counters that can be used in tests
     * or to debug problems.
     */
    stats: {
        down: {
            addNewTask: number;
            downstreamResyncOnce: number;
            downstreamProcessChanges: number;
            masterChangeStreamEmit: number;
            persistFromMaster: number;
        };
        up: {
            upstreamInitialSync: number;
            forkChangeStreamEmit: number;
            processTasks: number;
            persistToMaster: number;
            persistToMasterHadConflicts: number;
            persistToMasterConflictWrites: number;
        };
    };

    /**
     * Used in checkpoints and ._meta fields
     * to ensure we do not mix up meta data of
     * different replications.
     * We have to use the promise because the key is hashed which runs async.
     */
    checkpointKey: Promise<string>;

    /**
     * Storage.bulkWrites() that are initialized from the
     * downstream, get this flag as context-param
     * so that the emitted event bulk can be identified
     * to be sourced from the downstream and it will not try
     * to upstream these documents again.
     */
    downstreamBulkWriteFlag: Promise<string>;

    /**
     * Tracks if the streams have been in sync
     * for at least one time.
     */
    firstSyncDone: {
        [direction in RxStorageReplicationDirection]: BehaviorSubject<boolean>;
    };

    /**
     * Can be used to detect if the replication is doing something
     * or if it is in an idle state.
     */
    streamQueue: {
        [direction in RxStorageReplicationDirection]: Promise<any>;
    };

    checkpointQueue: Promise<any>;

    /**
     * Writes-to-storage queue of the upstream.
     * Used to await pending writes to finish before
     * closing the replication meta storage.
     */
    persistenceQueue: Promise<any>;

    /**
     * For better performance we store the last known checkpoint
     * document so that we can likely do checkpoint storing without
     * conflicts.
     */
    lastCheckpointDoc: {
        [direction in RxStorageReplicationDirection]?: RxDocumentData<RxStorageReplicationMeta<RxDocType, any>>;
    };
};

export type RxStorageReplicationDirection = 'up' | 'down';
