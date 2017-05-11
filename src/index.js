import * as RxDatabase from './RxDatabase';
import * as RxSchema from './RxSchema';
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

export function plugin(mod) {
    if (typeof mod === 'object' && mod.default) mod = mod.default;
    PouchDB.plugin(mod);
}

export {
    RxSchema as RxSchema,
    PouchDB as PouchDB,
    QueryChangeDetector as QueryChangeDetector,
    RxDatabase as RxDatabase
};
