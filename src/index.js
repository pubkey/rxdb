import RxDatabase from './RxDatabase';
import RxSchema from './RxSchema';
import RxDocument from './RxDocument';
import RxQuery from './RxQuery';
import RxCollection from './RxCollection';
import QueryChangeDetector from './QueryChangeDetector';
import Plugin from './Plugin';
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
    if (mod.rxdb) {
        // rxdb-plugin
        Plugin.addPlugin(mod);
    } else {
        // pouchdb-plugin
        if (typeof mod === 'object' && mod.default) mod = mod.default;
        PouchDB.plugin(mod);
    }
}

// default plugins
import ValidatePlugin from './modules/validate';
plugin(ValidatePlugin);
import EncryptionPlugin from './modules/encryption';
plugin(EncryptionPlugin);


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


export default {
    create,
    removeDatabase,
    plugin,
    isRxDatabase,
    isRxCollection,
    isRxDocument,
    isRxQuery,
    isRxSchema,
    RxSchema,
    PouchDB,
    QueryChangeDetector,
    RxDatabase
};
