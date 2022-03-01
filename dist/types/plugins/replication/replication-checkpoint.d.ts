import type { RxCollection, RxDocumentData, InternalStoreReplicationPullDocType, InternalStoreReplicationPushDocType, DeepReadonlyObject } from '../../types';
/**
 * Get the last push checkpoint
 */
export declare function getLastPushSequence(collection: RxCollection, replicationIdentifierHash: string): Promise<number>;
export declare function setLastPushSequence(collection: RxCollection, replicationIdentifierHash: string, sequence: number): Promise<RxDocumentData<InternalStoreReplicationPushDocType>>;
export declare function getChangesSinceLastPushSequence<RxDocType>(collection: RxCollection<RxDocType, any>, replicationIdentifierHash: string, 
/**
 * A function that returns true
 * when the underlaying RxReplication is stopped.
 * So that we do not run requests against a close RxStorageInstance.
 */
isStopped: () => boolean, batchSize?: number): Promise<{
    changedDocIds: Set<string>;
    changedDocs: Map<string, {
        id: string;
        doc: RxDocumentData<RxDocType>;
        sequence: number;
    }>;
    lastSequence: number;
    hasChangesSinceLastSequence: boolean;
}>;
export declare function getLastPullDocument<RxDocType>(collection: RxCollection<RxDocType>, replicationIdentifierHash: string): Promise<RxDocumentData<RxDocType> | null>;
export declare function setLastPullDocument<RxDocType>(collection: RxCollection, replicationIdentifierHash: string, lastPulledDoc: RxDocumentData<RxDocType> | DeepReadonlyObject<RxDocumentData<RxDocType>>): Promise<RxDocumentData<InternalStoreReplicationPullDocType<RxDocType>>>;
