/*
 * Instead of listening to pouch.changes,
 * we overwrite pouchdbs bulkDocs()
 * and create our own event stream, this will work more reliable
 * and has less strange behaviors.
 * Also we can better define what data we need for our events.
 * @link http://jsbin.com/pagebi/1/edit?js,output
 * @link https://github.com/pubkey/rxdb/blob/1f4115b69bdacbb853af9c637d70f5f184d4e474/src/rx-storage-pouchdb.ts#L273
 * @link https://hasura.io/blog/couchdb-style-conflict-resolution-rxdb-hasura/
 */

import type {
    BulkWriteRow,
    EventBulk,
    PouchBulkDocOptions,
    PouchBulkDocResultRow,
    PouchChangesOnChangeEvent,
    PouchCheckpoint,
    PouchDBInstance,
    PouchWriteError,
    RxDocumentData,
    RxStorageChangeEvent
} from '../../types';
import PouchDBCore from 'pouchdb-core';
import { Subject } from 'rxjs';
import {
    ensureNotFalsy,
    flatClone,
    getFromMapOrThrow,
    now,
    parseRevision,
    PROMISE_RESOLVE_VOID,
    randomCouchString
} from '../../util';
import { newRxError } from '../../rx-error';
import {
    getEventKey,
    pouchChangeRowToChangeEvent,
    POUCHDB_DESIGN_PREFIX,
    POUCHDB_LOCAL_PREFIX,
    pouchDocumentDataToRxDocumentData,
    writeAttachmentsToAttachments
} from './pouchdb-helper';
import type { ChangeEvent } from 'event-reduce-js';

// ensure only added once
let addedToPouch = false;

declare type EmitData = {
    emitId: number;
    writeOptions: PouchBulkDocOptions;
    writeDocs: any[];
    writeResult: (PouchBulkDocResultRow | PouchWriteError)[];
    // used on new_edits=false to check if the last revision has changed
    previousDocs: Map<string, any>;
    startTime: number;
    endTime: number;
};


declare type Emitter<RxDocType> = {
    subject: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, PouchCheckpoint>>;
};
export const EVENT_EMITTER_BY_POUCH_INSTANCE: Map<string, Emitter<any>> = new Map();

export function getCustomEventEmitterByPouch<RxDocType>(
    pouch: PouchDBInstance
): Emitter<RxDocType> {
    const key = [
        pouch.__opts.name,
        pouch.adapter
    ].join('|');
    let emitter = EVENT_EMITTER_BY_POUCH_INSTANCE.get(key);
    if (!emitter) {
        emitter = {
            subject: new Subject()
        };
        EVENT_EMITTER_BY_POUCH_INSTANCE.set(key, emitter);
    }
    return emitter;
}


/**
 * Counter, used to debug stuff.
 */
let i = 0;


/**
 * Because we cannot force pouchdb to await bulkDocs runs
 * inside of a transaction, like done with the other RxStorage implementations,
 * we have to ensure the calls to bulkDocs() do not run in parallel.
 *
 * TODO this is somehow a hack. Instead of doing that, inspect how
 * PouchDB runs bulkDocs internally and adapt that transaction handling.
 */
const BULK_DOC_RUN_QUEUE: WeakMap<PouchDBInstance, Promise<any>> = new WeakMap();

/**
 * PouchDB is like a minefield,
 * where stuff randomly does not work dependent on some conditions.
 * So instead of doing plain writes,
 * we hack into the bulkDocs() function
 * and adjust the behavior accordingly.
 */
