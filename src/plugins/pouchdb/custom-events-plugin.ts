/*
 * Instead of listening to pouch.changes,
 * we overwrite pouchdbs bulkDocs()
 * and create our own event stream, this will work more reliable
 * and has less strange behaviors.
 * Also we can better define what data we need for our events.
 * @link http://jsbin.com/pagebi/1/edit?js,output
 * @link https://github.com/pubkey/rxdb/blob/1f4115b69bdacbb853af9c637d70f5f184d4e474/src/rx-storage-pouchdb.ts#L273
 */

import type {
    BulkWriteRow,
    EventBulk,
    PouchBulkDocOptions,
    PouchBulkDocResultRow,
    PouchDBInstance,
    PouchWriteError,
    RxDocumentData,
    RxStorageChangeEvent
} from '../../types';
import PouchDBCore from 'pouchdb-core';
import { Subject } from 'rxjs';
import {
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
    subject: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>>;
};
export const EVENT_EMITTER_BY_POUCH_INSTANCE: Map<string, Emitter<any>> = new Map();

export function getCustomEventEmitterByPouch<RxDocType>(
    pouch: PouchDBInstance
): Emitter<RxDocType> {
    const key = [
        pouch.name,
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


let i = 0;

export function addCustomEventsPluginToPouch() {
    if (addedToPouch) {
        return;
    }
    addedToPouch = true;

    const oldBulkDocs: any = PouchDBCore.prototype.bulkDocs;
    const newBulkDocs = async function (
        this: PouchDBInstance,
        body: any[] | { docs: any[], new_edits?: boolean },
        options: PouchBulkDocOptions,
        callback: Function
    ) {
        const startTime = now();
        const t = i++;

        // normalize input
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
        const originalWriteDocs = docs.slice(0);


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
        const previousDocsInDb: Map<string, RxDocumentData<any>> = new Map();
        if (
            options.hasOwnProperty('new_edits') &&
            options.new_edits === false
        ) {
            const ids = docs.map(doc => doc._id);

            const nonDeletedDocsInPouchRows = await this.allDocs({
                keys: ids,
                include_docs: true
            });
            console.log('nonDeletedDocsInPouchRows:');
            console.log(JSON.stringify(nonDeletedDocsInPouchRows, null, 4));
            nonDeletedDocsInPouchRows.rows.forEach(row => {
                if (row.doc) {
                    previousDocsInDb.set(row.id, row.doc);
                }
            });
        }

        /**
         * Check for conflicts,
         * only if the call came from RxDB (options.custom is set)
         */
        const usePouchResult: (PouchBulkDocResultRow | PouchWriteError)[] = [];

        let hasNonErrorWrite = false;
        if (options.custom) {
            const writeRowById: Map<string, BulkWriteRow<any>> = options.custom.writeRowById;

            /**
             * Reset the write docs array,
             * because we only write non-conflicting documents.
             */
            docs = [];

            console.log('previousDocsInDb:');
            console.dir(Array.from(previousDocsInDb.entries()));

            const insertDocsById: Map<string, any> = options.custom.insertDocsById;
            Array.from(writeRowById.entries()).forEach(([id, writeRow]) => {
                const previousRev = writeRow.previous ? writeRow.previous._rev : null;
                const docInDb = previousDocsInDb.get(id);
                const docInDbRev = docInDb ? docInDb._rev : null;
                if (docInDbRev !== previousRev) {
                    // we have a conflict
                    usePouchResult.push({
                        error: true,
                        id,
                        status: 409
                    });
                } else {
                    hasNonErrorWrite = true;
                    docs.push(insertDocsById.get(id));
                    usePouchResult.push({
                        ok: true,
                        id,
                        rev: writeRow.document._rev
                    });
                }
            });

            /**
             * Optimization shortcut,
             * if all document writes where conflict errors,
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

        console.log('--- docs after conflict check:');
        console.dir(docs);


        console.log('deeperOptions:');
        console.dir(deeperOptions);


        let callReturn: any;
        const callPromise = new Promise((res, rej) => {
            callReturn = oldBulkDocs.call(this, docs, deeperOptions, (err: any, result: (PouchBulkDocResultRow | PouchWriteError)[]) => {
                if (err) {
                    if (callback) {
                        callback(err);
                    } else {
                        rej(err);
                    }
                } else {
                    console.log('bulkDocs inner result:');
                    console.dir(result);

                    result.forEach(row => {
                        usePouchResult.push(row);
                    });

                    console.log('usePouchResult: options.isDeeper ' + options.isDeeper);
                    console.dir(usePouchResult);

                    /**
                     * For calls that came from RxDB,
                     * we have to ensure that the events are emitted
                     * before the actual call resolves.
                     */
                    let eventsPromise = PROMISE_RESOLVE_VOID;
                    if (!options.isDeeper) {
                        const endTime = now();
                        const emitData = {
                            emitId: t,
                            writeDocs: originalWriteDocs,
                            writeOptions: options,
                            writeResult: usePouchResult,
                            previousDocs: previousDocsInDb,
                            startTime,
                            endTime
                        };

                        eventsPromise = eventEmitDataToStorageEvents(
                            '_id',
                            emitData
                        ).then(events => {
                            const eventBulk: EventBulk<any> = {
                                id: randomCouchString(10),
                                events
                            }
                            const emitter = getCustomEventEmitterByPouch(this);
                            emitter.subject.next(eventBulk);
                        });
                    }

                    console.log('return this: usePouchResult + ' + !!callback);
                    console.dir(usePouchResult);

                    if (callback) {
                        eventsPromise.then(() => {
                            callback(null, usePouchResult);
                        });
                    } else {
                        return eventsPromise.then(() => {
                            res(usePouchResult);
                            return usePouchResult;
                        });
                    }
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
    primaryPath: string,
    emitData: EmitData
): Promise<RxStorageChangeEvent<RxDocumentData<RxDocType>>[]> {
    const ret: RxStorageChangeEvent<RxDocumentData<RxDocType>>[] = [];
    if (
        emitData.writeOptions.hasOwnProperty('new_edits') &&
        !emitData.writeOptions.new_edits
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

                const changeEvent = changeEventToNormal(
                    primaryPath,
                    event,
                    emitData.startTime,
                    emitData.endTime
                );
                ret.push(changeEvent);
            })
        );
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
                const changeEvent = changeEventToNormal(primaryPath, event);
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
                    const attachments = await writeAttachmentsToAttachments(writeRow.previous._attachments);
                    const previousDoc = Object.assign(
                        {},
                        writeRow.previous,
                        {
                            _attachments: attachments,
                            _rev: (resultRow as PouchBulkDocResultRow).rev
                        }
                    );

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
                    const changeEvent = changeEventToNormal(
                        emitData.writeOptions.custom.primaryPath,
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
    primaryPath: string,
    change: ChangeEvent<RxDocumentData<RxDocType>>,
    startTime?: number,
    endTime?: number
): RxStorageChangeEvent<RxDocumentData<RxDocType>> {
    const doc: RxDocumentData<RxDocType> = change.operation === 'DELETE' ? change.previous as any : change.doc as any;
    const primary: string = (doc as any)[primaryPath];
    const storageChangeEvent: RxStorageChangeEvent<RxDocumentData<RxDocType>> = {
        eventId: getEventKey(false, primary, doc._rev),
        documentId: primary,
        change,
        startTime,
        endTime
    };
    return storageChangeEvent;
}
