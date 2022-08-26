/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDBCore from 'pouchdb-core';

/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/


import {
    newRxError,
    newRxTypeError
} from '../../rx-error';
import type { PouchDBInstance } from '../../types';


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

export function isInstanceOf(obj: any) {
    return obj instanceof PouchDBCore;
}

/**
 * Adding a PouchDB plugin multiple times,
 * can sometimes error. So we have to check if the plugin
 * was added before.
 */
const ADDED_POUCH_PLUGINS: Set<any> = new Set();

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

    if (!ADDED_POUCH_PLUGINS.has(plugin)) {
        ADDED_POUCH_PLUGINS.add(plugin);
        PouchDBCore.plugin(plugin);
    }
}


const getPrefix = function (db: PouchDBInstance) {
    const splitted = db.name.split('/').filter((str: string) => str !== '');
    splitted.pop(); // last was the name
    if (splitted.length === 0) {
        return '';
    }
    let ret = splitted.join('/') + '/';
    if (db.name.startsWith('/')) {
        ret = '/' + ret;
    }
    return ret;
};

const pouchDBOptions = Object.assign(
    {
        log: false
    }
);

export const PouchDB: any = PouchDBCore;
