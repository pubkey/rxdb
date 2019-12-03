/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */
/// <reference types="pouchdb-core" />
import { QueryChangeDetector } from './query-change-detector';
export { QueryChangeDetector } from './query-change-detector';
import addPlugin from './plugin';
export { PouchDB } from './pouch-db';
export declare const plugin: typeof addPlugin;
import { create, removeDatabase, checkAdapter, isInstanceOf as isRxDatabase, dbCount } from './rx-database';
export { create, removeDatabase, checkAdapter, isInstanceOf as isRxDatabase, dbCount } from './rx-database';
export { create as createRxDatabase } from './rx-database';
import { isInstanceOf as isRxCollection } from './rx-collection';
export { isInstanceOf as isRxCollection } from './rx-collection';
import { isInstanceOf as isRxDocument } from './rx-document';
export { isInstanceOf as isRxDocument } from './rx-document';
import { isInstanceOf as isRxQuery } from './rx-query';
export { isInstanceOf as isRxQuery } from './rx-query';
import { isInstanceOf as isRxSchema } from './rx-schema';
export { isInstanceOf as isRxSchema, createRxSchema, RxSchema } from './rx-schema';
export { RxChangeEvent } from './rx-change-event';
declare const _default: {
    create: typeof create;
    removeDatabase: typeof removeDatabase;
    checkAdapter: typeof checkAdapter;
    plugin: typeof addPlugin;
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