export function addCustomEventsPluginToPouch() {
    if (addedToPouch) {
        return;
    }
    addedToPouch = true;

    const oldBulkDocs: any = PouchDBCore.prototype.bulkDocs;

    /**
     * Ensure we do not run bulkDocs() in parallel on the same PouchDB instance.
     */
    const newBulkDocs = function (
        this: PouchDBInstance,
        body: any[] | { docs: any[]; new_edits?: boolean; },
        options: PouchBulkDocOptions,
        callback: Function
    ) {

        /**
         * Normalize inputs
         * because there are many ways to call pouchdb.bulkDocs()
         */
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (!options) {
            options = {};
        }


        /**
         * PouchDB internal requests
         * must still be handled normally
         * to decrease the likelyness of bugs.
         */
        const internalPouches = [
            '_replicator',
            '_users',
            'pouch__all_dbs__'
        ];
        if (
            (
                internalPouches.includes(this.name) ||
                this.name.includes('-mrview-')
            )
        ) {
            return oldBulkDocs.call(
                this,
                body,
                options,
                (err: any, result: (PouchBulkDocResultRow | PouchWriteError)[]) => {
                    if (err) {
                        if (callback) {
                            callback(err, null);
                        }
                    } else {
                        if (callback) {
                            callback(null, result);
                        }
                    }
                });
        }


        let queue = BULK_DOC_RUN_QUEUE.get(this);
        if (!queue) {
            queue = PROMISE_RESOLVE_VOID;
        }
        queue = queue.then(async () => {
            const ret = await newBulkDocsInner.bind(this)(
                body,
                options,
                callback
            );
            return ret;
        });
        BULK_DOC_RUN_QUEUE.set(this, queue);
        return queue;
    };


    const newBulkDocsInner = async function (
        this: PouchDBInstance,
        body: any[] | { docs: any[]; new_edits?: boolean; },
        options: PouchBulkDocOptions,
        callback: Function
    ) {
        const startTime = now();
        const runId = i++;

        /**
         * Normalize inputs
         * because there are many ways to call pouchdb.bulkDocs()
         */
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (!options) {
            options = {};
        }

        let docs: any[];
        if (Array.isArray(body)) {
            docs = body;
        } else if (body === undefined) {
            docs = [];
        } else {
            docs = body.docs;
            if (body.hasOwnProperty('new_edits')) {
                options.new_edits = body.new_edits;
            }
        }

        // throw if no docs given, because RxDB should never make such a call.
        if (docs.length === 0) {
            throw newRxError('SNH', {
                args: {
                    body,
                    options
                }
            });
        }


        /**
         * If new_edits=false we have to first find the current state
         * of the document and can later check if the state was changed
         * because a new revision was written and we have to emit an event.
         */
        const previousDocsInDb: Map<string, RxDocumentData<any>> = options.custom ? options.custom.previousDocsInDb : new Map();
        if (
            options.hasOwnProperty('new_edits') &&
            options.new_edits === false
        ) {
            const viaBulkGet = await this.bulkGet({
                docs: docs.map(doc => ({ id: doc._id })),
                revs: true,
                latest: true
            });

            /**
             * bulkGet() does not return deleted documents,
             * so we must refetch them via allDocs() afterwards.
             */
            const mustRefetchBecauseDeleted: string[] = [];

            viaBulkGet.results.forEach(resultRow => {
                const firstDoc = resultRow.docs[0];
                if (firstDoc.ok) {
                    previousDocsInDb.set(firstDoc.ok._id, firstDoc.ok);
                } else {
                    if (firstDoc.error && firstDoc.error.reason === 'deleted') {
                        mustRefetchBecauseDeleted.push(resultRow.id);
                    }
                }
            });

            if (mustRefetchBecauseDeleted.length > 0) {
                const deletedDocsViaAllDocs = await this.allDocs({
                    keys: mustRefetchBecauseDeleted,
                    include_docs: true,
                    conflicts: true,
                });

                const idsWithRevs: { id: string; rev: string; }[] = [];
                deletedDocsViaAllDocs.rows.forEach(row => {
                    idsWithRevs.push({
                        id: row.id,
                        rev: row.value.rev
                    });
                });

                const deletedDocsViaBulkGetWithRev = await this.bulkGet({
                    docs: idsWithRevs,
                    revs: true,
                    latest: true
                });

                deletedDocsViaBulkGetWithRev.results.forEach(resultRow => {
                    const firstDoc = resultRow.docs[0];
                    if (firstDoc.ok) {
                        previousDocsInDb.set(firstDoc.ok._id, firstDoc.ok);
                    } else {
                        throw newRxError('SNH', {
                            args: {
                                deletedDocsViaBulkGetWithRev,
                                resultRow
                            }
                        });
                    }
                });

            }
        }

        /**
         * Custom handling if the call came from RxDB (options.custom is set).
         */
        const usePouchResult: (PouchBulkDocResultRow | PouchWriteError)[] = [];
        let hasNonErrorWrite = false;
        if (
            options.custom &&
            options.hasOwnProperty('new_edits') &&
            options.new_edits === false
        ) {
            /**
             * Reset the write docs array,
             * because we only write non-conflicting documents.
             */
            docs = [];
            const writeRowById: Map<string, BulkWriteRow<any>> = options.custom.writeRowById;
            const insertDocsById: Map<string, any> = options.custom.insertDocsById;

            Array.from(writeRowById.entries()).forEach(([id, writeRow]) => {
                const previousRev = writeRow.previous ? writeRow.previous._rev : null;
                const newRev = parseRevision(writeRow.document._rev);
                const docInDb = previousDocsInDb.get(id);
                const docInDbRev: string | null = docInDb ? docInDb._rev : null;

                if (
                    docInDbRev !== previousRev
                ) {
                    // we have a conflict
                    usePouchResult.push({
                        error: true,
                        id,
                        status: 409
                    });
                } else {
                    const useRevisions = {
                        start: newRev.height,
                        ids: docInDb ? docInDb._revisions.ids.slice(0) : []
                    };
                    useRevisions.ids.unshift(newRev.hash);
                    const useNewRev = useRevisions.start + '-' + newRev.hash;

                    hasNonErrorWrite = true;
                    const writeToPouchDocData = Object.assign(
                        {},
                        insertDocsById.get(id),
                        {
                            _revisions: useRevisions,
                            _rev: useNewRev
                        }
                    );
                    docs.push(writeToPouchDocData);
                    usePouchResult.push({
                        ok: true,
                        id,
                        rev: writeRow.document._rev
                    });
                }
            });

            /**
             * Optimization shortcut,
             * if all document writes were conflict errors,
             * we can skip directly.
             */
            if (!hasNonErrorWrite) {
                return usePouchResult;
            }
        }

        /**
         * pouchdb calls this function again with transformed input.
         * This would lead to duplicate events. So we marks the deeper calls via the options
         * parameter and do not emit events if it is set.
         */
        const deeperOptions = flatClone(options);
        deeperOptions.isDeeper = true;
        let callReturn: any;
        const callPromise = new Promise((res, rej) => {

            /**
             * The emitted EventBulk from the write to the pouchdb, needs to contain a checkpoint field.
             * Because PouchDB works on sequence number to sort changes,
             * we have to fetch the latest sequence number out of the events because it
             * is not possible to that that from pouch.bulkDocs().
             */
            const docIds: Set<string> = new Set(docs.map(d => d._id));
            let heighestSequence = 0;
            let changesSub: PouchChangesOnChangeEvent;
            const heighestSequencePromise = new Promise<number>(res2 => {
                changesSub = this.changes({
                    since: 'now',
                    live: true,
                    include_docs: true
                }).on('change', (change: any) => {
                    const docId: string = change.id;
                    if (docIds.has(docId)) {
                        docIds.delete(docId);
                        if (heighestSequence < change.seq) {
                            heighestSequence = change.seq;
                        }

                        if (docIds.size === 0) {
                            (changesSub as any).cancel();
                            res2(heighestSequence);
                        }
                    }
                }) as any;
            });


            /**
             * We cannot send the custom here,
             * because when a migration between different major RxDB versions is done,
             * multiple versions of the RxDB PouchDB RxStorage might have added their
             * custom method via PouchDBCore.plugin()
             */
            const useOptsForOldBulkDocs = flatClone(deeperOptions);
            delete useOptsForOldBulkDocs.custom;

            callReturn = oldBulkDocs.call(
                this,
                docs,
                useOptsForOldBulkDocs,
                (err: any, result: (PouchBulkDocResultRow | PouchWriteError)[]) => {
                    if (err) {
                        if (callback) {
                            callback(err);
                        } else {
                            rej(err);
                        }
                    } else {
                        return (async () => {
                            const hasError = result.find(row => (row as PouchWriteError).error);
                            let heighestSequenceInner = -1;
                            if (!hasError) {
                                heighestSequenceInner = await heighestSequencePromise;
                            } else {
                                changesSub.cancel();
                            }

                            result.forEach(row => {
                                usePouchResult.push(row);
                            });

                            /**
                             * For calls that came from RxDB,
                             * we have to ensure that the events are emitted
                             * before the actual call resolves.
                             */
                            let eventsPromise = PROMISE_RESOLVE_VOID;
                            if (!options.isDeeper) {
                                const endTime = now();
                                const emitData = {
                                    emitId: runId,
                                    writeDocs: docs,
                                    writeOptions: options,
                                    writeResult: usePouchResult,
                                    previousDocs: previousDocsInDb,
                                    startTime,
                                    endTime
                                };
                                eventsPromise = eventEmitDataToStorageEvents(
                                    this,
                                    '_id',
                                    emitData
                                ).then(events => {
                                    const eventBulk: EventBulk<any, PouchCheckpoint> = {
                                        id: randomCouchString(10),
                                        events,
                                        checkpoint: {
                                            sequence: heighestSequenceInner
                                        },
                                        context: options.custom ? options.custom.context : 'pouchdb-internal'
                                    };

                                    const emitter = getCustomEventEmitterByPouch(this);
                                    emitter.subject.next(eventBulk);
                                });
                            }

                            if (callback) {
                                callback(null, usePouchResult);
                            } else {
                                return eventsPromise.then(() => {
                                    res(usePouchResult);
                                    return usePouchResult;
                                });
                            }
                        })();
                    }
                });
        });

        if (options.custom) {
            return callPromise;
        }



        return callReturn;
    };

    PouchDBCore.plugin({
        bulkDocs: newBulkDocs
    } as any);

}

