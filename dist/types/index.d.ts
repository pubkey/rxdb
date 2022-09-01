/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */
import './types/modules/graphql-client.d';
import './types/modules/mocha.parallel.d';
import './types/modules/modifiyjs.d';
export { addRxPlugin } from './plugin';
export { createRxDatabase, removeRxDatabase, isRxDatabase, dbCount, _collectionNamePrimary, // used in tests
isRxDatabaseFirstTimeInstantiated, ensureNoStartupErrors } from './rx-database';
export * from './rx-database-internal-store';
export { overwritable } from './overwritable';
export { isRxCollection, RxCollectionBase, createRxCollection } from './rx-collection';
export { fillObjectDataBeforeInsert } from './rx-collection-helper';
export { isRxDocument } from './rx-document';
export { flattenEvents } from './rx-change-event';
export { getDocumentOrmPrototype, getDocumentPrototype } from './rx-document-prototype-merge';
export { isInstanceOf as isRxQuery } from './rx-query';
export * from './rx-query-helper';
export { isInstanceOf as isRxSchema, createRxSchema, RxSchema, getIndexes, getPreviousVersions, toTypedRxJsonSchema } from './rx-schema';
export * from './rx-schema-helper';
export * from './rx-storage-helper';
export * from './replication-protocol/index';
export * from './rx-storage-multiinstance';
export * from './custom-index';
export * from './query-planner';
export * from './plugin-helpers';
export { _clearHook } from './hooks';
export * from './query-cache';
export * from './util';
export type { JsonSchemaTypes, GraphQLSyncPullOptions, GraphQLSyncPushOptions, AtomicUpdateFunction, CollectionsOfDatabase, MangoQuery, MangoQueryNoLimit, JsonSchema, ExtractDocumentTypeFromTypedRxJsonSchema, KeyFunctionMap, MangoQuerySelector, MangoQuerySortDirection, MangoQuerySortPart, MigrationState, NumberFunctionMap, DeepReadonlyObject, RxAttachment, RxAttachmentCreator, RxCollection, RxCacheReplacementPolicy, RxChangeEvent, RxChangeEventBulk, RxCollectionCreator, RxCollectionGenerated, RxCollectionHookCallback, RxCollectionHookCallbackNonAsync, RxCollectionHookNoInstance, RxCollectionHookNoInstanceCallback, RxDatabase, RxDatabaseCreator, RxDocument, RxDumpCollection, RxDumpCollectionAny, RxDumpCollectionAsAny, RxDumpDatabase, Buffer, Debug, ExtractDTcol, RxDatabaseGenerated, RxDocumentBase, StringKeys, InternalStoreDocType, InternalStoreStorageTokenDocType, InternalStoreCollectionDocType, RxDocumentData, RxDocumentDataById, RxDocumentWriteData, WithDeleted, BulkWriteRow, BulkWriteRowById, RxAttachmentDataMeta, RxAttachmentData, RxAttachmentWriteData, RxStorage, RxStorageStatics, RxStorageBulkWriteError, RxStorageBulkWriteResponse, PreparedQuery, RxStorageQueryResult, RxStorageInstanceCreationParams, ChangeStreamOptions, EventBulk, ChangeStreamEvent, RxStorageChangeEvent, RxStorageInstance, RxStorageDefaultCheckpoint, CategorizeBulkWriteRowsOutput, RxConflictHandler, RxConflictHandlerInput, RxConflictHandlerOutput, RxConflictResultionTask, RxConflictResultionTaskSolution, RxReplicationWriteToMasterRow, RxStorageInstanceReplicationInput, RxStorageInstanceReplicationState, RxStorageReplicationDirection, RxStorageReplicationMeta, DocumentsWithCheckpoint, RxDumpCollectionBase, RxDumpDatabaseAny, RxDumpDatabaseBase, RxError, RxErrorItem, RxErrorParameters, RxGraphQLReplicationPushQueryBuilder, RxGraphQLReplicationPullQueryBuilder, RxJsonSchema, RxLocalDocument, RxPlugin, RxQuery, RxQueryOP, RxQueryObject, RxQueryOptions, RxCouchDBReplicationState, RxTypeError, CouchDBServerOptions, SyncOptions, SyncOptionsGraphQL, MigrationStrategy, MigrationStrategies, FilledMangoQuery, OldRxCollection, WithAttachmentsData, RxTestStorage, ById, RxQueryPlan } from './types';
