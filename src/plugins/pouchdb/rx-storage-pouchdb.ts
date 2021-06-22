import {
    filterInMemoryFields,
    massageSelector
} from 'pouchdb-selector-core';
import { binaryMd5 } from 'pouchdb-md5';
import { ObliviousSet } from 'oblivious-set';

import type {
    MangoQuery,
    MangoQuerySortPart,
    PouchDBInstance,
    PouchSettings,
    MangoQuerySortDirection,
    RxStorageBulkWriteResponse,
    RxJsonSchema,
    RxLocalDocumentData,
    RxStorageBulkWriteError,
    PouchWriteError,
    PouchBulkDocResultRow,
    RxStorageQueryResult,
    RxStorageInstanceCreationParams,
    ChangeStreamEvent,
    ChangeStreamOnceOptions,
    PouchChangeRow,
    RxLocalStorageBulkWriteResponse,
    RxDocumentData,
    WithAttachments,
    RxDocumentWriteData,
    RxAttachmentWriteData,
    RxAttachmentData,
    BlobBuffer,
    PreparedQuery,
    RxStorage,
    RxStorageInstance,
    RxStorageKeyObjectInstance,
    BulkWriteRow,
    BulkWriteLocalRow,
    RxStorageBulkWriteLocalError,
    RxStorageChangeEvent,
    PouchChangesOptionsNonLive,
} from '../../types';

import type {
    CompareFunction
} from 'array-push-at-sort-position';
import {
    flatClone,
    adapterObject,
    getFromMapOrThrow,
    getHeightOfRevision,
    promiseWait,
    blobBufferUtil,
    now
} from '../../util';
import type {
    SortComparator,
    QueryMatcher,
    ChangeEvent
} from 'event-reduce-js';
import {
    isLevelDown,
    PouchDB
} from './pouch-db';
import { newRxError } from '../../rx-error';

import {
    Observable,
    Subject,
    Subscription
} from 'rxjs';
import { getSchemaByObjectPath } from '../../rx-schema-helper';
import { getCustomEventEmitterByPouch } from './custom-events-plugin';

/**
 * prefix of local pouchdb documents
 */
export const POUCHDB_LOCAL_PREFIX: '_local/' = '_local/';
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */
export const POUCHDB_DESIGN_PREFIX: '_design/' = '_design/';

export type PouchStorageInternals = {
    pouch: PouchDBInstance;
};

/**
 * Used to check in tests if all instances have been cleaned up.
 */
export const OPEN_POUCHDB_STORAGE_INSTANCES: Set<RxStorageKeyObjectInstancePouch | RxStorageInstancePouch<any>> = new Set();

export class RxStorageKeyObjectInstancePouch implements RxStorageKeyObjectInstance<PouchStorageInternals, PouchSettings> {

