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

export const create = RxDatabase.create;
export const removeDatabase = RxDatabase.removeDatabase;
export const checkAdapter = RxDatabase.checkAdapter;

export const plugin = Plugin.addPlugin;

export const isRxDatabase = RxDatabase.isInstanceOf;
export const dbCount = RxDatabase.dbCount;
export const isRxCollection = RxCollection.isInstanceOf;
export const isRxDocument = RxDocument.isInstanceOf;
export const isRxQuery = RxQuery.isInstanceOf;
export const isRxSchema = RxSchema.isInstanceOf;

export default {
    create,
    removeDatabase,
    checkAdapter,
    plugin,
    dbCount,
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
