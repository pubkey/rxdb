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
    writeOptions: {
        new_edits?: boolean;
        custom: any;
    };
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
        options: any,
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
            const previousDocsResult = await this.allDocs({
                include_docs: true,
                keys: ids
            });
            previousDocsResult.rows
                .filter(row => !!row.doc)
                .forEach(row => previousDocs.set(row.doc._id, row.doc));
        }


        /**
         * pouchdb calls this function again with transformed input.
         * This would lead to duplicate events. So we marks the deeper calls via the options
         * parameter and do not emit events if it is set.
         */
        const deeperOptions = flatClone(options);
        deeperOptions.isDeeper = true;

        return oldBulkDocs.call(this, body, deeperOptions, (err: any, result: any) => {
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

