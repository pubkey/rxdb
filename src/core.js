/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */

import RxDatabase from './RxDatabase';
import RxSchema from './RxSchema';
import RxDocument from './RxDocument';
import RxQuery from './RxQuery';
import RxCollection from './RxCollection';
import QueryChangeDetector from './QueryChangeDetector';
import Plugin from './Plugin';
import PouchDB from './PouchDB';

export const create = RxDatabase.create;
export const removeDatabase = RxDatabase.removeDatabase;

export function plugin(mod) {
    if (mod.rxdb) {
        // rxdb-plugin
        Plugin.addPlugin(mod);
    } else {
        // pouchdb-plugin
        if (typeof mod === 'object' && mod.default) mod = mod.default;
        PouchDB.plugin(mod);
    }
}

export const isRxDatabase = RxDatabase.isInstanceOf;
export const isRxCollection = RxCollection.isInstanceOf;
export const isRxDocument = RxDocument.isInstanceOf;
export const isRxQuery = RxQuery.isInstanceOf;
export const isRxSchema = RxSchema.isInstanceOf;

export default {
    create,
    removeDatabase,
    plugin,
    isRxDatabase,
    isRxCollection,
    isRxDocument,
    isRxQuery,
    isRxSchema,
    RxSchema,
    PouchDB,
    QueryChangeDetector,
    RxDatabase
};
