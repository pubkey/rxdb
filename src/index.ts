/**
 * this is the main entry-point
 * for when the you call "import from 'rxdb'".
 */

import { MangoQuery, RxDocumentData, RxJsonSchema } from './types';

export { addRxPlugin } from './plugin';

export * from './rx-database';
export * from './rx-error';
export * from './rx-database-internal-store';
export * from './overwritable';
export * from './rx-collection';
export * from './rx-collection-helper';
export * from './rx-document';
export * from './rx-change-event';
export * from './rx-document-prototype-merge';
export * from './rx-query';
export * from './rx-query-helper';
export * from './rx-schema';
export * from './rx-schema-helper';
export * from './rx-storage-helper';
export * from './rx-storage-statics';
export * from './replication-protocol/index';
export * from './rx-storage-multiinstance';
export * from './custom-index';
export * from './query-planner';
export * from './plugin-helpers';
export * from './plugins/utils';
export * from './hooks';
export * from './query-cache';

export function isMangoQuerySatisfiedByIndex<RxDocType>(
    collectionName: string, // There is probably a better type for this
    mangoQuery: MangoQuery<RxDocType>
): boolean {

}

export function isMangoQuerySatisfiedByIndex2<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    mangoQuery: MangoQuery<RxDocType>
): boolean {

}

/**
 * TODO use export type * from './types';
 * which was introduced into typescript v5.
 * However changing this now would force all RxDB users
 * to update to typescript@5.0.0 so we should
 * change this in late 2023.
 */
export type {
    JsonSchemaTypes,
    GraphQLSyncPullOptions,
    GraphQLSyncPushOptions,
    ModifyFunction,
    CollectionsOfDatabase,
    MangoQuery,
    MangoQueryNoLimit,
    JsonSchema,
    ExtractDocumentTypeFromTypedRxJsonSchema,
    KeyFunctionMap,
    MangoQuerySelector,
    MangoQuerySortDirection,
    MangoQuerySortPart,
    MigrationState,
    NumberFunctionMap,
    DeepReadonlyObject,
    RxAttachment,
    RxAttachmentCreator,
    RxCollection,
    RxCacheReplacementPolicy,
    RxChangeEvent,
    RxChangeEventBulk,
    RxCollectionCreator,
    RxCollectionGenerated,
    RxCollectionHookCallback,
    RxCollectionHookCallbackNonAsync,
    RxCollectionHookNoInstance,
    RxCollectionHookNoInstanceCallback,
    RxDatabase,
    RxDatabaseCreator,
    RxDocument,
    RxDumpCollection,
    RxDumpCollectionAny,
    RxDumpCollectionAsAny,
    RxDumpDatabase,
    Buffer,
    Debug,
    ExtractDTcol,
    RxDatabaseGenerated,
    RxDocumentBase,
    StringKeys,

    InternalStoreDocType,
    InternalStoreStorageTokenDocType,
    InternalStoreCollectionDocType,

    // stuff from the RxStorage interface
    RxDocumentData,
    RxDocumentDataById,
    RxDocumentWriteData,
    WithDeleted,
    BulkWriteRow,
    BulkWriteRowById,
    RxAttachmentDataBase,
    RxAttachmentData,
    RxAttachmentWriteData,
    RxStorage,
    RxStorageStatics,
    RxStorageWriteError,
    RxStorageBulkWriteResponse,
    PreparedQuery,
    RxStorageQueryResult,
    RxStorageInstanceCreationParams,
    ChangeStreamOptions,
    EventBulk,
    ChangeStreamEvent,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageDefaultCheckpoint,
    CategorizeBulkWriteRowsOutput,
    DefaultPreparedQuery,
    RxStorageCountResult,

    // conflict handling
    RxConflictHandler,
    RxConflictHandlerInput,
    RxConflictHandlerOutput,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxReplicationWriteToMasterRow,

    // stuff from the RxStorage replication
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState,
    RxStorageReplicationDirection,
    RxStorageReplicationMeta,
    DocumentsWithCheckpoint,
    RxReplicationPullStreamItem,
    ReplicationPullHandlerResult,
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions,

    // crdt
    UpdateQuery,
    CRDTEntry,
    CRDTOperation,
    CRDTDocumentField,

    // other stuff
    RxDumpCollectionBase,
    RxDumpDatabaseAny,
    RxDumpDatabaseBase,
    RxError,
    RxTypeError,
    RxValidationError,
    RxErrorParameters,
    RxGraphQLReplicationPushQueryBuilder,
    RxGraphQLReplicationPullQueryBuilder,
    RxGraphQLPullResponseModifier,
    RxJsonSchema,
    RxLocalDocument,
    RxPlugin,
    RxQuery,
    RxQueryOP,
    MangoQueryOperators,
    SyncOptionsGraphQL,
    MigrationStrategy,
    MigrationStrategies,
    FilledMangoQuery,
    OldRxCollection,
    WithAttachmentsData,
    RxTestStorage,
    ById,
    MaybePromise,
    RxQueryPlan,
    PlainJsonError,
    CompressionMode
} from './types';
