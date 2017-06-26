import * as RxDatabase from './RxDatabase';
import * as RxSchema from './RxSchema';
import * as RxDocument from './RxDocument';
import * as RxQuery from './RxQuery';
import * as RxCollection from './RxCollection';

import * as QueryChangeDetector from './QueryChangeDetector';

import PouchDB from './PouchDB';

/**
 * create a database
 * @param  {string} prefix as databaseName for the storage (this can be the foldername)
 * @param  {Object} storageEngine any leveldown instance
 * @param  {String} password if the database contains encrypted fields
 * @param  {boolean} multiInstance if true, multiInstance-handling will be done
 * @return {Promise<Database>}
 */
export async function create(args) {
    return RxDatabase.create(args);
}

/**
 * removes the database and all its known data
 * @param  {string} databaseName
 * @param  {Object} adapter
 * @return {Promise}
 */
export async function removeDatabase(databaseName, adapter) {
    return RxDatabase.removeDatabase(databaseName, adapter);
}

export function plugin(mod) {
    if (typeof mod === 'object' && mod.default) mod = mod.default;
    PouchDB.plugin(mod);
}

export function isRxDatabase(obj) {
    return RxDatabase.isInstanceOf(obj);
}
export function isRxCollection(obj) {
    return RxCollection.isInstanceOf(obj);
}
export function isRxDocument(obj) {
    return RxDocument.isInstanceOf(obj);
}
export function isRxQuery(obj) {
    return RxQuery.isInstanceOf(obj);
}
export function isRxSchema(obj) {
    return RxSchema.isInstanceOf(obj);
}



export {
    RxSchema as RxSchema,
    PouchDB as PouchDB,
    QueryChangeDetector as QueryChangeDetector,
    RxDatabase as RxDatabase,
};
