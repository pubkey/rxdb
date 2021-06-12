/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */

import './types/modules/crypto-js.d';
import './types/modules/graphql-client.d';
import './types/modules/mocha.parallel.d';
import './types/modules/modifiyjs.d';
import './types/modules/random-token.d';


export { addRxPlugin } from './plugin';

export {
    createRxDatabase,
    removeRxDatabase,
    isRxDatabase,
    dbCount,
    _collectionNamePrimary // used in tests
} from './rx-database';

export {
    isRxCollection,
    RxCollectionBase,
    createRxCollection // used in tests
} from './rx-collection';

export {
    _handleFromStorageInstance,
    _handleToStorageInstance,
    fillObjectDataBeforeInsert
} from './rx-collection-helper';

export {
    isRxDocument
} from './rx-document';

export {
    getDocumentOrmPrototype,
    getDocumentPrototype
} from './rx-document-prototype-merge';

export {
    isInstanceOf as isRxQuery
} from './rx-query';

export {
    isInstanceOf as isRxSchema,
    createRxSchema,
    RxSchema,
    getIndexes,
    normalize,
    getFinalFields,
    getPreviousVersions,
    getPseudoSchemaForVersion,
    getSchemaByObjectPath
} from './rx-schema';

export {
    findLocalDocument,
    getSingleDocument,
    getNewestSequence,
    getAllDocuments,
    writeSingleLocal,
    writeSingle,
    countAllUndeleted,
    getBatch
} from './rx-storage-helper';

export {
    _clearHook // used in tests
} from './hooks';

export {
    createCrypter // used in tests
} from './crypter';

export * from './query-cache';

export * from './util';

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

    // pouchdb stuff
    PouchDBInstance,
    PouchReplicationOptions,
    PouchSettings,
    PouchSyncHandler,
    PouchSyncHandlerEvents,
    PouchdbQuery,

    RxAttachment,
    RxAttachmentCreator,
    RxCollection,
    RxCacheReplacementPolicy,
    PrimaryProperty,
    RxChangeEvent,
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
    MigrationStrategies,
    WithAttachmentsData,
    RxStorage
} from './types';
