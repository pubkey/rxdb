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
    PouchBulkDocOptions,
    PouchBulkDocResultRow,
    PouchDBInstance,
    PouchWriteError
} from '../../types';
import PouchDBCore from 'pouchdb-core';
import { Subject } from 'rxjs';
import {
    flatClone,
    now
} from '../../util';
import { newRxError } from '../../rx-error';
import { ObliviousSet } from 'oblivious-set';

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


declare type Emitter = {
    subject: Subject<EmitData>;
    /**
     * Contains all eventIds that of emitted events,
     * used because multi-instance pouchdbs often will reemit the same
     * event on the other browser tab.
     */
    obliviousSet: ObliviousSet<string>;
};
export const EVENT_EMITTER_BY_POUCH_INSTANCE: Map<string, Emitter> = new Map();

export function getCustomEventEmitterByPouch(
    pouch: PouchDBInstance
): Emitter {
    const key = [
        pouch.name,
        pouch.adapter
    ].join('|');
    let emitter = EVENT_EMITTER_BY_POUCH_INSTANCE.get(key);
    if (!emitter) {
        emitter = {
            subject: new Subject(),
            obliviousSet: new ObliviousSet(60 * 1000)
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

            console.log('bulkDocs(new_edits=false) previousDocsResult:');
            console.log(JSON.stringify(previousDocsResult, null, 4));

            previousDocsResult.forEach(doc => previousDocs.set(doc._id, doc));


            if (options.set_new_edit_as_latest_revision) {
                docs.forEach(doc => {
                    const id = doc._id;
                    const previous = previousDocs.get(id);
                    if (previous) {
                        const splittedRev = doc._rev.split('-');
                        const revHeight = parseInt(splittedRev[0]);
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

        console.log('deeperOptions:');
        console.dir(deeperOptions);


        console.log('call old bulkDocs with docs:');
        console.log(JSON.stringify(docs, null, 4));

        return oldBulkDocs.call(this, docs, deeperOptions, (err: any, result: any) => {
            if (err) {
                if (callback) {
                    callback(err);
                } else {
                    throw err;
                }



            } else {
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

                    console.log('emitData writeResult:');
                    console.log(JSON.stringify(result.writeResult));

                    const emitter = getCustomEventEmitterByPouch(this);
                    emitter.subject.next(emitData);
                }

                if (callback) {
                    callback(null, result);
                } else {
                    return result;
                }
            }
        });
    };

    PouchDBCore.plugin({
        bulkDocs: newBulkDocs
    } as any);

}

