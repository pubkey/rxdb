import type { RxCollection, RxDocumentData, ReplicationCheckpointDocument } from '../../types';
/**
 * Get the last push checkpoint
 */
export declare function getLastPushSequence(collection: RxCollection, replicationIdentifier: string): Promise<number>;
export declare function setLastPushSequence(collection: RxCollection, replicationIdentifier: string, sequence: number): Promise<ReplicationCheckpointDocument>;
export declare function getChangesSinceLastPushSequence<RxDocType>(collection: RxCollection<RxDocType, any>, replicationIdentifier: string, batchSize?: number): Promise<{
    changedDocs: Map<string, {
        id: string;
        doc: RxDocumentData<RxDocType>;
        sequence: number;
    }>;
    lastSequence: number;
}>;
export declare function getLastPullDocument<RxDocType>(collection: RxCollection<RxDocType>, replicationIdentifier: string): Promise<RxDocumentData<RxDocType> | null>;
export declare function setLastPullDocument(collection: RxCollection, replicationIdentifier: string, doc: any): Promise<{
    _id: string;
}>;
