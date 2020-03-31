/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */

import {
    addRxPlugin
} from './core';

// default plugins
import { RxDBDevModePlugin } from './plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);

import { RxDBValidatePlugin } from './plugins/validate';
addRxPlugin(RxDBValidatePlugin);

import { RxDBKeyCompressionPlugin } from './plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);

import { RxDBMigrationPlugin } from './plugins/migration';
addRxPlugin(RxDBMigrationPlugin);

import { RxDBLeaderElectionPlugin } from './plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);

import { RxDBEncryptionPlugin } from './plugins/encryption';
addRxPlugin(RxDBEncryptionPlugin);

import { RxDBUpdatePlugin } from './plugins/update';
addRxPlugin(RxDBUpdatePlugin);

import { RxDBWatchForChangesPlugin } from './plugins/watch-for-changes';
addRxPlugin(RxDBWatchForChangesPlugin);

import { RxDBReplicationPlugin } from './plugins/replication';
addRxPlugin(RxDBReplicationPlugin);

import { RxDBAdapterCheckPlugin } from './plugins/adapter-check';
addRxPlugin(RxDBAdapterCheckPlugin);

import { RxDBJsonDumpPlugin } from './plugins/json-dump';
addRxPlugin(RxDBJsonDumpPlugin);

import { RxDBInMemoryPlugin } from './plugins/in-memory';
addRxPlugin(RxDBInMemoryPlugin);

import { RxDBAttachmentsPlugin } from './plugins/attachments';
addRxPlugin(RxDBAttachmentsPlugin);

import { RxDBLocalDocumentsPlugin } from './plugins/local-documents';
addRxPlugin(RxDBLocalDocumentsPlugin);

import { RxDBQueryBuilderPlugin } from './plugins/query-builder';
addRxPlugin(RxDBQueryBuilderPlugin);

// TODO how to do 'export type * ..' ?
export type {
    JsonSchemaTypes,
    GraphQLSyncPullOptions,
    GraphQLSyncPushOptions,
    AtomicUpdateFunction,
    CollectionsOfDatabase,
    MangoQuery,
    MangoQueryNoLimit,
    JsonSchema,
    KeyFunctionMap,
    MangoQuerySelector,
    MangoQuerySortDirection,
    MangoQuerySortPart,
    MigrationState,
    NumberFunctionMap,
    PouchDBInstance,
    PouchReplicationOptions,
    PouchSettings,
    PouchSyncHandler,
    PouchSyncHandlerEvents,
    RxAttachment,
    RxAttachmentCreator,
    RxCollection,
    PrimaryProperty,
    RxCollectionCreator,
    RxCollectionGenerated,
    RxCollectionHookCallback,
    RxCollectionHookCallbackNonAsync,
    RxCollectionHookNoInstance,
    RxCollectionHookNoInstanceCallback,
    RxDatabase,
    RxDatabaseCreator,
    RxDocument,
    RxDocumentTypeWithRev,
    RxDumpCollection,
    RxDumpCollectionAny,
    RxDumpCollectionAsAny,
    RxDumpDatabase,
    Buffer,
    Debug,
    ExtractDTcol,
    PouchdbQuery,
    RxDatabaseGenerated,
    RxDocumentBase,
    RxDumpCollectionBase,
    RxDumpDatabaseAny,
    RxDumpDatabaseBase,
    RxError,
    RxErrorItem,
    RxErrorParameters,
    RxGraphQLReplicationQueryBuilder,
    RxJsonSchema,
    RxLocalDocument,
    RxPlugin,
    RxQuery,
    RxQueryOP,
    RxQueryObject,
    RxQueryOptions,
    RxReplicationState,
    RxTypeError,
    ServerOptions,
    SyncOptions,
    SyncOptionsGraphQL,
} from './types';

// re-export things from core
export * from './core';
