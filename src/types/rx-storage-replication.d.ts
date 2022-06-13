import { BehaviorSubject } from 'rxjs';
import type {
    InternalStoreDocType
} from '../rx-database-internal-store';
import { RxDocumentData } from './rx-storage';
import type {
    RxStorageInstance
} from './rx-storage.interface';

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
     * If the fork storage is persistend,
     * we have to also store the replication checkpoint in a persistend way.
     * Therefore we need access to another storage instance that can save meta data.
     * 
     * Normally you will use myRxDatabase.internalStore
     * but only if the fork storage is really persistend
     * (will keep it's state after a process restart).
     */
    checkPointInstance?: RxStorageInstance<InternalStoreDocType, any, any>;
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
    masterDocumentState: RxDocumentData<RxDocType>;
    assumedMasterDocumentState?: RxDocumentData<RxDocType>;
    newDocumentState: RxDocumentData<RxDocType>;
};
export type RxConflictHandler<RxDocType> = (
    i: RxConflictHandlerInput<RxDocType>
) => Promise<{
    resolvedDocumentState: RxDocumentData<RxDocType>
}>


export type RxStorageReplicationDirection = 'up' | 'down';
