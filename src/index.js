import 'babel-polyfill';
import * as RxDatabase from './RxDatabase';
import * as RxSchema from './RxSchema';
import {
    default as PouchDB
} from './PouchDB';

/**
 * create a database
 * @param  {string} prefix as databaseName for the storage (this can be the foldername)
 * @param  {Object} storageEngine any leveldown instance
 * @param  {String} password if the database contains encrypted fields
 * @param  {boolean} multiInstance if true, multiInstance-handling will be done
 * @return {Promise<Database>}
 */
export async function create(prefix, storageEngine, password, multiInstance) {
    return RxDatabase.create(prefix, storageEngine, password, multiInstance);
}

export function plugin(mod) {
    if (typeof mod === 'object' && mod.default) mod = mod.default;
    PouchDB.plugin(mod);
}

export {
    RxSchema as RxSchema,
    PouchDB as PouchDB
};
