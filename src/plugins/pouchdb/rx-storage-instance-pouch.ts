import { ObliviousSet } from 'oblivious-set';
import {
    Observable,
    Subject,
    Subscription
} from 'rxjs';
import { newRxError } from '../../rx-error';
import type {
    BulkWriteRow,
    EventBulk,
    PouchBulkDocResultRow,
    PouchChangesOptionsNonLive,
    PouchCheckpoint,
    PouchSettings,
    PouchWriteError,
    PreparedQuery,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxDocumentData,
    RxDocumentDataById,
    RxJsonSchema,
    RxStorage,
    RxStorageBulkWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageQueryResult,
    StringKeys
} from '../../types';
import {
    OPEN_POUCHDB_STORAGE_INSTANCES,
    OPEN_POUCH_INSTANCES,
    POUCHDB_DESIGN_PREFIX,
    pouchDocumentDataToRxDocumentData,
    PouchStorageInternals,
    pouchSwapIdToPrimary,
    rxDocumentDataToPouchDocumentData,
    writeAttachmentsToAttachments
} from './pouchdb-helper';
import {
    blobBufferUtil,
    flatClone,
    getFromMapOrThrow,
    getFromObjectOrThrow,
    lastOfArray,
    PROMISE_RESOLVE_VOID
} from '../../util';
import {
    getCustomEventEmitterByPouch
} from './custom-events-plugin';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';


let lastId = 0;

export class RxStorageInstancePouch<RxDocType> implements RxStorageInstance<
    RxDocType,
    PouchStorageInternals,
    PouchSettings,
    PouchCheckpoint
