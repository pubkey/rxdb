/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */
export { addRxPlugin } from './plugin';
export { PouchDB } from './pouch-db';
export { createRxDatabase, removeRxDatabase, checkAdapter, isInstanceOf as isRxDatabase, dbCount } from './rx-database';
export { isInstanceOf as isRxCollection } from './rx-collection';
export { isInstanceOf as isRxDocument } from './rx-document';
export { isInstanceOf as isRxQuery } from './rx-query';
export { isInstanceOf as isRxSchema, createRxSchema, RxSchema } from './rx-schema';
export { RxChangeEvent } from './rx-change-event';
export { getRxStoragePouchDb } from './rx-storage-pouchdb';
//# sourceMappingURL=core.js.map