    private changes$: Subject<RxStorageChangeEvent<RxLocalDocumentData>> = new Subject();

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly internals: Readonly<PouchStorageInternals>,
        public readonly options: Readonly<PouchSettings>
    ) {
        OPEN_POUCHDB_STORAGE_INSTANCES.add(this);
    }

    close(): Promise<void> {
        OPEN_POUCHDB_STORAGE_INSTANCES.delete(this);
        // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
        // await this.internals.pouch.close();
        return Promise.resolve();
    }

    async remove() {
        await this.internals.pouch.destroy();
    }

    public async bulkWrite<D = any>(
        documentWrites: BulkWriteLocalRow<D>[]
    ): Promise<RxLocalStorageBulkWriteResponse<D>> {
        const writeRowById: Map<string, BulkWriteLocalRow<D>> = new Map();

        const insertDocs: RxLocalDocumentData<D>[] = documentWrites.map(writeRow => {
            writeRowById.set(writeRow.document._id, writeRow);
            const storeDocumentData = flatClone(writeRow.document);

            /**
             * add local prefix
             * Local documents always have _id as primary
             */
            storeDocumentData._id = POUCHDB_LOCAL_PREFIX + storeDocumentData._id;

            // if previous document exists, we have to send the previous revision to pouchdb.
            if (writeRow.previous) {
                storeDocumentData._rev = writeRow.previous._rev;
            }

            return storeDocumentData;
        });

        const startTime = now();
        const pouchResult = await this.internals.pouch.bulkDocs(insertDocs);
        const endTime = now();
        const ret: RxLocalStorageBulkWriteResponse<D> = {
            success: new Map(),
            error: new Map()
        };

        pouchResult.forEach(resultRow => {
            resultRow.id = pouchStripLocalFlagFromPrimary(resultRow.id);
            const writeRow = getFromMapOrThrow(writeRowById, resultRow.id);
            if ((resultRow as PouchWriteError).error) {
                const err: RxStorageBulkWriteLocalError<D> = {
                    isError: true,
                    status: 409,
                    documentId: resultRow.id,
                    writeRow
                };
                ret.error.set(resultRow.id, err);
            } else {
                const pushObj: RxLocalDocumentData<D> = flatClone(writeRow.document);
                pushObj._rev = (resultRow as PouchBulkDocResultRow).rev;
                // local document cannot have attachments
                pushObj._attachments = {};
                ret.success.set(resultRow.id, pushObj as any);

                /**
                 * Emit a write event to the changestream.
                 * We do this here and not by observing the internal pouchdb changes
                 * because here we have the previous document data and do
                 * not have to fill previous with 'UNKNOWN'.
                 */
                let event: ChangeEvent<RxLocalDocumentData<D>>;
                if (!writeRow.previous) {
                    // was insert
                    event = {
                        operation: 'INSERT',
                        doc: pushObj,
                        id: resultRow.id,
                        previous: null
                    };
                } else if (writeRow.document._deleted) {
                    // was delete

                    // we need to add the new revision to the previous doc
                    // so that the eventkey is calculated correctly.
                    // Is this a hack? idk.
                    const previousDoc = flatClone(writeRow.previous);
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
                        doc: pushObj,
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

                    const doc: RxLocalDocumentData<D> = event.operation === 'DELETE' ? event.previous as any : event.doc as any;
                    const eventId = getEventKey(true, doc._id, doc._rev ? doc._rev : '');

                    const storageChangeEvent: RxStorageChangeEvent<RxLocalDocumentData<D>> = {
                        eventId,
                        documentId: resultRow.id,
                        change: event,
                        startTime,
                        endTime
                    };


                    this.changes$.next(storageChangeEvent);
                }

            }


        });



        return ret;
    }

    async findLocalDocumentsById<D = any>(ids: string[]): Promise<Map<string, RxLocalDocumentData<D>>> {
        const ret = new Map();

        /**
         * Pouchdb is not able to bulk-request local documents
         * with the pouch.allDocs() method.
         * so we need to get each by a single call.
         * TODO create an issue at the pouchdb repo
         */
        await Promise.all(
            ids.map(async (id) => {
                const prefixedId = POUCHDB_LOCAL_PREFIX + id;
                try {
                    const docData = await this.internals.pouch.get(prefixedId);
                    docData._id = id;
                    ret.set(id, docData);
                } catch (err) {
                    // do not add to result list on error
                }
            })
        );
        return ret;
    }

    changeStream(): Observable<RxStorageChangeEvent<RxLocalDocumentData>> {
        return this.changes$.asObservable();
    }
}

export class RxStorageInstancePouch<RxDocType> implements RxStorageInstance<
    RxDocType,
    PouchStorageInternals,
    PouchSettings
