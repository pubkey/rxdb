/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDBCore from 'pouchdb-core';

// pouchdb-find
import PouchDBFind from 'pouchdb-find';

addPouchPlugin(PouchDBFind);

/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/


// TODO we can delete most of these functions in the file because it was migrated to rx-storage-pouchdb

import {
    newRxError,
    newRxTypeError
} from '../../rx-error';
import type {
    PouchDBInstance
} from '../../types';

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


/**
 * Add a pouchdb plugin to the pouchdb library.
 */
export function addPouchPlugin(plugin: any) {
    if (plugin.rxdb) {
        throw newRxTypeError('PL2', {
            plugin
        });
    }
    /**
     * Pouchdb has confusing typings and modules.
     * So we monkeypatch the plugin to use the default property
     * when it was imported or packaged this way.
     */
    if (typeof plugin === 'object' && plugin.default) {
        plugin = plugin.default;
    }
    PouchDBCore.plugin(plugin);
}


export const PouchDB: any = PouchDBCore as any;
