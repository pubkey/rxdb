/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDBCore from 'pouchdb-core';
// pouchdb-find
import PouchDBFind from 'pouchdb-find';
PouchDBCore.plugin(PouchDBFind);

/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/


import {
    newRxError
} from './rx-error';
import {
    PouchDBInstance
} from './types';

/**
 * get the number of all undeleted documents
 */
export function countAllUndeleted(
    pouchdb: PouchDBInstance
): Promise<number> {
    return pouchdb
        .allDocs({
            include_docs: false,
            attachments: false
        })
        .then(docs => (docs.rows as any[])
            .filter(row => !row.id.startsWith('_design/'))
            .length
        );
}

/**
 * get a batch of documents from the pouch-instance
 */
export function getBatch(
    pouchdb: PouchDBInstance,
    limit: number
): Promise<any[]> {
    if (limit <= 1) {
        throw newRxError('P1', {
            limit
        });
    }

    return pouchdb
        .allDocs({
            include_docs: true,
            attachments: false,
            limit
        })
        .then(docs => (docs.rows as any[])
            .map(row => row.doc)
            .filter(doc => !doc._id.startsWith('_design'))
        );
}

export function isInstanceOf(obj: any) {
    return obj instanceof PouchDBCore;
}

export const PouchDB = PouchDBCore;
