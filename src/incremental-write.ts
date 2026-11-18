import {
    isBulkWriteConflictError,
    rxStorageWriteErrorToRxError
} from './rx-error.ts';
import type {
    ModifyFunction,
    BulkWriteRow,
    MaybePromise,
    RxDocumentData,
    RxDocumentWriteData,
    RxError,
    RxStorageBulkWriteResponse,
    RxStorageInstance,
    StringKeys,
    WithDeleted
} from './types/index.d.ts';
import {
    clone,
    ensureNotFalsy,
    getFromMapOrCreate,
    getFromMapOrThrow,
    getHeightOfRevision,
    stripMetaDataFromDocument
} from './plugins/utils/index.ts';
import { getWrittenDocumentsFromBulkWriteResponse } from './rx-storage-helper.ts';



export type IncrementalWriteModifier<RxDocType> = (
    doc: RxDocumentData<RxDocType>
) => MaybePromise<RxDocumentData<RxDocType>> | MaybePromise<RxDocumentWriteData<RxDocType>>;


type IncrementalWriteQueueItem<RxDocType> = {
    /**
     * Not set while the state of the document is not known.
     * The writes of a document only run when at least one of them knows the state.
     */
    lastKnownDocumentState?: RxDocumentData<RxDocType>;
    modifier: IncrementalWriteModifier<RxDocType>;
    resolve: (d: RxDocumentData<RxDocType>) => void;
    reject: (error: RxError) => void;
    /**
     * If true, the item is written in its own write row
     * instead of being merged with the other items of the same document.
     */
    runAlone?: boolean;
};

function hasKnownState(items: IncrementalWriteQueueItem<any>[]): boolean {
    return items.some(item => item.lastKnownDocumentState);
}

/**
 * The incremental write queue
 * batches up all incremental writes to a collection
 * so that performance can be improved by:
 * - Running only one write even when there are multiple modifications to the same document.
 * - Run all writes ins a single bulkWrite() call even when there are writes to many documents.
 */
export class IncrementalWriteQueue<RxDocType> {
    public queueByDocId = new Map<string, IncrementalWriteQueueItem<RxDocType>[]>();
    public isRunning: boolean = false;

    constructor(
        public readonly storageInstance: RxStorageInstance<RxDocType, any, any>,
        public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>,
        // can be used to run hooks etc.
        public readonly preWrite: (newData: RxDocumentData<RxDocType>, oldData: RxDocumentData<RxDocType>) => MaybePromise<void>,
        public readonly postWrite: (docData: RxDocumentData<RxDocType>) => void

    ) { }

    /**
     * @param lastKnownDocumentState can be undefined when it is not known if the document exists.
     * The write then keeps its position in the queue and runs when
     * another write to the same document or setDocumentState() provides the state.
     */
    addWrite(
        lastKnownDocumentState: RxDocumentData<RxDocType> | undefined,
        modifier: IncrementalWriteModifier<RxDocType>,
        runAlone?: boolean,
        docId: string = (lastKnownDocumentState as any)[this.primaryPath]
    ): Promise<RxDocumentData<RxDocType>> {
        const ar = getFromMapOrCreate(this.queueByDocId, docId, () => []);
        const ret = new Promise<RxDocumentData<RxDocType>>((resolve, reject) => {
            const item: IncrementalWriteQueueItem<RxDocType> = {
                lastKnownDocumentState,
                modifier,
                resolve,
                reject,
                runAlone
            };
            ensureNotFalsy(ar).push(item);
            this.triggerRun();
        });
        return ret;
    }

    /**
     * Provides the document state to the writes of that document
     * that have been added without it.
     */
    setDocumentState(docData: RxDocumentData<RxDocType>) {
        const items = this.queueByDocId.get(docData[this.primaryPath] as any);
        if (items && !hasKnownState(items)) {
            items[0].lastKnownDocumentState = docData;
            this.triggerRun();
        }
    }

    /**
     * Removes a write that has not started to run.
     * @returns true if the write was removed.
     */
    removeWrite(docId: string, modifier: IncrementalWriteModifier<RxDocType>): boolean {
        const items = this.queueByDocId.get(docId);
        const index = items ? items.findIndex(item => item.modifier === modifier) : -1;
        if (items && index >= 0) {
            items.splice(index, 1);
            if (items.length === 0) {
                this.queueByDocId.delete(docId);
            }
            return true;
        }
        return false;
    }

