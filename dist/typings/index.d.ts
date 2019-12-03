/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */
/// <reference types="pouchdb-core" />
export * from './types';
export * from './core';
import { create, removeDatabase, dbCount, isRxCollection, isRxDatabase, isRxDocument, isRxQuery, isRxSchema, QueryChangeDetector, checkAdapter } from './core';
declare const _default: {
    create: typeof create;
    checkAdapter: typeof checkAdapter;
    removeDatabase: typeof removeDatabase;
    plugin: typeof import("./plugin").default;
    dbCount: typeof dbCount;
    isRxDatabase: typeof isRxDatabase;
    isRxCollection: typeof isRxCollection;
    isRxDocument: typeof isRxDocument;
    isRxQuery: typeof isRxQuery;
    isRxSchema: typeof isRxSchema;
    PouchDB: PouchDB.Static;
    QueryChangeDetector: typeof QueryChangeDetector;
};
export default _default;
