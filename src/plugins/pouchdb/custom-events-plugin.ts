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
    PouchDBInstance
} from '../../types';
import PouchDBCore from 'pouchdb-core';
import { Subject } from 'rxjs';
import { flatClone } from '../../util';

// ensure only added once
let addedToPouch = false;

declare type EmitData = {
    emitId: number;
    writeOptions: {
        new_edits?: boolean;
        custom: any;
    };
    writeDocs: any[];
    writeResult: PouchBulkDocResultRow[];
};

const eventEmitterByPouchInstance: WeakMap<PouchDBInstance, Subject<EmitData>> = new WeakMap();

export function getCustomEventEmitterByPouch(
    pouch: PouchDBInstance
): Subject<EmitData> {
    let emitter = eventEmitterByPouchInstance.get(pouch);
    if (!emitter) {
        emitter = new Subject();
        eventEmitterByPouchInstance.set(pouch, emitter);
    }
    return emitter;
}


let i = 0;

export function addCustomEventsPluginToPouch() {
    console.log('############    addCustomEventsPluginToPouch');
    if (addedToPouch) {
        return;
    }
    addedToPouch = true;

    const oldBulkDocs: any = PouchDBCore.prototype.bulkDocs;


    const newBulkDocs = function (
        this: PouchDBInstance,
        body: any[] | { docs: any[], new_edits?: boolean },
        options: any,
        callback: Function
    ) {

        const t = i++;

        console.log('addCustomEventsPluginToPouch().newBulkDocs() ' + t);


        // console.log('body:');
        // console.dir(body);
        // console.log('options:');
        // console.dir(options);
        // console.log('callback:');
        // console.dir(callback);
        // console.log('---------------');


        let docs: any[];
        if (Array.isArray(body)) {
            docs = body;
        } else if (body === undefined) {
            docs = [];
        } else {
            docs = body.docs;
        }


        // normalize input
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (!options) {
            options = {};
        }

        // // console.log('normalized input: ' + t);
        // // console.log('docs:');
        // // console.dir(body);
        // // console.log('options:');
        // // console.dir(options);
        // // console.log('callback:');
        // // console.dir(callback);
        // // console.log('---------------');


        /*
        console.log('--- make request to oldBulkDocs:');
        await new Promise((res, rej) => {
            const res11 = oldBulkDocs(body, options, () => {
                console.log('res11:');
                console.dir(res11);
                res(res11);
            });
        });
        process.exit();
        */


        /**
         * pouchdb calls this function again with transformed input.
         * This would lead to duplicate events. So we marks the deeper calls via the options
         * parameter and do not emit events if it is set.
         */
        const deeperOptions = flatClone(options);
        deeperOptions.isDeeper = true;

        return oldBulkDocs.call(this, body, deeperOptions, (err: any, result: any) => {
            // console.log('original bulk docs resolved with; ' + t);
            // console.dir(err);
            // console.dir(result);
            if (err) {
                // console.log('overwritten bulk docs has thrown: ' + t);
                // console.dir(err);
                if (callback) {
                    callback(err);
                } else {
                    throw err;
                }

            } else {
                // console.log('overwritten bulk callback normal result: ' + t);
                // console.dir(result);


                if (!options.isDeeper) {
                    console.log('emit data for ' + t);
                    const emitData = {
                        emitId: t,
                        writeDocs: docs,
                        writeOptions: options,
                        writeResult: result
                    };
                    console.dir(emitData);
                    const emitter = getCustomEventEmitterByPouch(this);
                    emitter.next(emitData);
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