> {
    public readonly id: number = lastId++;

    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, PouchCheckpoint>> = new Subject();
    private subs: Subscription[] = [];
    public primaryPath: StringKeys<RxDocumentData<RxDocType>>;

    public closed: boolean = false;


    /**
     * Some PouchDB operations give wrong results when they run in parallel.
     * So we have to ensure they are queued up.
     */
    public nonParallelQueue: Promise<any> = PROMISE_RESOLVE_VOID;

    constructor(
        public readonly storage: RxStorage<PouchStorageInternals, PouchSettings>,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: Readonly<PouchStorageInternals>,
        public readonly options: Readonly<PouchSettings>
    ) {
        OPEN_POUCHDB_STORAGE_INSTANCES.add(this);
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
        /**
         * Instead of listening to pouch.changes,
         * we have overwritten pouchdbs bulkDocs()
         * and create our own event stream, this will work more relyable
         * and does not mix up with write events from other sources.
         */
        const emitter = getCustomEventEmitterByPouch<RxDocType>(this.internals.pouch);

        /**
         * Contains all eventIds that of emitted events,
         * used because multi-instance pouchdbs often will reemit the same
         * event on the other browser tab so we have to de-duplicate them.
         */
        const emittedEventBulkIds: ObliviousSet<string> = new ObliviousSet(60 * 1000);

        const eventSub = emitter.subject.subscribe((eventBulk) => {
            if (
                eventBulk.events.length === 0 ||
                emittedEventBulkIds.has(eventBulk.id)
            ) {
                return;
            }
            emittedEventBulkIds.add(eventBulk.id);

            // rewrite primaryPath of all events
            eventBulk.events.forEach(event => {
                if (event.change.doc) {
                    event.change.doc = pouchSwapIdToPrimary(
                        this.primaryPath,
                        event.change.doc as any
                    );
                }
                if (event.change.previous) {
                    event.change.previous = pouchSwapIdToPrimary(
                        this.primaryPath,
                        event.change.previous as any
                    );
                }
            });

            this.changes$.next(eventBulk);
        });
        this.subs.push(eventSub);
    }

    close() {
        ensureNotClosed(this);
        this.closed = true;
        this.subs.forEach(sub => sub.unsubscribe());
        OPEN_POUCHDB_STORAGE_INSTANCES.delete(this);
        OPEN_POUCH_INSTANCES.delete(this.internals.pouchInstanceId);

        // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
        // await this.internals.pouch.close();
        return PROMISE_RESOLVE_VOID;
    }

    async remove() {
        ensureNotClosed(this);
        this.closed = true;
        this.subs.forEach(sub => sub.unsubscribe());

        OPEN_POUCHDB_STORAGE_INSTANCES.delete(this);
        OPEN_POUCH_INSTANCES.delete(this.internals.pouchInstanceId);

        await this.internals.pouch.destroy();
    }
    public async bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<
        RxStorageBulkWriteResponse<RxDocType>
    > {
        ensureNotClosed(this);
        if (documentWrites.length === 0) {
            throw newRxError('P2', {
                args: {
                    documentWrites
                }
            });
        }

        const writeRowById: Map<string, BulkWriteRow<RxDocType>> = new Map();
        const insertDocsById: Map<string, any> = new Map();
        const writeDocs: (RxDocType & { _id: string; _rev: string })[] = documentWrites.map(writeData => {

            /**
             * Ensure that _meta.lwt is set correctly
             */
            if (
                writeData.document._meta.lwt < 1000 ||
                (
                    writeData.previous &&
                    writeData.previous._meta.lwt >= writeData.document._meta.lwt
                )
            ) {
                throw newRxError('SNH', {
                    args: writeData
                });
            }

            /**
             * Ensure that a revision exists,
             * having an empty revision here would not throw
             * but just not resolve forever.
             */
            if (!writeData.document._rev) {
                throw newRxError('SNH', {
                    args: writeData
                });
            }

            const primary: string = (writeData.document as any)[this.primaryPath];
            writeRowById.set(primary, writeData);
            const storeDocumentData: any = rxDocumentDataToPouchDocumentData<RxDocType>(
                this.primaryPath,
                writeData.document
            );
            insertDocsById.set(primary, storeDocumentData);
            return storeDocumentData;
        });

        const previousDocsInDb: Map<string, RxDocumentData<any>> = new Map();
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };
        this.nonParallelQueue = this.nonParallelQueue.then(async () => {
            const pouchResult = await this.internals.pouch.bulkDocs(writeDocs, {
                new_edits: false,
                custom: {
                    primaryPath: this.primaryPath,
                    writeRowById,
                    insertDocsById,
                    previousDocsInDb,
                    context
                }
            } as any);
            return Promise.all(
                pouchResult.map(async (resultRow) => {
                    const writeRow = getFromMapOrThrow(writeRowById, resultRow.id);
                    if ((resultRow as PouchWriteError).error) {
                        const previousDoc = getFromMapOrThrow(previousDocsInDb, resultRow.id);
                        const err: RxStorageBulkWriteError<RxDocType> = {
                            isError: true,
                            status: 409,
                            documentId: resultRow.id,
                            writeRow,
                            documentInDb: pouchDocumentDataToRxDocumentData(
                                this.primaryPath,
                                previousDoc
                            )
                        };
                        ret.error[resultRow.id] = err;
                    } else {
                        let pushObj: RxDocumentData<RxDocType> = flatClone(writeRow.document) as any;
                        pushObj = pouchSwapIdToPrimary(this.primaryPath, pushObj);
                        pushObj._rev = (resultRow as PouchBulkDocResultRow).rev;

                        // replace the inserted attachments with their diggest
                        pushObj._attachments = {};
                        if (!writeRow.document._attachments) {
                            writeRow.document._attachments = {};
                        } else {
                            pushObj._attachments = await writeAttachmentsToAttachments(writeRow.document._attachments);
                        }
                        ret.success[resultRow.id] = pushObj;
                    }
                })
            );
        });
        await this.nonParallelQueue;
        return ret;
    }

    public async query(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {
        ensureNotClosed(this);
        const findResult = await this.internals.pouch.find<RxDocType>(preparedQuery);
        const ret: RxStorageQueryResult<RxDocType> = {
            documents: findResult.docs.map(pouchDoc => {
                const useDoc = pouchDocumentDataToRxDocumentData(
                    this.primaryPath,
                    pouchDoc
                );
                return useDoc;
            })
        };
        return ret;
    }

    async getAttachmentData(
        documentId: string,
        attachmentId: string
    ): Promise<string> {
        ensureNotClosed(this);
        let attachmentData = await this.internals.pouch.getAttachment(
            documentId,
            attachmentId
        );

        /**
         * In Node.js, PouchDB works with Buffers because it is old and Node.js did
         * not support Blob at the time is was coded.
         * So here we have to transform the Buffer to a Blob.
         */
        const isBuffer = typeof Buffer !== 'undefined' && Buffer.isBuffer(attachmentData);
        if (isBuffer) {
            attachmentData = new Blob([attachmentData]);
        }

        const ret = await blobBufferUtil.toBase64String(attachmentData);
        return ret;
    }

    findDocumentsById(
        ids: string[],
        deleted: boolean
    ): Promise<RxDocumentDataById<RxDocType>> {
        return pouchFindDocumentsById<RxDocType>(
            this,
            ids,
            deleted
        );
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, PouchCheckpoint>> {
        ensureNotClosed(this);
        return this.changes$.asObservable();
    }

    cleanup(_minimumDeletedTime: number): Promise<boolean> {
        ensureNotClosed(this);
        /**
         * PouchDB does not support purging documents.
         * So instead we run a compaction that might at least help a bit
         * in freeing up disc space.
         * @link https://github.com/pouchdb/pouchdb/issues/802
         */
        return this.internals.pouch
            .compact()
            .then(() => true);
    }

    async getChangedDocumentsSince(
        limit: number,
        checkpoint?: PouchCheckpoint
    ): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: PouchCheckpoint;
    }> {
        ensureNotClosed(this);
        if (!limit || typeof limit !== 'number') {
            throw new Error('wrong limit');
        }

        const pouchChangesOpts: PouchChangesOptionsNonLive = {
            live: false,
            limit: limit,
            include_docs: false,
            since: checkpoint ? checkpoint.sequence : 0,
            descending: false
        };

        let lastSequence = 0;
        let first = true;
        let skippedDesignDocuments = 0;
        let changedDocuments: { id: string; sequence: number; }[] = [];
        /**
         * Because PouchDB also returns changes of _design documents,
         * we have to fill up the results with more changes if this happens.
         */
        while (first || skippedDesignDocuments > 0) {
            first = false;
            skippedDesignDocuments = 0;
            const pouchResults = await this.internals.pouch.changes(pouchChangesOpts);
            const addChangedDocuments = pouchResults.results
                .filter(row => {
                    const isDesignDoc = row.id.startsWith(POUCHDB_DESIGN_PREFIX);
                    if (isDesignDoc) {
                        skippedDesignDocuments = skippedDesignDocuments + 1;
                        return false;
                    } else {
                        return true;
                    }
                })
                .map(row => ({
                    id: row.id,
                    sequence: row.seq
                }));
            changedDocuments = changedDocuments.concat(addChangedDocuments);
            lastSequence = pouchResults.last_seq;

            // modify pouch options for next run of pouch.changes()
            pouchChangesOpts.since = lastSequence;
            pouchChangesOpts.limit = skippedDesignDocuments;
        }

        const documentsData = await pouchFindDocumentsById<RxDocType>(
            this,
            changedDocuments.map(o => o.id),
            true
        );

        if (
            Object.keys(documentsData).length > 0 &&
            checkpoint && checkpoint.sequence === lastSequence
        ) {
            /**
             * When documents are returned, it makes no sense
             * if the sequence is equal to the one given at the checkpoint.
             */
            throw new Error('same sequence');
        }

        const lastRow = lastOfArray(changedDocuments);
        const documents = changedDocuments.map(changeRow => getFromObjectOrThrow(documentsData, changeRow.id));

        return {
            documents,
            checkpoint: lastRow ? {
                sequence: lastRow.sequence
            } : checkpoint ? checkpoint : {
                sequence: -1
            }
        }
    }

    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        return new Subject();
    }
    async resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> { }
}



