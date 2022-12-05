/**
 * this is the main entry-point
 * for when the you call "import from 'rxdb'".
 */

import './types/modules/mocha.parallel.d';
import './types/modules/modifiyjs.d';
export { addRxPlugin } from './plugin';
export { createRxDatabase, removeRxDatabase, isRxDatabase, dbCount, isRxDatabaseFirstTimeInstantiated, ensureNoStartupErrors } from './rx-database';
export * from './rx-error';
export * from './rx-database-internal-store';
export { overwritable } from './overwritable';
export { isRxCollection, RxCollectionBase, createRxCollection // used in tests
} from './rx-collection';
export { fillObjectDataBeforeInsert } from './rx-collection-helper';
export { isRxDocument } from './rx-document';
export { flattenEvents } from './rx-change-event';
export { getDocumentOrmPrototype, getDocumentPrototype } from './rx-document-prototype-merge';
export { isInstanceOf as isRxQuery } from './rx-query';
export * from './rx-query-helper';
export { isInstanceOf as isRxSchema, createRxSchema, RxSchema, getIndexes, getPreviousVersions, toTypedRxJsonSchema } from './rx-schema';
export * from './rx-schema-helper';
export * from './rx-storage-helper';
export * from './rx-storage-message-channel';
export * from './replication-protocol/index';
export * from './rx-storage-multiinstance';
export * from './custom-index';
export * from './query-planner';
export * from './plugin-helpers';
export { _clearHook // used in tests
} from './hooks';
export * from './query-cache';
export * from './util';

// TODO how to do 'export type * ..' ?
//# sourceMappingURL=index.js.map