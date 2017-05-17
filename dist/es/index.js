function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

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
export let create = (() => {
    var _ref = _asyncToGenerator(function* (args) {
        return RxDatabase.create(args);
    });

    return function create(_x) {
        return _ref.apply(this, arguments);
    };
})();

export function plugin(mod) {
    if (typeof mod === 'object' && mod.default) mod = mod.default;
    PouchDB.plugin(mod);
}

export { RxSchema, PouchDB, QueryChangeDetector, RxDatabase };