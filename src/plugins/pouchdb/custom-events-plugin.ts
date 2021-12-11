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
    getHeightOfRevision,
    now,
    randomCouchString
} from '../../util';
import { newRxError } from '../../rx-error';
import { ObliviousSet } from 'oblivious-set';
import { getEventKey, pouchChangeRowToChangeEvent, POUCHDB_DESIGN_PREFIX, POUCHDB_LOCAL_PREFIX, pouchDocumentDataToRxDocumentData, writeAttachmentsToAttachments } from './pouchdb-helper';
import { ChangeEvent } from 'event-reduce-js';

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
        const previousDocs: Map<string, any> = new Map();
        if (
            options.hasOwnProperty('new_edits') &&
            options.new_edits === false
        ) {
            const ids = docs.map(doc => doc._id);

            /**
             * Pouchdb does not return deleted documents via allDocs()
             * So have to do use our hack with getting the newest revisions from the
             * changes.
             */
            const viaChanges = await this.changes({
                live: false,
                since: 0,
                doc_ids: ids,
                style: 'all_docs'
            });

            const previousDocsResult = await Promise.all(
                viaChanges.results.map(async (result) => {
                    const firstDoc = await this.get(
                        result.id,
                        {
                            rev: result.changes[0].rev,
                            deleted: 'ok',
                            revs: options.set_new_edit_as_latest_revision ? true : false,
                            style: 'all_docs'
                        }
                    );
                    return firstDoc;
                })
            );
            previousDocsResult.forEach(doc => previousDocs.set(doc._id, doc));

            if (options.set_new_edit_as_latest_revision) {
                docs.forEach(doc => {
                    const id = doc._id;
                    const previous = previousDocs.get(id);
                    if (previous) {
                        const splittedRev = doc._rev.split('-');
                        const revHeight = parseInt(splittedRev[0], 10);
                        const revLabel = splittedRev[1];
                        doc._revisions = {
                            start: revHeight,
                            ids: previous._revisions.ids
                        };
                        doc._revisions.ids.unshift(revLabel);

                        delete previous._revisions;
                    }
                });
            }
        }


        /**
         * pouchdb calls this function again with transformed input.
         * This would lead to duplicate events. So we marks the deeper calls via the options
         * parameter and do not emit events if it is set.
         */
        const deeperOptions = flatClone(options);
        deeperOptions.isDeeper = true;

        return oldBulkDocs.call(this, docs, deeperOptions, (err: any, result: any) => {
            if (err) {
                if (callback) {
                    callback(err);
                } else {
                    throw err;
                }
            } else {
                return (async () => {

                    /**
                     * For calls that came from RxDB,
                     * we have to ensure that the events are emitted
                     * before the actual call resolves.
                     */
                    if (!options.isDeeper) {
                        const endTime = now();
                        const emitData = {
                            emitId: t,
                            writeDocs: docs,
                            writeOptions: options,
                            writeResult: result,
                            previousDocs,
                            startTime,
                            endTime
                        };

                        const events = await eventEmitDataToStorageEvents(
                            '_id',
                            emitData
                        );
                        const eventBulk: EventBulk<any> = {
                            id: randomCouchString(10),
                            events
                        }
                        const emitter = getCustomEventEmitterByPouch(this);
                        emitter.subject.next(eventBulk);
                    }

                    if (callback) {
                        callback(null, result);
                    } else {
                        return result;
                    }
                })();
            }
        });
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

    if (emitData.writeOptions.hasOwnProperty('new_edits') && !emitData.writeOptions.new_edits) {
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
                const newDoc = pouchDocumentDataToRxDocumentData(
                    primaryPath,
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
                        primaryPath,
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
