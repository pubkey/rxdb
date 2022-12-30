import type { ModifyFunction, MaybePromise, RxDocumentData, RxDocumentWriteData, RxError, RxStorageInstance, StringKeys } from './types';
export type IncrementalWriteModifier<RxDocType> = (doc: RxDocumentData<RxDocType>) => MaybePromise<RxDocumentData<RxDocType>> | MaybePromise<RxDocumentWriteData<RxDocType>>;
type IncrementalWriteQueueItem<RxDocType> = {
    lastKnownDocumentState: RxDocumentData<RxDocType>;
    modifier: IncrementalWriteModifier<RxDocType>;
    resolve: (d: RxDocumentData<RxDocType>) => void;
    reject: (error: RxError) => void;
};
/**
 * The incremental write queue
 * batches up all incremental writes to a collection
 * so that performance can be improved by:
 * - Running only one write even when there are multiple modifications to the same document.
 * - Run all writes ins a single bulkWrite() call even when there are writes to many documents.
 */
export declare class IncrementalWriteQueue<RxDocType> {
    readonly storageInstance: RxStorageInstance<RxDocType, any, any>;
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    readonly preWrite: (newData: RxDocumentData<RxDocType>, oldData: RxDocumentData<RxDocType>) => MaybePromise<void>;
    readonly postWrite: (docData: RxDocumentData<RxDocType>) => void;
    queueByDocId: Map<string, IncrementalWriteQueueItem<RxDocType>[]>;
    isRunning: boolean;
    constructor(storageInstance: RxStorageInstance<RxDocType, any, any>, primaryPath: StringKeys<RxDocumentData<RxDocType>>, preWrite: (newData: RxDocumentData<RxDocType>, oldData: RxDocumentData<RxDocType>) => MaybePromise<void>, postWrite: (docData: RxDocumentData<RxDocType>) => void);
    addWrite(lastKnownDocumentState: RxDocumentData<RxDocType>, modifier: IncrementalWriteModifier<RxDocType>): Promise<RxDocumentData<RxDocType>>;
    triggerRun(): Promise<void>;
}
export declare function modifierFromPublicToInternal<RxDocType>(publicModifier: ModifyFunction<RxDocType>): IncrementalWriteModifier<RxDocType>;
export declare function findNewestOfDocumentStates<RxDocType>(docs: RxDocumentData<RxDocType>[]): RxDocumentData<RxDocType>;
export {};