> {

    private changes$: Subject<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = new Subject();
    private subs: Subscription[] = [];
    private emittedEventIds: ObliviousSet<string>;

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocType>>,
        public readonly internals: Readonly<PouchStorageInternals>,
        public readonly options: Readonly<PouchSettings>
    ) {
        OPEN_POUCHDB_STORAGE_INSTANCES.add(this);


        /**
         * Instead of listening to pouch.changes,
         * we have overwritten pouchdbs bulkDocs()
         * and create our own event stream, this will work more relyable
         * and does not mix up with write events from other sources.
         */
        const emitter = getCustomEventEmitterByPouch(this.internals.pouch);
        this.emittedEventIds = emitter.obliviousSet;
        const eventSub = emitter.subject.subscribe(async (ev) => {

            console.log('emitter emitted:');
            console.dir(ev);

            if (ev.writeOptions.hasOwnProperty('new_edits') && !ev.writeOptions.new_edits) {
                await Promise.all(
                    ev.writeDocs.map(async (writeDoc) => {
                        const id = writeDoc._id;
                        writeDoc = pouchDocumentDataToRxDocumentData(
                            this.schema.primaryKey,
                            writeDoc
                        );
                        writeDoc._attachments = await writeAttachmentsToAttachments(writeDoc._attachments);

                        let previousDoc = ev.previousDocs.get(id);
                        if (previousDoc) {
                            previousDoc = pouchDocumentDataToRxDocumentData(
                                this.schema.primaryKey,
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
                        if (!previousDoc && !writeDoc._deleted) {
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
                        const writeDoc = getFromMapOrThrow(writeDocsById, resultRow.id);
                        writeDoc._attachments = await writeAttachmentsToAttachments(writeDoc._attachments);

                        const event = pouchChangeRowToChangeEvent<RxDocType>(
                            this.schema.primaryKey,
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
                        this.schema.primaryKey,
                        writeRow.document as any
                    );
                    newDoc._attachments = await writeAttachmentsToAttachments(newDoc._attachments);
                    newDoc._rev = (resultRow as PouchBulkDocResultRow).rev;

                    let event: ChangeEvent<RxDocumentData<RxDocType>>;
                    if (!writeRow.previous) {
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
                            this.schema.primaryKey,
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
        const primaryKey = this.schema.primaryKey;
        const primary: string = (doc as any)[primaryKey];
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
        return Promise.resolve();
    }

    async remove() {
        await this.internals.pouch.destroy();
    }

    getSortComparator(
        query: MangoQuery<RxDocType>
    ): SortComparator<RxDocType> {
        const primaryKey = this.schema.primaryKey;
        const sortOptions: MangoQuerySortPart[] = query.sort ? query.sort : [{
            [primaryKey]: 'asc'
        }];
        const massagedSelector = massageSelector(query.selector);
        const inMemoryFields = Object.keys(query.selector);
        const fun: CompareFunction<RxDocType> = (a: RxDocType, b: RxDocType) => {
            // TODO use createFieldSorter
            // TODO make a performance test
            const rows = [a, b].map(doc => {
                // swap primary to _id
                const cloned: any = flatClone(doc);
                const primaryValue = cloned[primaryKey];
                delete cloned[primaryKey];
                cloned._id = primaryValue;
                return {
                    doc: cloned
                };
            });
            const sortedRows: { doc: any }[] = filterInMemoryFields(
                rows,
                {
                    selector: massagedSelector,
                    sort: sortOptions
                },
                inMemoryFields
            );
            if (sortedRows[0].doc._id === rows[0].doc._id) {
                return -1;
            } else {
                return 1;
            }
        };
        return fun;
    }


    /**
     * @link https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-selector-core/src/matches-selector.js
     */
    getQueryMatcher(
        query: MangoQuery<RxDocType>
    ): QueryMatcher<RxDocType> {
        const primaryKey = this.schema.primaryKey;
        const massagedSelector = massageSelector(query.selector);

        const fun: QueryMatcher<RxDocType> = (doc: RxDocType) => {
            const cloned = pouchSwapPrimaryToId(primaryKey, doc);
            const row = {
                doc: cloned
            };
            const rowsMatched = filterInMemoryFields(
                [row],
                { selector: massagedSelector },
                Object.keys(query.selector)
            );
            const ret = rowsMatched && rowsMatched.length === 1;
            return ret;
        };
        return fun;
    }


    /**
     * pouchdb has many bugs and strange behaviors
     * this functions takes a normal mango query
     * and transforms it to one that fits for pouchdb
     */
    prepareQuery(
        mutateableQuery: MangoQuery<RxDocType>
    ): PreparedQuery<RxDocType> {
        const primaryKey = this.schema.primaryKey;
        const query = mutateableQuery;

        /**
         * because sort wont work on unused keys we have to workaround
         * so we add the key to the selector if necessary
         * @link https://github.com/nolanlawson/pouchdb-find/issues/204
         */
        if (query.sort) {
            query.sort.forEach(sortPart => {
                const key = Object.keys(sortPart)[0];
                const comparisonOperators = ['$gt', '$gte', '$lt', '$lte'];
                const keyUsed = query.selector[key] && Object.keys(query.selector[key]).some(op => comparisonOperators.includes(op)) || false;
                if (!keyUsed) {
                    const schemaObj = getSchemaByObjectPath(this.schema, key);
                    if (!schemaObj) {
                        throw newRxError('QU5', {
                            key
                        });
                    }
                    if (!query.selector[key]) {
                        query.selector[key] = {};
                    }
                    switch (schemaObj.type) {
                        case 'number':
                        case 'integer':
                            // TODO change back to -Infinity when issue resolved
                            // @link https://github.com/pouchdb/pouchdb/issues/6454
                            // -Infinity does not work since pouchdb 6.2.0
                            query.selector[key].$gt = -9999999999999999999999999999;
                            break;
                        case 'string':
                            /**
                             * strings need an empty string, see
                             * @link https://github.com/pubkey/rxdb/issues/585
                             */
                            if (typeof query.selector[key] !== 'string') {
                                query.selector[key].$gt = '';
                            }
                            break;
                        default:
                            query.selector[key].$gt = null;
                            break;
                    }
                }
            });
        }

        // regex does not work over the primary key
        // TODO move this to dev mode
        if (query.selector[primaryKey as any] && query.selector[primaryKey as any].$regex) {
            throw newRxError('QU4', {
                path: primaryKey as any,
                query: mutateableQuery
            });
        }

        // primary-swap sorting
        if (query.sort) {
            const sortArray: MangoQuerySortPart<RxDocType>[] = query.sort.map(part => {
                const key = Object.keys(part)[0];
                const direction: MangoQuerySortDirection = Object.values(part)[0];
                const useKey = key === primaryKey ? '_id' : key;
                const newPart = { [useKey]: direction };
                return newPart as any;
            });
            query.sort = sortArray;
        }

        // strip empty selectors
        Object.entries(query.selector).forEach(([k, v]) => {
            if (
                typeof v === 'object' &&
                v !== null &&
                !Array.isArray(v) &&
                Object.keys((v as any)).length === 0
            ) {
                delete query.selector[k];
            }
        });

        query.selector = primarySwapPouchDbQuerySelector(query.selector, primaryKey);

        return query;
    }

    public async bulkAddRevisions(
        documents: RxDocumentData<RxDocType>[]
    ): Promise<void> {
        console.log('bulkAddRevisions():');
        console.dir(documents);
        const writeData = documents.map(doc => {
            return pouchSwapPrimaryToId(
                this.schema.primaryKey,
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
        const primaryKey = this.schema.primaryKey;
        const writeRowById: Map<string, BulkWriteRow<RxDocType>> = new Map();

        const insertDocs: (RxDocType & { _id: string; _rev: string })[] = documentWrites.map(writeData => {
            const primary: string = (writeData.document as any)[primaryKey];
            writeRowById.set(primary, writeData);

            const storeDocumentData: any = rxDocumentDataToPouchDocumentData<RxDocType>(
                primaryKey,
                writeData.document
            );

            // if previous document exists, we have to send the previous revision to pouchdb.
            if (writeData.previous) {
                storeDocumentData._rev = writeData.previous._rev;
            }

            return storeDocumentData;
        });

        console.log('pouch.bulkDocs:');
        console.dir(insertDocs);
        const pouchResult = await this.internals.pouch.bulkDocs(insertDocs, {
            custom: {
                writeRowById
            }
        } as any);

        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: new Map(),
            error: new Map()
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
                    ret.error.set(resultRow.id, err);
                } else {
                    let pushObj: RxDocumentData<RxDocType> = flatClone(writeRow.document) as any;
                    pushObj = pouchSwapIdToPrimary(primaryKey, pushObj);
                    pushObj._rev = (resultRow as PouchBulkDocResultRow).rev;

                    // replace the inserted attachments with their diggest
                    pushObj._attachments = {};
                    if (!writeRow.document._attachments) {
                        writeRow.document._attachments = {};
                    } else {
                        pushObj._attachments = await writeAttachmentsToAttachments(writeRow.document._attachments);
                    }
                    ret.success.set(resultRow.id, pushObj);
                }
            })
        );


        /**
         * We have to always await two ticks
         * to ensure pouchdb fires the write to the event stream
         * and does not miss out when multiple writes happen to the same document.
         */
        await promiseWait(0).then(() => promiseWait(0));

        return ret;
    }

    public async query(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {
        const primaryKey = this.schema.primaryKey;

        const findResult = await this.internals.pouch.find<RxDocType>(preparedQuery);
        const ret: RxStorageQueryResult<RxDocType> = {
            documents: findResult.docs.map(pouchDoc => {
                const useDoc = pouchDocumentDataToRxDocumentData(
                    primaryKey,
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

    async findDocumentsById(ids: string[], deleted: boolean): Promise<Map<string, RxDocumentData<RxDocType>>> {
        const primaryKey = this.schema.primaryKey;
        console.log('findDocumentsById(deleted: ' + deleted + ', ids: ' + ids.join(', ') + ')');


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
            console.log('viaChanges:');
            console.log(JSON.stringify(viaChanges, null, 4));

            const retDocs = new Map();
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
                    console.log('firstDoc: ' + result.id);
                    console.dir(firstDoc);
                    const useFirstDoc = pouchDocumentDataToRxDocumentData(
                        primaryKey,
                        firstDoc
                    );
                    console.dir(useFirstDoc);
                    retDocs.set(result.id, useFirstDoc);
                })
            );
            console.log('findDocumentsById(deleted: ' + deleted + ') ret:');
            console.dir(retDocs);
            return retDocs;
        }


        const pouchResult = await this.internals.pouch.allDocs({
            include_docs: true,
            keys: ids
        });
        console.log('findDocumentsById(deleted: ' + deleted + ') pouchResult:');
        console.log(JSON.stringify(pouchResult, null, 4));





        const ret = new Map();
        pouchResult.rows
            .filter(row => !!row.doc)
            .forEach(row => {
                let docData = row.doc;
                docData = pouchDocumentDataToRxDocumentData(
                    primaryKey,
                    docData
                );
                ret.set(row.id, docData);
            });

        console.log('findDocumentsById(' + ids.join(', ') + ') result:');
        console.dir(ret);

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
            since: options.startSequence,
            descending: options.order === 'desc' ? true : false
        };
        const pouchResults = await this.internals.pouch.changes(pouchChangesOpts);
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

export class RxStoragePouch implements RxStorage<PouchStorageInternals, PouchSettings> {
    public name: string = 'pouchdb';

    constructor(
        public adapter: any,
        public pouchSettings: PouchSettings = {}
    ) {
        checkPouchAdapter(adapter);
    }

    /**
     * create the same diggest as an attachment with that data
     * would have created by pouchdb internally.
     */
    public hash(data: Buffer | Blob | string): Promise<string> {
        return pouchHash(data);
    }

    private async createPouch(
        location: string,
        options: PouchSettings
    ): Promise<PouchDBInstance> {


        const pouchDbParameters = {
            location: location,
            adapter: adapterObject(this.adapter),
            settings: options
        };
        const pouchDBOptions = Object.assign(
            {},
            pouchDbParameters.adapter,
            this.pouchSettings,
            pouchDbParameters.settings
        );

        const pouch = new PouchDB(
            pouchDbParameters.location,
            pouchDBOptions
        ) as PouchDBInstance;

        /**
         * In the past we found some errors where the PouchDB is not directly useable
         * so we we had to call .info() first to ensure it can be used.
         * I commented this out for now to get faster database/collection creation.
         * We might have to add this again if something fails.
         */
        // await pouch.info();

        return pouch;
    }

    public async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, PouchSettings>
    ): Promise<RxStorageInstancePouch<RxDocType>> {
        const pouchLocation = getPouchLocation(
            params.databaseName,
            params.collectionName,
            params.schema.version
        );
        const pouch = await this.createPouch(
            pouchLocation,
            params.options
        );

        await createIndexesOnPouch(pouch, params.schema);

        return new RxStorageInstancePouch(
            params.databaseName,
            params.collectionName,
            params.schema,
            {
                pouch
            },
            params.options
        );
    }

    public async createKeyObjectStorageInstance(
        databaseName: string,
        collectionName: string,
        options: PouchSettings
    ): Promise<RxStorageKeyObjectInstancePouch> {
        const useOptions = flatClone(options);
        // no compaction because this only stores local documents
        useOptions.auto_compaction = false;
        useOptions.revs_limit = 1;

        const pouchLocation = getPouchLocation(
            databaseName,
            collectionName,
            0
        );
        const pouch = await this.createPouch(
            pouchLocation,
            options
        );

        return new RxStorageKeyObjectInstancePouch(
            databaseName,
            collectionName,
            {
                pouch
            },
            options
        );
    }
}


export async function writeAttachmentsToAttachments(
    attachments: { [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData; }
): Promise<{ [attachmentId: string]: RxAttachmentData; }> {
    if (!attachments) {
        return {};
    }
    const ret: { [attachmentId: string]: RxAttachmentData; } = {};
    await Promise.all(
        Object.entries(attachments).map(async ([key, obj]) => {
            if (!obj.type) {
                throw newRxError('SNH', { args: obj });
            }
            if ((obj as RxAttachmentWriteData).data) {
                const asWrite = (obj as RxAttachmentWriteData);

                const hash = await pouchHash(asWrite.data);
                const asString = await blobBufferUtil.toString(asWrite.data);
                const length = asString.length;
                ret[key] = {
                    digest: hash,
                    length,
                    type: asWrite.type
                };
            } else {
                ret[key] = obj as RxAttachmentData;
            }
        })
    );
    return ret;
}


/**
 * Checks if all is ok with the given adapter,
 * else throws an error.
 */
export function checkPouchAdapter(adapter: string | any) {
    if (typeof adapter === 'string') {
        // TODO make a function hasAdapter()
        if (!(PouchDB as any).adapters || !(PouchDB as any).adapters[adapter]) {
            throw newRxError('DB9', {
                adapter
            });
        }
    } else {
        isLevelDown(adapter);
        if (!(PouchDB as any).adapters || !(PouchDB as any).adapters.leveldb) {
            throw newRxError('DB10', {
                adapter
            });
        }
    }
}

export function pouchHash(data: Buffer | Blob | string): Promise<string> {
    return new Promise(res => {
        binaryMd5(data, (digest: string) => {
            res('md5-' + digest);
        });
    });
}

export function pouchSwapIdToPrimary<T>(
    primaryKey: keyof T,
    docData: any
): any {

    if (primaryKey === '_id' || docData[primaryKey]) {
        return docData;
    }
    docData = flatClone(docData);
    docData[primaryKey] = docData._id;
    delete docData._id;

    return docData;
}

export function pouchDocumentDataToRxDocumentData<T>(
    primaryKey: keyof T,
    pouchDoc: WithAttachments<T>
): RxDocumentData<T> {
    let useDoc: RxDocumentData<T> = pouchSwapIdToPrimary(primaryKey, pouchDoc);

    // always flat clone becaues we mutate the _attachments property.
    useDoc = flatClone(useDoc);
    delete (useDoc as any)._revisions;

    useDoc._attachments = {};
    if (pouchDoc._attachments) {
        Object.entries(pouchDoc._attachments).forEach(([key, value]) => {
            if ((value as any).data) {
                useDoc._attachments[key] = {
                    data: (value as any).data,
                    type: (value as any).type
                } as any;
            } else {
                useDoc._attachments[key] = {
                    digest: value.digest,
                    // TODO why do we need to access value.type?
                    type: (value as any).type ? (value as any).type : value.content_type,
                    length: value.length
                };
            }
        });
    }

    return useDoc;
}

export function rxDocumentDataToPouchDocumentData<T>(
    primaryKey: keyof T,
    doc: RxDocumentData<T> | RxDocumentWriteData<T>
): WithAttachments<T & { _id: string; }> {
    let pouchDoc: WithAttachments<T> = pouchSwapPrimaryToId(primaryKey, doc);

    // always flat clone becaues we mutate the _attachments property.
    pouchDoc = flatClone(pouchDoc);

    pouchDoc._attachments = {};
    if (doc._attachments) {
        Object.entries(doc._attachments).forEach(([key, value]) => {
            const useValue: RxAttachmentWriteData & RxAttachmentData = value as any;
            if (useValue.data) {
                (pouchDoc as any)._attachments[key] = {
                    data: useValue.data,
                    content_type: useValue.type
                };
            } else {
                (pouchDoc as any)._attachments[key] = {
                    digest: useValue.digest,
                    content_type: useValue.type,
                    length: useValue.length,
                    stub: true
                };
            }
        });
    }

    return pouchDoc as any;
}


export function pouchSwapPrimaryToId<RxDocType>(
    primaryKey: keyof RxDocType,
    docData: any
): any {
    if (primaryKey === '_id') {
        return docData;
    }
    const ret: any = {};
    Object
        .entries(docData)
        .forEach(entry => {
            const newKey = entry[0] === primaryKey ? '_id' : entry[0];
            ret[newKey] = entry[1];
        });
    return ret;
}

/**
 * in:  '_local/foobar'
 * out: 'foobar'
 */
export function pouchStripLocalFlagFromPrimary(str: string): string {
    return str.substring(POUCHDB_LOCAL_PREFIX.length);
}

export function getEventKey(isLocal: boolean, primary: string, revision: string): string {

    if (!primary) {
        throw new Error('primary missing !!');
    }
    const prefix = isLocal ? 'local' : 'non-local';
    const eventKey = prefix + '|' + primary + '|' + revision;
    return eventKey;
}

export function pouchChangeRowToChangeEvent<DocumentData>(
    primaryKey: keyof DocumentData,
    pouchDoc: any
): ChangeEvent<RxDocumentData<DocumentData>> {
    if (!pouchDoc) {
        throw newRxError('SNH', { args: { pouchDoc } });
    }
    const id = pouchDoc._id;

    const doc = pouchDocumentDataToRxDocumentData<DocumentData>(
        primaryKey,
        pouchDoc as any
    );
    const revHeight = getHeightOfRevision(doc._rev);

    if (pouchDoc._deleted) {
        return {
            operation: 'DELETE',
            id,
            doc: null,
            previous: doc
        };
    } else if (revHeight === 1) {
        return {
            operation: 'INSERT',
            id,
            doc,
            previous: null
        };
    } else {
        return {
            operation: 'UPDATE',
            id,
            doc: doc,
            previous: 'UNKNOWN'
        };
    }
}

export function pouchChangeRowToChangeStreamEvent<DocumentData>(
    primaryKey: keyof DocumentData,
    pouchRow: PouchChangeRow
): ChangeStreamEvent<DocumentData> {
    const doc = pouchRow.doc;
    if (!doc) {
        throw newRxError('SNH', { args: { pouchRow } });
    }
    const revHeight = getHeightOfRevision(doc._rev);

    console.log('pouchChangeRowToChangeStreamEvent():');
    console.dir(pouchRow);

    if (pouchRow.deleted) {
        const previousDoc = flatClone(
            pouchDocumentDataToRxDocumentData(
                primaryKey,
                pouchRow.doc as any
            )
        );
        delete previousDoc._deleted;
        const ev: ChangeStreamEvent<DocumentData> = {
            sequence: pouchRow.seq,
            id: pouchRow.id,
            operation: 'DELETE',
            doc: null,
            previous: previousDoc
        };
        console.dir(ev);
        return ev;
    } else if (revHeight === 1) {
        const ev: ChangeStreamEvent<DocumentData> = {
            sequence: pouchRow.seq,
            id: pouchRow.id,
            operation: 'INSERT',
            doc: pouchDocumentDataToRxDocumentData(
                primaryKey,
                pouchRow.doc as any
            ),
            previous: null
        };
        console.dir(ev);
        return ev;
    } else {
        const ev: ChangeStreamEvent<DocumentData> = {
            sequence: pouchRow.seq,
            id: pouchRow.id,
            operation: 'UPDATE',
            doc: pouchDocumentDataToRxDocumentData(
                primaryKey,
                pouchRow.doc as any
            ),
            previous: 'UNKNOWN'
        };
        console.dir(ev);
        return ev;
    }
}


/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */
export function primarySwapPouchDbQuerySelector<RxDocType>(selector: any, primaryKey: keyof RxDocType): any {
    if (primaryKey === '_id') {
        return selector;
    }
    if (Array.isArray(selector)) {
        return selector.map(item => primarySwapPouchDbQuerySelector(item, primaryKey));
    } else if (typeof selector === 'object') {
        const ret: any = {};
        Object.entries(selector).forEach(([k, v]) => {
            if (k === primaryKey) {
                ret._id = v;
            } else {
                if (k.startsWith('$')) {
                    ret[k] = primarySwapPouchDbQuerySelector(v, primaryKey);
                } else {
                    ret[k] = v;
                }
            }
        });
        return ret;
    } else {
        return selector;
    }
}


/**
 * Creates the indexes of the schema inside of the pouchdb instance.
 * Will skip indexes that already exist.
 */
export async function createIndexesOnPouch(
    pouch: PouchDBInstance,
    schema: RxJsonSchema<any>
): Promise<void> {
    if (!schema.indexes) {
        return;
    }

    const primaryKey = schema.primaryKey;
    const before = await pouch.getIndexes();
    const existingIndexes: Set<string> = new Set(
        before.indexes.map(idx => idx.name)
    );

    await Promise.all(
        schema.indexes.map(async (indexMaybeArray) => {
            let indexArray: string[] = Array.isArray(indexMaybeArray) ? indexMaybeArray : [indexMaybeArray];

            /**
             * replace primary key with _id
             * because that is the enforced primary key on pouchdb.
             */
            indexArray = indexArray.map(key => {
                if (key === primaryKey) {
                    return '_id';
                } else {
                    return key;
                }
            });

            const indexName = 'idx-rxdb-index-' + indexArray.join(',');
            if (existingIndexes.has(indexName)) {
                // index already exists
                return;
            }
            /**
             * TODO we might have even better performance by doing a bulkDocs
             * on index creation
             */
            return pouch.createIndex({
                name: indexName,
                ddoc: indexName,
                index: {
                    fields: indexArray
                }
            });
        })
    );
}

/**
 * returns the pouchdb-database-name
 */
export function getPouchLocation(
    dbName: string,
    collectionName: string,
    schemaVersion: number
): string {
    const prefix = dbName + '-rxdb-' + schemaVersion + '-';
    if (!collectionName.includes('/')) {
        return prefix + collectionName;
    } else {
        // if collectionName is a path, we have to prefix the last part only
        const split = collectionName.split('/');
        const last = split.pop();

        let ret = split.join('/');
        ret += '/' + prefix + last;
        return ret;
    }
}

export function getRxStoragePouch(
    adapter: any,
    pouchSettings?: PouchSettings
): RxStoragePouch {
    if (!adapter) {
        throw new Error('adapter missing');
    }
    const storage = new RxStoragePouch(adapter, pouchSettings);
    return storage;
}
