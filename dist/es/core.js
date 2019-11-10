/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */
import { QueryChangeDetector } from './query-change-detector';
export { QueryChangeDetector } from './query-change-detector';
import addPlugin from './plugin';
import { PouchDB } from './pouch-db';
export { PouchDB } from './pouch-db';
export var plugin = addPlugin;
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
  PouchDB: PouchDB,
  QueryChangeDetector: QueryChangeDetector
};
//# sourceMappingURL=core.js.map