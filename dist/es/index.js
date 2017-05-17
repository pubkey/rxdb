import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
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
export var create = function () {
    var _ref = _asyncToGenerator(_regeneratorRuntime.mark(function _callee(args) {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        return _context.abrupt('return', RxDatabase.create(args));

                    case 1:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function create(_x) {
        return _ref.apply(this, arguments);
    };
}();

export function plugin(mod) {
    if (typeof mod === 'object' && mod['default']) mod = mod['default'];
    PouchDB.plugin(mod);
}

export { RxSchema, PouchDB, QueryChangeDetector, RxDatabase };