export async function eventEmitDataToStorageEvents<RxDocType>(
    pouchDBInstance: PouchDBInstance,
    primaryPath: string,
    emitData: EmitData
): Promise<RxStorageChangeEvent<RxDocumentData<RxDocType>>[]> {
    const ret: RxStorageChangeEvent<RxDocumentData<RxDocType>>[] = [];
    if (
        !emitData.writeOptions.custom &&
        emitData.writeOptions.hasOwnProperty('new_edits') &&
        emitData.writeOptions.new_edits === false
    ) {
        await Promise.all(
            emitData.writeDocs.map(async (writeDoc) => {
                const id = writeDoc._id;
                writeDoc = pouchDocumentDataToRxDocumentData(
                    primaryPath,
                    writeDoc
                );
                writeDoc._attachments = await writeAttachmentsToAttachments(writeDoc._attachments);
                let previousDoc = emitData.previousDocs.get(id);
                if (previousDoc) {
                    previousDoc = pouchDocumentDataToRxDocumentData(
                        primaryPath,
                        previousDoc
                    );
                }
                if (previousDoc) {
                    const parsedRevPrevious = parseRevision(previousDoc._rev);
                    const parsedRevNew = parseRevision(writeDoc._rev);
                    if (
                        (
                            parsedRevPrevious.height > parsedRevNew.height ||
                            /**
                             * If the revision height is equal,
                             * we determine the higher hash as winner.
                             */
                            (
                                parsedRevPrevious.height === parsedRevNew.height &&
                                parsedRevPrevious.hash > parsedRevNew.hash
                            )
                        )
                    ) {
                        /**
                         * The newly added document was not the latest revision
                         * so we drop the write.
                         * With plain PouchDB it makes sense to store conflicting branches of the document
                         * but RxDB assumes that the conflict is resolved directly.
                         */
                        return;
                    }
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
                        doc: writeDoc,
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

                const changeEvent = changeEventToNormal(
                    pouchDBInstance,
                    primaryPath,
                    event,
                    emitData.startTime,
                    emitData.endTime
                );

                ret.push(changeEvent);
            })
        );
        // eslint-disable-next-line brace-style
    }

    /**
     * There is no write map given for internal pouchdb document writes
     * like it is done with replication.
     */
    else if (
        !emitData.writeOptions.custom ||
        (emitData.writeOptions.custom && !emitData.writeOptions.custom.writeRowById)
    ) {
        const writeDocsById: Map<string, any> = new Map();
        emitData.writeDocs.forEach(writeDoc => writeDocsById.set(writeDoc._id, writeDoc));
        await Promise.all(
            emitData.writeResult.map(async (resultRow) => {
                const id = resultRow.id;
                if (
                    id.startsWith(POUCHDB_DESIGN_PREFIX) ||
                    id.startsWith(POUCHDB_LOCAL_PREFIX)
                ) {
                    return;
                }
                let writeDoc = getFromMapOrThrow(writeDocsById, resultRow.id);
                writeDoc = pouchDocumentDataToRxDocumentData(
                    primaryPath,
                    writeDoc
                );

                writeDoc._attachments = await writeAttachmentsToAttachments(writeDoc._attachments);
                writeDoc = flatClone(writeDoc);
                writeDoc._rev = (resultRow as any).rev;
                const event = pouchChangeRowToChangeEvent<RxDocType>(
                    primaryPath as any,
                    writeDoc
                );
                const changeEvent = changeEventToNormal(pouchDBInstance, primaryPath, event);
                ret.push(changeEvent);
            })
        );
    } else {
        const writeMap: Map<string, BulkWriteRow<RxDocType>> = emitData.writeOptions.custom.writeRowById;
        await Promise.all(
            emitData.writeResult.map(async (resultRow) => {
                if ((resultRow as PouchWriteError).error) {
                    return;
                }
                const id = resultRow.id;
                const writeRow = getFromMapOrThrow(writeMap, id);
                const attachments = await writeAttachmentsToAttachments(writeRow.document._attachments);
                const newDoc: RxDocumentData<RxDocType> = Object.assign(
                    {},
                    writeRow.document,
                    {
                        _attachments: attachments,
                        _rev: (resultRow as PouchBulkDocResultRow).rev
                    }
                );

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
                    const attachmentsInner = await writeAttachmentsToAttachments(writeRow.previous._attachments);
                    const previousDoc = Object.assign(
                        {},
                        writeRow.previous,
                        {
                            _attachments: attachmentsInner
                        }
                    );

                    event = {
                        operation: 'DELETE',
                        doc: writeRow.document,
                        id: resultRow.id,
                        previous: previousDoc
                    } as any;
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
                    const changeEvent = changeEventToNormal(
                        pouchDBInstance,
                        ensureNotFalsy(emitData.writeOptions.custom).primaryPath,
                        event,
                        emitData.startTime,
                        emitData.endTime
                    );
                    ret.push(changeEvent);
                }
            })
        );
    }

    return ret;
}

export function changeEventToNormal<RxDocType>(
    pouchDBInstance: PouchDBInstance,
    primaryPath: string,
    change: ChangeEvent<RxDocumentData<RxDocType>>,
    startTime?: number,
    endTime?: number
): RxStorageChangeEvent<RxDocumentData<RxDocType>> {
    const doc: RxDocumentData<RxDocType> = change.operation === 'DELETE' ? change.previous as any : change.doc as any;
    const primary: string = (doc as any)[primaryPath];
    const storageChangeEvent: RxStorageChangeEvent<RxDocumentData<RxDocType>> = {
        eventId: getEventKey(pouchDBInstance, primary, change),
        documentId: primary,
        documentData: change.doc as any,
        previousDocumentData: change.previous as any,
        operation: change.operation,
        startTime,
        endTime
    };
    return storageChangeEvent;
}
