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
    RxCollection
} from './rx-collection';
export * from './rx-collection';

export * from './plugins/replication';

import {
    RxQueryOptions,
    RxQueryObject,
    RxQuery
} from './rx-query';
export * from './rx-query';

import {
    RxDocument,
    RxLocalDocument
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

import {
    RxPlugin
} from './rx-plugin';
export * from './rx-plugin';


type createType = <Collections = { [key: string]: RxCollection }>(creator: RxDatabaseCreator) => Promise<RxDatabase<Collections>>;
export const create: createType;

type removeDatabaseType = (databaseName: string, adapter: any) => Promise<void>;
export const removeDatabase: removeDatabaseType;

export function checkAdapter(adapter: any | string): Promise<boolean>;

type QueryChangeDetector = {
    enableDebugging: () => void;
};
export const QueryChangeDetector: {
    enableDebugging(set?: boolean): void;
};

type pluginType = (mod: RxPlugin | any) => void;
export const plugin: pluginType;

type isInstanceOfType = (obj: any) => boolean;

export const isRxDatabase: isInstanceOfType;
export const isRxCollection: isInstanceOfType;
export const isRxDocument: isInstanceOfType;
export const isRxQuery: isInstanceOfType;
export const isRxSchema: isInstanceOfType;


type Test<RxDocumentType> = {
    readonly doc: RxDocument<RxDocumentType>;
}

declare const _default: {
    create: createType,
    checkAdapter: (adapter: any) => Promise<boolean>,
    removeDatabase: removeDatabaseType,
    plugin: pluginType,
    dbCount: () => number,
    isRxDatabase: isInstanceOfType,
    isRxCollection: isInstanceOfType,
    isRxDocument: isInstanceOfType,
    isRxQuery: isInstanceOfType,
    isRxSchema: isInstanceOfType,
    RxSchema: RxSchema,
    PouchDB: PouchDB,
    QueryChangeDetector: QueryChangeDetector,
    RxDatabase: RxDatabase
};

export default _default;
