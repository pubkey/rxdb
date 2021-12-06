import type {
    ChangeEvent,
    DeterministicSortComparator,
    QueryMatcher
} from 'event-reduce-js';
import { ObliviousSet } from 'oblivious-set';
import {
    Observable,
    Subject,
    Subscription
} from 'rxjs';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import type {
    BlobBuffer,
    BulkWriteRow,
    ChangeStreamOnceOptions,
    MangoQuery,
    MangoQuerySortDirection,
    MangoQuerySortPart,
    PouchBulkDocResultRow,
    PouchChangesOptionsNonLive,
    PouchSettings,
    PouchWriteError,
    PreparedQuery,
    RxDocumentData,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorageBulkWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageQueryResult
} from '../../types';
import {
    getEventKey,
    OPEN_POUCHDB_STORAGE_INSTANCES,
    pouchChangeRowToChangeEvent,
    POUCHDB_DESIGN_PREFIX,
    POUCHDB_LOCAL_PREFIX,
    pouchDocumentDataToRxDocumentData,
    PouchStorageInternals,
    pouchSwapIdToPrimary,
    pouchSwapPrimaryToId,
    primarySwapPouchDbQuerySelector,
    rxDocumentDataToPouchDocumentData,
    writeAttachmentsToAttachments
} from './pouchdb-helper';
import {
    filterInMemoryFields,
    massageSelector
} from 'pouchdb-selector-core';
import {
    flatClone,
    getFromMapOrThrow,
    getHeightOfRevision,
    PROMISE_RESOLVE_VOID
} from '../../util';
import {
    getCustomEventEmitterByPouch
} from './custom-events-plugin';
import { getSchemaByObjectPath } from '../../rx-schema-helper';

export class RxStorageInstancePouch<RxDocType> implements RxStorageInstance<
    RxDocType,
    PouchStorageInternals,
    PouchSettings
