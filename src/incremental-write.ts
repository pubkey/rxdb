import { beforeDocumentUpdateWrite } from './rx-document';
import { isBulkWriteConflictError } from './rx-error';
import type {
    AtomicUpdateFunction,
    BulkWriteRow,
    RxCollection,
    RxDocumentData,
    RxError,
    RxStorageBulkWriteError,
    StringKeys
} from './types';
import {
    clone,
    ensureNotFalsy,
    getFromMapOrFill,
    getFromMapOrThrow,
    parseRevision
} from './util';


type IncrementalWriteQueueItem<RxDocType> = {
    lastKnownDocumentState: RxDocumentData<RxDocType>;
    modifier: AtomicUpdateFunction<RxDocType>;
    resolve: (d: RxDocumentData<RxDocType>) => void;
    reject: (error: RxStorageBulkWriteError<RxDocType> | Error | RxError) => void;
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
    public primaryPath: StringKeys<RxDocumentData<RxDocType>>;

    constructor(
        public readonly collection: RxCollection<RxDocType>
    ) {
        this.primaryPath = collection.schema.primaryPath;
    }

    addWrite(
        lastKnownDocumentState: RxDocumentData<RxDocType>,
        modifier: AtomicUpdateFunction<RxDocType>
    ): Promise<RxDocumentData<RxDocType>> {
        const docId: string = lastKnownDocumentState[this.primaryPath] as any;
        const ar = getFromMapOrFill(this.queueByDocId, docId, () => []);
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
        console.log('triggerRun() -1');
        if (
            this.isRunning === true ||
            this.queueByDocId.size === 0
        ) {
            // already running
            return;
        }
        console.log('triggerRun() 0');
        this.isRunning = true;
        const writeRows: BulkWriteRow<RxDocType>[] = [];

        /**
         * 'take over' so that while the async functions runs,
         * new incremental updates could be added from the outside.
         */
        const itemsById = this.queueByDocId;
        this.queueByDocId = new Map();

        console.log('triggerRun() 1');
        await Promise.all(
            Array.from(itemsById.entries())
                .map(async ([_docId, items]) => {
                    const oldData = findNewestOfDocumentStates(
                        items.map(i => i.lastKnownDocumentState)
                    );
                    let newData = oldData;
                    for (const item of items) {
                        try {
                            newData = await item.modifier(
                                /**
                                 * We have to clone() each time because the modifier
                                 * might throw while it already changed some properties
                                 * of the document.
                                 */
                                clone(newData)
                            ) as any;
                        } catch (err: any) {
                            console.log('triggerRun() 1.1 ERROR');
                            item.reject(err);
                        }
                    }

                    console.log('triggerRun() 1.1');
                    let hasThrown: Error | null = null;
                    await beforeDocumentUpdateWrite(this.collection, newData, oldData)
                        .catch(err => {
                            console.log('triggerRun() 1 ERROR');
                            hasThrown = err;
                        });
                    console.log('triggerRun() 1.2');
                    if (hasThrown) {
                        items.forEach(item => item.reject(ensureNotFalsy(hasThrown)));
                    } else {
                        writeRows.push({
                            previous: oldData,
                            document: newData
                        });
                    }
                })
        );
        console.log('writeRows:');
        console.dir(writeRows);
        const writeResult = await this.collection.storageInstance.bulkWrite(writeRows, 'incremental-write');
        console.log('writeResult:');
        console.dir(writeResult);
        console.log('triggerRun() 2');

        // process success
        await Promise.all(
            Array
                .from(Object.entries(writeResult.success))
                .map(([docId, result]) => {
                    this.collection._runHooks('post', 'save', result);
                    const items = getFromMapOrThrow(itemsById, docId);
                    items.forEach(item => item.resolve(result));
                })
        );
        console.log('triggerRun() 3');

        // process errors
        Array
            .from(Object.entries(writeResult.error))
            .forEach(([docId, error]) => {
                const items = getFromMapOrThrow(itemsById, docId);
                const isConflict = isBulkWriteConflictError<RxDocType>(error);
                if (isConflict) {
                    // had conflict -> retry afterwards
                    const ar = getFromMapOrFill(this.queueByDocId, docId, () => []);
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
                    // other error -> must be thrown
                    items.forEach(item => item.reject(error));
                }
            });
        console.log('triggerRun() 4');

        this.isRunning = false;

        /**
         * Always trigger another run
         * because in between there might be new items
         * been added to the queue.
         */
        return this.triggerRun();
    }
}



export function findNewestOfDocumentStates<RxDocType>(
    docs: RxDocumentData<RxDocType>[]
): RxDocumentData<RxDocType> {

    let newest = docs[0];
    let newestRevisionHeight = parseRevision(newest._rev).height;
    docs.forEach(doc => {
        const height = parseRevision(doc._rev).height;
        if (height > newestRevisionHeight) {
            newest = doc;
            newestRevisionHeight = height;
        }
    });
    return newest;
}
