/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */

export { addRxPlugin } from './plugin';
export {
    PouchDB,
    validateCouchDBString,
    getBatch,
    countAllUndeleted
} from './pouch-db';

export {
    createRxDatabase,
    removeRxDatabase,
    checkAdapter,
    isInstanceOf as isRxDatabase,
    dbCount,
    _collectionNamePrimary // used in tests
} from './rx-database';

export {
    isInstanceOf as isRxCollection,
    create as _createRxCollection // used in tests
} from './rx-collection';

export {
    isInstanceOf as isRxDocument
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
    getPreviousVersions
} from './rx-schema';

export {
    RxChangeEvent
} from './rx-change-event';

export {
    getRxStoragePouchDb,
    getPouchLocation
} from './rx-storage-pouchdb';

export {
    _clearHook // used in tests
} from './hooks';

export {
    createCrypter // used in tests
} from './crypter';

// used in tests
export {
    _getOldCollections,
    getBatchOfOldCollection,
    migrateDocumentData,
    _migrateDocument,
    deleteOldCollection,
    migrateOldCollection,
    migratePromise
} from './data-migrator';

export type {
    RxStorage
} from './rx-storate.interface';

export * from './util';