> {

    private changes$: Subject<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = new Subject();
    private subs: Subscription[] = [];
    private emittedEventIds: ObliviousSet<string>;
    private primaryPath: keyof RxDocType;

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocType>>,
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
        const emitter = getCustomEventEmitterByPouch(this.internals.pouch);
        this.emittedEventIds = emitter.obliviousSet;
        const eventSub = emitter.subject.subscribe(async (ev) => {
            if (ev.writeOptions.hasOwnProperty('new_edits') && !ev.writeOptions.new_edits) {
                await Promise.all(
                    ev.writeDocs.map(async (writeDoc) => {
                        const id = writeDoc._id;

                        writeDoc = pouchDocumentDataToRxDocumentData(
                            this.primaryPath,
                            writeDoc
                        );

                        writeDoc._attachments = await writeAttachmentsToAttachments(writeDoc._attachments);

                        let previousDoc = ev.previousDocs.get(id);
                        if (previousDoc) {
                            previousDoc = pouchDocumentDataToRxDocumentData(
                                this.primaryPath,
                                previousDoc
                            );
                        }

                        if (
                            previousDoc &&
                            getHeightOfRevision(previousDoc._rev) > getHeightOfRevision(writeDoc._rev)
                        ) {
                            // not the newest revision was added
                            // TODO is comparing the height enough to compare revisions?
                            return;
                        }
                        if (!previousDoc && writeDoc._deleted) {
                            // deleted document was added as revision
                            return;
                        }

                        if (previousDoc && previousDoc._deleted && writeDoc._deleted) {
                            // delete document was deleted again
                            return;
                        }

                        let event: ChangeEvent<RxDocumentData<RxDocType>>;
                        if ((!previousDoc || previousDoc._deleted) && !writeDoc._deleted) {
                            // was insert
                            event = {
                                operation: 'INSERT',
                                doc: writeDoc,
                                id: id,
                                previous: null
                            };
                        } else if (writeDoc._deleted && previousDoc && !previousDoc._deleted) {
                            // was delete
                            previousDoc._rev = writeDoc._rev;
                            event = {
                                operation: 'DELETE',
                                doc: null,
                                id: id,
                                previous: previousDoc
                            };
                        } else if (
                            previousDoc
                        ) {
                            // was update
                            event = {
                                operation: 'UPDATE',
                                doc: writeDoc,
                                id: id,
                                previous: previousDoc
                            };
                        } else {
                            throw newRxError('SNH', { args: { writeDoc } });
                        }
                        this.addEventToChangeStream(
                            event,
                            ev.startTime,
                            ev.endTime
                        );
                    })
                );
                return;
            }


            /**
             * There is no write map given for internal pouchdb document writes
             * like it is done with replication.
             */
            if (!ev.writeOptions.custom) {
                const writeDocsById: Map<string, any> = new Map();
                ev.writeDocs.forEach(writeDoc => writeDocsById.set(writeDoc._id, writeDoc));

                await Promise.all(
                    ev.writeResult.map(async (resultRow) => {
                        const id = resultRow.id;
                        if (
                            id.startsWith(POUCHDB_DESIGN_PREFIX) ||
                            id.startsWith(POUCHDB_LOCAL_PREFIX)
                        ) {
                            return;
                        }
                        let writeDoc = getFromMapOrThrow(writeDocsById, resultRow.id);
                        writeDoc._attachments = await writeAttachmentsToAttachments(writeDoc._attachments);

                        writeDoc = flatClone(writeDoc);
                        writeDoc._rev = (resultRow as any).rev;
                        const event = pouchChangeRowToChangeEvent<RxDocType>(
                            this.primaryPath,
                            writeDoc
                        );
                        this.addEventToChangeStream(event);
                    })
                );

                return;
            }

            const writeMap: Map<string, BulkWriteRow<RxDocType>> = ev.writeOptions.custom.writeRowById;
            await Promise.all(
                ev.writeResult.map(async (resultRow) => {
                    if ((resultRow as PouchWriteError).error) {
                        return;
                    }

                    const id = resultRow.id;
                    const writeRow = getFromMapOrThrow(writeMap, id);
                    const newDoc = pouchDocumentDataToRxDocumentData(
                        this.primaryPath,
                        writeRow.document as any
                    );
                    newDoc._attachments = await writeAttachmentsToAttachments(newDoc._attachments);
                    newDoc._rev = (resultRow as PouchBulkDocResultRow).rev;

                    let event: ChangeEvent<RxDocumentData<RxDocType>>;
                    if (!writeRow.previous || writeRow.previous._deleted) {
                        // was insert
                        event = {
                            operation: 'INSERT',
                            doc: newDoc,
                            id: id,
                            previous: null
                        };
                    } else if (writeRow.document._deleted) {
                        // was delete

                        // we need to add the new revision to the previous doc
                        // so that the eventkey is calculated correctly.
                        // Is this a hack? idk.
                        const previousDoc = pouchDocumentDataToRxDocumentData(
                            this.primaryPath,
                            writeRow.previous as any
                        );
                        previousDoc._attachments = await writeAttachmentsToAttachments(previousDoc._attachments);
                        previousDoc._rev = (resultRow as PouchBulkDocResultRow).rev;

                        event = {
                            operation: 'DELETE',
                            doc: null,
                            id: resultRow.id,
                            previous: previousDoc
                        };
                    } else {
                        // was update
                        event = {
                            operation: 'UPDATE',
                            doc: newDoc,
                            id: resultRow.id,
                            previous: writeRow.previous
                        };
                    }

                    if (
                        writeRow.document._deleted &&
                        (
                            !writeRow.previous ||
                            writeRow.previous._deleted
                        )
                    ) {
                        /**
                         * A deleted document was newly added to the storage engine,
                         * do not emit an event.
                         */
                    } else {
                        this.addEventToChangeStream(
                            event,
                            ev.startTime,
                            ev.endTime
                        );
                    }

                })
            );
        });
        this.subs.push(eventSub);
    }

    private addEventToChangeStream(
        change: ChangeEvent<RxDocumentData<RxDocType>>,
        startTime?: number,
        endTime?: number
    ) {
        const doc: RxDocumentData<RxDocType> = change.operation === 'DELETE' ? change.previous as any : change.doc as any;
        const primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
        const primary: string = (doc as any)[primaryPath];

        const eventId = getEventKey(false, primary, doc._rev);

        if (this.emittedEventIds.has(eventId)) {
            return;
        }

        this.emittedEventIds.add(eventId);
        const storageChangeEvent: RxStorageChangeEvent<RxDocumentData<RxDocType>> = {
            eventId,
            documentId: primary,
            change,
            startTime,
            endTime
        };

        this.changes$.next(storageChangeEvent);
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

    public async bulkAddRevisions(
        documents: RxDocumentData<RxDocType>[]
    ): Promise<void> {
        if (documents.length === 0) {
            throw newRxError('P3', {
                args: {
                    documents
                }
            });
        }

        const writeData = documents.map(doc => {
            return rxDocumentDataToPouchDocumentData(
                this.primaryPath,
                doc
            );
        });

        // we do not need the response here because pouchdb returns an empty array on new_edits: false
        await this.internals.pouch.bulkDocs(
            writeData,
            {
                new_edits: false,
                set_new_edit_as_latest_revision: true
            }
        );
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

        const insertDocs: (RxDocType & { _id: string; _rev: string })[] = documentWrites.map(writeData => {
            const primary: string = (writeData.document as any)[this.primaryPath];
            writeRowById.set(primary, writeData);

            const storeDocumentData: any = rxDocumentDataToPouchDocumentData<RxDocType>(
                this.primaryPath,
                writeData.document
            );


            // if previous document exists, we have to send the previous revision to pouchdb.
            if (writeData.previous) {
                storeDocumentData._rev = writeData.previous._rev;
            }

            return storeDocumentData;
        });

        const pouchResult = await this.internals.pouch.bulkDocs(insertDocs, {
            custom: {
                writeRowById
            }
        } as any);

        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };

        await Promise.all(
            pouchResult.map(async (resultRow) => {
                const writeRow = getFromMapOrThrow(writeRowById, resultRow.id);
                if ((resultRow as PouchWriteError).error) {
                    const err: RxStorageBulkWriteError<RxDocType> = {
                        isError: true,
                        status: 409,
                        documentId: resultRow.id,
                        writeRow
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
    ): Promise<BlobBuffer> {
        const attachmentData = await this.internals.pouch.getAttachment(
            documentId,
            attachmentId
        );
        return attachmentData;
    }

    async findDocumentsById(ids: string[], deleted: boolean): Promise<{ [documentId: string]: RxDocumentData<RxDocType> }> {
        /**
         * On deleted documents, pouchdb will only return the tombstone.
         * So we have to get the properties directly for each document
         * with the hack of getting the changes and then make one request per document
         * with the latest revision.
         * TODO create an issue at pouchdb on how to get the document data of deleted documents,
         * when one past revision was written via new_edits=false
         * @link https://stackoverflow.com/a/63516761/3443137
         */
        if (deleted) {
            const viaChanges = await this.internals.pouch.changes({
                live: false,
                since: 0,
                doc_ids: ids,
                style: 'all_docs'
            });

            const retDocs: { [documentId: string]: RxDocumentData<RxDocType> } = {};
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
            return retDocs;
        }


        const pouchResult = await this.internals.pouch.allDocs({
            include_docs: true,
            keys: ids
        });

        const ret: { [documentId: string]: RxDocumentData<RxDocType> } = {};
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

        return ret;
    }

    changeStream(): Observable<RxStorageChangeEvent<RxDocumentData<RxDocType>>> {
        return this.changes$.asObservable();
    }

    async getChangedDocuments(
        options: ChangeStreamOnceOptions
    ): Promise<{
        changedDocuments: {
            id: string;
            sequence: number;
        }[];
        lastSequence: number;
    }> {
        const pouchChangesOpts: PouchChangesOptionsNonLive = {
            live: false,
            limit: options.limit,
            include_docs: false,
            since: options.sinceSequence,
            descending: options.direction === 'before' ? true : false
        };
        const pouchResults = await this.internals.pouch.changes(pouchChangesOpts);

        /**
         * TODO stripping the internal docs
         * results in having a non-full result set that maybe no longer
         * reaches the options.limit. We should fill up again
         * to ensure pagination works correctly.
         */
        const changedDocuments = pouchResults.results
            .filter(row => !row.id.startsWith(POUCHDB_DESIGN_PREFIX))
            .map(row => ({
                id: row.id,
                sequence: row.seq
            }));
        const lastSequence = pouchResults.last_seq;
        return {
            changedDocuments,
            lastSequence
        };
    }
}
