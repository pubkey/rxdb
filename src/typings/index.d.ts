import {
    RxSchema,
    RxJsonSchema
} from './rx-schema';
export * from './rx-schema';

import {
    PouchReplicationOptions,
    PouchSettings,
    PouchDB
} from './pouch';
export * from './pouch';

import {
    RxDatabase,
    RxDatabaseCreator
} from './rx-database';
export * from './rx-database';

import {
    RxCollectionCreator,
    RxReplicationState,
    SyncOptions,
    RxCollection
} from './rx-collection';
export * from './rx-collection';

import {
    RxQueryOptions,
    RxQueryObject,
    RxQuery
} from './rx-query';
export * from './rx-query';

import {
    RxDocument
} from './rx-document';
export * from './rx-document';

import {
    RxError
} from './rx-error';
export * from './rx-error';

import {
    RxAttachment
} from './rx-attachment';
export * from './rx-attachment';

export function create(creator: RxDatabaseCreator): Promise<RxDatabase>;
export function removeDatabase(databaseName: string, adapter: any): Promise<void>;
export function checkAdapter(adapter: any | string): Promise<boolean>;

export const QueryChangeDetector: {
    enable(): void;
    enableDebugging(set?: boolean): void;
};

export function plugin(mod: any): void;

export function isRxDatabase(obj: any): boolean;
export function isRxCollection(obj: any): boolean;
export function isRxDocument(obj: any): boolean;
export function isRxQuery(obj: any): boolean;
export function isRxSchema(obj: any): boolean;

declare const _default: {
    create,
    removeDatabase,
    plugin

    // database
    isRxDatabase,
    RxDatabaseCreator,
    RxDatabase,

    // collection
    isRxCollection,
    RxCollectionCreator,
    RxCollection,

    // document
    isRxDocument,
    RxDocument,

    // query
    isRxQuery,
    RxQuery,

    // attachment
    RxAttachment,

    // schema
    isRxSchema,
    RxSchema,
    RxJsonSchema,

    // other
    PouchDB,
    QueryChangeDetector,
    RxError
};

export default _default;
