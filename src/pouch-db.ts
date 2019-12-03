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
    newRxError,
    newRxTypeError
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


/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */
export function isLevelDown(adapter: any) {
    if (!adapter || typeof adapter.super_ !== 'function') {
        throw newRxError('UT4', {
            adapter
        });
    }
}

/**
 * validates that a given string is ok to be used with couchdb-collection-names
 * @link https://wiki.apache.org/couchdb/HTTP_database_API
 * @throws  {Error}
 */
export function validateCouchDBString(name: string): true {
    if (
        typeof name !== 'string' ||
        name.length === 0
    ) {
        throw newRxTypeError('UT1', {
            name
        });
    }


    // do not check, if foldername is given
    if (
        name.includes('/') || // unix
        name.includes('\\') // windows
    ) return true;


    const regStr = '^[a-z][_$a-z0-9]*$';
    const reg = new RegExp(regStr);
    if (!name.match(reg)) {
        throw newRxError('UT2', {
            regex: regStr,
            givenName: name,
        });
    }

    return true;
}

/**
 * get the correct function-name for pouchdb-replication
 */
export function pouchReplicationFunction(
    pouch: PouchDBInstance,
    {
        pull = true,
        push = true
    }
): any {
    if (pull && push) return pouch.sync.bind(pouch);
    if (!pull && push) return (pouch.replicate as any).to.bind(pouch);
    if (pull && !push) return (pouch.replicate as any).from.bind(pouch);
    if (!pull && !push) {
        throw newRxError('UT3', {
            pull,
            push
        });
    }
}

export function isInstanceOf(obj: any) {
    return obj instanceof PouchDBCore;
}

export const PouchDB = PouchDBCore;
