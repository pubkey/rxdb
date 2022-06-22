import { BehaviorSubject } from 'rxjs';
import { RxDocumentData } from './rx-storage';
import type {
    RxStorageInstance
} from './rx-storage.interface';

export type RxStorageReplicationMeta = {

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
     * input.identifier of the replication state,
     * used to not mix up different data
     * when the instance is used in more then one replication.
     */
    replicationIdentifier: string;

    /**
     * True if the doc data is about a checkpoint,
     * False if it is about a document state from the master.
     * Stored as a string so it can be used
     * in the combined primary key 'id'
     */
    isCheckpoint: '0' | '1';

    /**
     * Either the document state of the master
     * or the checkpoint data.
     */
    data: RxDocumentData<any> | any;
};

export type RxStorageInstanceReplicationInput<RxDocType> = {
    /**
     * A string that uniquely identifies
     * the replication.
     * Ensures that checkpoint are not
     * mixed with other replications.
     */
    identifier: string;
    bulkSize: number;
    conflictHandler: RxConflictHandler<RxDocType>;

    /**
     * The RxStorage instance of the master branch that is
     * replicated with the fork branch.
     * The replication algorithm is made to make
     * as less writes on the master as possible.
     * The master instance is always 'the truth' which
     * does never contain conflicting document states.
     * All conflicts are handled on the fork branch
     * before being replicated to the master.
     */
    masterInstance: RxStorageInstance<RxDocType, any, any>;

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
    metaInstance: RxStorageInstance<RxStorageReplicationMeta, any, any>;

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
     * But: The longer you wait here, the higher is the risk of loosing fork
     * writes when the replicatoin is destroyed unexpected.
     */
    waitBeforePersist?: () => Promise<any>;
};

export type RxStorageInstanceReplicationState<RxDocType> = {
    // store the primaryPath here for better reuse and performance.
    primaryPath: string;
    input: RxStorageInstanceReplicationInput<RxDocType>;

    /**
     * Used in checkpoints and ._meta fields
     * to ensure we do not mix up meta data of
     * different replications.
     */
     checkpointKey: string;

    /**
     * Tracks if the streams are in sync
     * or not.
     */
    firstSyncDone: {
        [direction in RxStorageReplicationDirection]: BehaviorSubject<boolean>;
    };

    /**
     * Contains the cancel state.
     * Emit true here to cancel the replication.
     */
    canceled: BehaviorSubject<boolean>;

    lastCheckpoint: {
        [direction in RxStorageReplicationDirection]?: any
    };

    /**
     * Can be used to detect if the replication is doing something
     * or if it is in an idle state.
     */
    streamQueue: {
        [direction in RxStorageReplicationDirection]: Promise<any>;
    }
}

export type RxConflictHandlerInput<RxDocType> = {
    documentStateAtForkTime?: RxDocumentData<RxDocType>;
    newDocumentStateInMaster: RxDocumentData<RxDocType>;
    currentForkDocumentState: RxDocumentData<RxDocType>;
};
export type RxConflictHandler<RxDocType> = (
    i: RxConflictHandlerInput<RxDocType>
) => Promise<{
    resolvedDocumentState: RxDocumentData<RxDocType>
}>


export type RxStorageReplicationDirection = 'up' | 'down';