    async triggerRun(): Promise<void> {
        if (this.isRunning === true) {
            // already running
            return;
        }

        /**
         * 'take over' so that while the async functions runs,
         * new incremental updates could be added from the outside.
         * The writes of documents with an unknown state stay in the queue.
         */
        const itemsById = new Map<string, IncrementalWriteQueueItem<RxDocType>[]>();
        this.queueByDocId.forEach((items, docId) => {
            if (hasKnownState(items)) {
                itemsById.set(docId, items);
                this.queueByDocId.delete(docId);
            }
        });
        if (itemsById.size === 0) {
            return;
        }
        this.isRunning = true;
        const writeRows: BulkWriteRow<RxDocType>[] = [];
        /**
         * Items that are not processed in this run because
         * an item of the same document must be written alone.
         */
        const deferredById = new Map<string, IncrementalWriteQueueItem<RxDocType>[]>();
        try {
            await Promise.all(
                Array.from(itemsById.entries())
                    .map(async ([docId, queuedItems]) => {
                        let allItems = queuedItems;
                        const oldData = findNewestOfDocumentStates(
                            allItems.map(i => i.lastKnownDocumentState).filter(Boolean) as RxDocumentData<RxDocType>[]
                        );
                        const cutAt = allItems[0].runAlone ? 1 : allItems.findIndex(i => i.runAlone);
                        if (cutAt > 0 && cutAt < allItems.length) {
                            deferredById.set(docId, allItems.slice(cutAt));
                            allItems = allItems.slice(0, cutAt);
                        }
                        let newData = oldData;
                        const items: IncrementalWriteQueueItem<RxDocType>[] = [];
                        for (const item of allItems) {
                            try {
                                newData = await item.modifier(
                                    /**
                                     * We have to clone() each time because the modifier
                                     * might throw while it already changed some properties
                                     * of the document.
                                     */
                                    clone(newData)
                                ) as any;
                                items.push(item);
                            } catch (err: any) {
                                item.reject(err);
                            }
                        }

                        /**
                         * Items whose modifier threw are already rejected
                         * and must not be retried on conflicts.
                         * If all modifiers threw, the document must not be written at all.
                         */
                        if (items.length === 0) {
                            itemsById.delete(docId);
                            return;
                        }
                        itemsById.set(docId, items);

                        try {
                            await this.preWrite(newData, oldData);
                        } catch (err: any) {
                            /**
                             * If the before-hooks fail,
                             * we reject all of the writes because it is
                             * not possible to determine which one is to blame.
                             */
                            items.forEach(item => item.reject(err));
                            return;
                        }
                        writeRows.push({
                            previous: oldData,
                            document: newData
                        });
                    })
            );

            let writeResult: RxStorageBulkWriteResponse<RxDocType> | undefined;
            try {
                writeResult = writeRows.length > 0 ?
                    await this.storageInstance.bulkWrite(writeRows, 'incremental-write') :
                    { error: [] };
            } catch (err: any) {
                itemsById.forEach(items => {
                    items.forEach(item => item.reject(err));
                });
            }

            if (writeResult) {
                // process success
                await Promise.all(
                    getWrittenDocumentsFromBulkWriteResponse(this.primaryPath, writeRows, writeResult).map(result => {
                        const docId = result[this.primaryPath] as string;
                        this.postWrite(result);
                        const items = getFromMapOrThrow(itemsById, docId);
                        items.forEach(item => item.resolve(result));
                        const deferred = deferredById.get(docId);
                        if (deferred) {
                            deferred.forEach(item => item.lastKnownDocumentState = result);
                        }
                    })
                );
            }

            /**
             * Add the deferred items back to the queue
             * in front of the items that have been added in the meantime.
             */
            deferredById.forEach((deferred, docId) => {
                const ar = getFromMapOrCreate(this.queueByDocId, docId, () => []);
                ar.unshift(...deferred);
            });

            if (writeResult) {

                // process errors
                writeResult.error
                    .forEach(error => {
                        const docId = error.documentId;
                        const items = getFromMapOrThrow(itemsById, docId);
                        const isConflict = isBulkWriteConflictError<RxDocType>(error);
                        if (isConflict) {
                            // had conflict -> retry afterwards
                            const ar = getFromMapOrCreate(this.queueByDocId, docId, () => []);
                            /**
                             * Add the items back to this.queueByDocId
                             * by maintaining the original order.
                             */
                            items
                                .reverse()
                                .forEach(item => {
                                    item.lastKnownDocumentState = ensureNotFalsy(isConflict.documentInDb);
                                    ensureNotFalsy(ar).unshift(item);
                                });
                        } else {
                            if (items.length > 1) {
                                /**
                                 * The write row contains the merged result of multiple modifiers,
                                 * so it is not known which one caused the error.
                                 * Run them again one by one so that only
                                 * the writes that fail on their own are rejected.
                                 */
                                const ar = getFromMapOrCreate(this.queueByDocId, docId, () => []);
                                items.forEach(item => item.runAlone = true);
                                ar.unshift(...items);
                            } else {
                                // other error -> must be thrown
                                const rxError = rxStorageWriteErrorToRxError(error);
                                items[0].reject(rxError);
                            }
                        }
                    });
            }
        } finally {
            this.isRunning = false;
        }

        /**
         * Always trigger another run
         * because in between there might be new items
         * been added to the queue.
         */
        return this.triggerRun();
    }
}


export function modifierFromPublicToInternal<RxDocType>(
    publicModifier: ModifyFunction<RxDocType>
): IncrementalWriteModifier<RxDocType> {
    const ret = async (docData: RxDocumentData<RxDocType>) => {
        const withoutMeta: WithDeleted<RxDocType> = stripMetaDataFromDocument(docData) as any;
        withoutMeta._deleted = docData._deleted;
        const modified = await publicModifier(withoutMeta);
        const reattachedMeta: RxDocumentData<RxDocType> = Object.assign({}, modified, {
            _meta: docData._meta,
            _attachments: docData._attachments,
            _rev: docData._rev,
            _deleted: typeof (modified as WithDeleted<RxDocType>)._deleted !== 'undefined' ?
                (modified as WithDeleted<RxDocType>)._deleted :
                docData._deleted
        });
        if (typeof reattachedMeta._deleted === 'undefined') {
            reattachedMeta._deleted = false;
        }
        return reattachedMeta;
    };
    return ret;
}


export function findNewestOfDocumentStates<RxDocType>(
    docs: RxDocumentData<RxDocType>[]
): RxDocumentData<RxDocType> {

    let newest = docs[0];
    let newestRevisionHeight = getHeightOfRevision(newest._rev);
    docs.forEach(doc => {
        const height = getHeightOfRevision(doc._rev);
        if (height > newestRevisionHeight) {
            newest = doc;
            newestRevisionHeight = height;
        }
    });
    return newest;
}
