import type { RxCollection, RxDocumentData, InternalStoreReplicationPullDocType, InternalStoreReplicationPushDocType, DeepReadonlyObject } from '../../types';
/**
 * Get the last push checkpoint
 */
export declare function getLastPushCheckpoint(collection: RxCollection, replicationIdentifierHash: string): Promise<any | undefined>;
export declare function setLastPushCheckpoint(collection: RxCollection, replicationIdentifierHash: string, checkpoint: any): Promise<RxDocumentData<InternalStoreReplicationPushDocType>>;
export declare function getChangesSinceLastPushCheckpoint<RxDocType>(collection: RxCollection<RxDocType, any>, replicationIdentifierHash: string, 
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
    }>;
    checkpoint: any;
}>;
export declare function getLastPullDocument<RxDocType>(collection: RxCollection<RxDocType>, replicationIdentifierHash: string): Promise<RxDocumentData<RxDocType> | null>;
export declare function setLastPullDocument<RxDocType>(collection: RxCollection, replicationIdentifierHash: string, lastPulledDoc: RxDocumentData<RxDocType> | DeepReadonlyObject<RxDocumentData<RxDocType>>): Promise<RxDocumentData<InternalStoreReplicationPullDocType<RxDocType>>>;
