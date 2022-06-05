import { BehaviorSubject } from 'rxjs';
import type {
    InternalStoreDocType
} from '../rx-database-internal-store';
import { RxDocumentData } from './rx-storage';
import type {
    RxStorageInstance
} from './rx-storage.interface';

export type RxStorageInstanceReplicationInput<RxDocType> = {
    bulkSize: number;
    conflictHandler: RxConflictHandler<RxDocType>;

    parent: RxStorageInstance<RxDocType, any, any>;
    /**
     * The child is the one that contains the forked chain of document writes.
     * All conflicts are solved on the child and only resolved correct document data
     * is written back to the parent.
     */
    child: RxStorageInstance<RxDocType, any, any>;
    /**
     * If the child storage is persistend,
     * we have to also store the replication checkpoint in a persistend way.
     * Therefore we need access to another storage instance that can save meta data.
     * 
     * Normally you will use myRxDatabase.internalStore
     * but only if the child storage is really persistend
     * (will keep it's state after a process restart).
     */
    checkPointInstance?: RxStorageInstance<InternalStoreDocType, any, any>;
};

export type RxStorageInstanceReplicationState<RxDocType> = {
    input: RxStorageInstanceReplicationInput<RxDocType>;

    checkpointKey: {
        down: string;
        up: string;
    }

    /**
     * Resolves when the replication is in sync for the first time,
     * so when the child has an equal state as the parent.
     */
    firstSyncDone: BehaviorSubject<boolean>;
    lastDownstreamCheckpoint?: any;
}

export type RxConflictHandler<RxDocType> = (
    i: {
        parentDocumentState: RxDocumentData<RxDocType>;
        assumedParentDocumentState?: RxDocumentData<RxDocType>;
        newDocumentState: RxDocumentData<RxDocType>;
    }
) => Promise<{
    resolvedDocumentState: RxDocumentData<RxDocType>
}>
