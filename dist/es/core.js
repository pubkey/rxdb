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

export var create = RxDatabase.create;
export var removeDatabase = RxDatabase.removeDatabase;

export function plugin(mod) {
    if (mod.rxdb) {
        // rxdb-plugin
        Plugin.addPlugin(mod);
    } else {
        // pouchdb-plugin
        if (typeof mod === 'object' && mod['default']) mod = mod['default'];
        PouchDB.plugin(mod);
    }
}

export var isRxDatabase = RxDatabase.isInstanceOf;
export var isRxCollection = RxCollection.isInstanceOf;
export var isRxDocument = RxDocument.isInstanceOf;
export var isRxQuery = RxQuery.isInstanceOf;
export var isRxSchema = RxSchema.isInstanceOf;

export default {
    create: create,
    removeDatabase: removeDatabase,
    plugin: plugin,
    isRxDatabase: isRxDatabase,
    isRxCollection: isRxCollection,
    isRxDocument: isRxDocument,
    isRxQuery: isRxQuery,
    isRxSchema: isRxSchema,
    RxSchema: RxSchema,
    PouchDB: PouchDB,
    QueryChangeDetector: QueryChangeDetector,
    RxDatabase: RxDatabase
};