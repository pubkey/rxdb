import type { RxCollection, RxDocumentData } from '../../types';
/**
 * @return last sequence checkpoint
 */
export declare function getLastPushSequence(collection: RxCollection, endpointHash: string): Promise<number>;
declare type CheckpointDoc = {
    _id: string;
    value: number;
};
export declare function setLastPushSequence(collection: RxCollection, endpointHash: string, sequence: number): Promise<CheckpointDoc>;
export declare function getChangesSinceLastPushSequence<RxDocType>(collection: RxCollection<RxDocType, any>, endpointHash: string, batchSize?: number): Promise<{
    changedDocs: Map<string, {
        id: string;
        doc: RxDocumentData<RxDocType>;
        sequence: number;
    }>;
    lastSequence: number;
    hasChangesSinceLastSequence: boolean;
}>;
export declare function getLastPullDocument<RxDocType>(collection: RxCollection<RxDocType>, endpointHash: string): Promise<RxDocType | null>;
export declare function setLastPullDocument(collection: RxCollection, endpointHash: string, doc: any): Promise<{
    _id: string;
}>;
export {};
