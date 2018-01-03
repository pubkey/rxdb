/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */

import RxDatabase from './rx-database';
import RxSchema from './rx-schema';
import RxDocument from './rx-document';
import RxQuery from './rx-query';
import RxCollection from './rx-collection';
import QueryChangeDetector from './query-change-detector';
import Plugin from './plugin';
import PouchDB from './pouch-db';

export var create = RxDatabase.create;
export var removeDatabase = RxDatabase.removeDatabase;
export var checkAdapter = RxDatabase.checkAdapter;

export var plugin = Plugin.addPlugin;

export var isRxDatabase = RxDatabase.isInstanceOf;
export var dbCount = RxDatabase.dbCount;
export var isRxCollection = RxCollection.isInstanceOf;
export var isRxDocument = RxDocument.isInstanceOf;
export var isRxQuery = RxQuery.isInstanceOf;
export var isRxSchema = RxSchema.isInstanceOf;

export default {
    create: create,
    removeDatabase: removeDatabase,
    checkAdapter: checkAdapter,
    plugin: plugin,
    dbCount: dbCount,
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