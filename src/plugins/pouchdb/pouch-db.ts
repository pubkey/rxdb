/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDBCore from 'pouchdb-core';

// pouchdb-find
import PouchDBFind from 'pouchdb-find';

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
import { addCustomEventsPluginToPouch } from './custom-events-plugin';

addPouchPlugin(PouchDBFind);
addCustomEventsPluginToPouch();


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
