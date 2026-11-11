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
    lastKnownDocumentState: RxDocumentData<RxDocType>;
    modifier: IncrementalWriteModifier<RxDocType>;
    resolve: (d: RxDocumentData<RxDocType>) => void;
    reject: (error: RxError) => void;
    /**
     * If true, the item is written in its own write row
     * instead of being merged with the other items of the same document.
     */
    runAlone?: boolean;
};

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

    addWrite(
        lastKnownDocumentState: RxDocumentData<RxDocType>,
        modifier: IncrementalWriteModifier<RxDocType>
    ): Promise<RxDocumentData<RxDocType>> {
        const docId: string = lastKnownDocumentState[this.primaryPath] as any;
        const ar = getFromMapOrCreate(this.queueByDocId, docId, () => []);
        const ret = new Promise<RxDocumentData<RxDocType>>((resolve, reject) => {
            const item: IncrementalWriteQueueItem<RxDocType> = {
                lastKnownDocumentState,
                modifier,
                resolve,
                reject
            };
            ensureNotFalsy(ar).push(item);
            this.triggerRun();
        });
        return ret;
    }

    async triggerRun(): Promise<void> {
        if (
            this.isRunning === true ||
            this.queueByDocId.size === 0
        ) {
            // already running
            return;
        }
        this.isRunning = true;
        const writeRows: BulkWriteRow<RxDocType>[] = [];

        /**
         * 'take over' so that while the async functions runs,
         * new incremental updates could be added from the outside.
         */
        const itemsById = this.queueByDocId;
        this.queueByDocId = new Map();
        /**
         * Items that are not processed in this run because
         * an item of the same document must be written alone first.
         */
        const deferredById = new Map<string, IncrementalWriteQueueItem<RxDocType>[]>();
        try {
            await Promise.all(
                Array.from(itemsById.entries())
                    .map(async ([docId, queuedItems]) => {
                        let allItems = queuedItems;
                        if (allItems[0].runAlone && allItems.length > 1) {
                            deferredById.set(docId, allItems.slice(1));
                            allItems = [allItems[0]];
                        }
                        const oldData = findNewestOfDocumentStates(
                            allItems.map(i => i.lastKnownDocumentState)
                        );
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