function ensureNotClosed(
    instance: RxStorageInstancePouch<any>
) {
    if (instance.closed) {
        throw new Error('RxStorageInstancePouch is closed ' + instance.databaseName + '-' + instance.collectionName);
    }
}


/**
 * Because we internally use the findDocumentsById()
 * method, it is defined here because RxStorage wrappers
 * might swap out the function.
 */
async function pouchFindDocumentsById<RxDocType>(
    instance: RxStorageInstancePouch<RxDocType>,
    ids: string[],
    deleted: boolean
): Promise<RxDocumentDataById<RxDocType>> {
    ensureNotClosed(instance);
    const ret: RxDocumentDataById<RxDocType> = {};

    /**
     * On deleted documents, PouchDB will only return the tombstone.
     * So we have to get the properties directly for each document
     * with the hack of getting the changes and then make one request per document
     * with the latest revision.
     * TODO create an issue at pouchdb on how to get the document data of deleted documents,
     * when one past revision was written via new_edits=false
     * @link https://stackoverflow.com/a/63516761/3443137
     */
    if (deleted) {
        instance.nonParallelQueue = instance.nonParallelQueue.then(async () => {
            const viaChanges = await instance.internals.pouch.changes({
                live: false,
                since: 0,
                doc_ids: ids,
                style: 'all_docs'
            });
            await Promise.all(
                viaChanges.results.map(async (result) => {
                    const firstDoc = await instance.internals.pouch.get(
                        result.id,
                        {
                            rev: result.changes[0].rev,
                            deleted: 'ok',
                            style: 'all_docs'
                        }
                    );
                    const useFirstDoc = pouchDocumentDataToRxDocumentData(
                        instance.primaryPath,
                        firstDoc
                    );
                    ret[result.id] = useFirstDoc;
                })
            );
        });
        await instance.nonParallelQueue;
        return ret;
    } else {
        instance.nonParallelQueue = instance.nonParallelQueue.then(async () => {
            const pouchResult = await instance.internals.pouch.allDocs({
                include_docs: true,
                keys: ids
            });
            pouchResult.rows
                .filter(row => !!row.doc)
                .forEach(row => {
                    let docData = row.doc;
                    docData = pouchDocumentDataToRxDocumentData(
                        instance.primaryPath,
                        docData
                    );
                    ret[row.id] = docData;
                });
        });
        await instance.nonParallelQueue;
        return ret;
    }
}
