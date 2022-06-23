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
    PouchChangedDocumentsSinceCheckpoint,
    PouchChangesOptionsNonLive,
    PouchSettings,
    PouchWriteError,
    PreparedQuery,
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
    PouchSettings
> {
    public readonly id: number = lastId++;

    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> = new Subject();
    private subs: Subscription[] = [];
    private primaryPath: StringKeys<RxDocumentData<RxDocType>>;


    /**
     * Some PouchDB operations give wrong results when they run in parallel.
     * So we have to ensure they are queued up.
     */
    private nonParallelQueue: Promise<any> = PROMISE_RESOLVE_VOID;

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

        const eventSub = emitter.subject.subscribe(async (eventBulk) => {
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
        this.subs.forEach(sub => sub.unsubscribe());
        OPEN_POUCHDB_STORAGE_INSTANCES.delete(this);

        // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
        // await this.internals.pouch.close();
        return PROMISE_RESOLVE_VOID;
    }

    async remove() {
        this.subs.forEach(sub => sub.unsubscribe());

        OPEN_POUCHDB_STORAGE_INSTANCES.delete(this);
        await this.internals.pouch.destroy();
    }
    public async bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[]
    ): Promise<
        RxStorageBulkWriteResponse<RxDocType>
    > {
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
                    previousDocsInDb
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
        const attachmentData = await this.internals.pouch.getAttachment(
            documentId,
            attachmentId
        );
        const ret = await blobBufferUtil.toBase64String(attachmentData);
        return ret;
    }

    async findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>> {
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
            const retDocs: RxDocumentDataById<RxDocType> = {};
            this.nonParallelQueue = this.nonParallelQueue.then(async () => {
                const viaChanges = await this.internals.pouch.changes({
                    live: false,
                    since: 0,
                    doc_ids: ids,
                    style: 'all_docs'
                });
                await Promise.all(
                    viaChanges.results.map(async (result) => {
                        const firstDoc = await this.internals.pouch.get(
                            result.id,
                            {
                                rev: result.changes[0].rev,
                                deleted: 'ok',
                                style: 'all_docs'
                            }
                        );
                        const useFirstDoc = pouchDocumentDataToRxDocumentData(
                            this.primaryPath,
                            firstDoc
                        );
                        retDocs[result.id] = useFirstDoc;
                    })
                );
            });
            await this.nonParallelQueue;
            return retDocs;
        } else {
            const ret: RxDocumentDataById<RxDocType> = {};
            this.nonParallelQueue = this.nonParallelQueue.then(async () => {
                const pouchResult = await this.internals.pouch.allDocs({
                    include_docs: true,
                    keys: ids
                });
                pouchResult.rows
                    .filter(row => !!row.doc)
                    .forEach(row => {
                        let docData = row.doc;
                        docData = pouchDocumentDataToRxDocumentData(
                            this.primaryPath,
                            docData
                        );
                        ret[row.id] = docData;
                    });
            });
            await this.nonParallelQueue;
            return ret;
        }
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> {
        return this.changes$.asObservable();
    }

    cleanup(_minimumDeletedTime: number): Promise<boolean> {
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
        checkpoint?: PouchChangedDocumentsSinceCheckpoint
    ): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: PouchChangedDocumentsSinceCheckpoint;
    }[]> {
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

        const documentsData = await this.findDocumentsById(
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

        return changedDocuments.map(changeRow => {
            return {
                checkpoint: {
                    sequence: changeRow.sequence
                },
                document: getFromObjectOrThrow(documentsData, changeRow.id)
            };
        });
    }
}
