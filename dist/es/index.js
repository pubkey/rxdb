/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */
import './types/modules/graphql-client.d';
import './types/modules/mocha.parallel.d';
import './types/modules/modifiyjs.d';
export { addRxPlugin } from './plugin';
export { createRxDatabase, removeRxDatabase, isRxDatabase, dbCount, _collectionNamePrimary, // used in tests
isRxDatabaseFirstTimeInstantiated } from './rx-database';
export { INTERNAL_CONTEXT_COLLECTION, INTERNAL_CONTEXT_ENCRYPTION, INTERNAL_CONTEXT_REPLICATION_PRIMITIVES, getPrimaryKeyOfInternalDocument, STORAGE_TOKEN_DOCUMENT_KEY } from './rx-database-internal-store';
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
export { getPseudoSchemaForVersion, getSchemaByObjectPath, fillPrimaryKey, getPrimaryFieldOfPrimaryKey, getComposedPrimaryKeyOfDocumentData, normalizeRxJsonSchema, fillWithDefaultSettings, RX_META_SCHEMA, getFinalFields } from './rx-schema-helper';
export * from './rx-storage-helper';
export * from './rx-storage-replication';
export * from './rx-storage-multiinstance';
export * from './custom-index';
export * from './query-planner';
export { _clearHook // used in tests
} from './hooks';
export * from './query-cache';
export * from './util'; // TODO how to do 'export type * ..' ?
//# sourceMappingURL=index.js.map