import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
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

/**
 * removes the database and all its known data
 * @param  {string} databaseName
 * @param  {Object} adapter
 * @return {Promise}
 */
export var removeDatabase = function () {
    var _ref2 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee2(databaseName, adapter) {
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        return _context2.abrupt('return', RxDatabase.removeDatabase(databaseName, adapter));

                    case 1:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function removeDatabase(_x2, _x3) {
        return _ref2.apply(this, arguments);
    };
}();

export function plugin(mod) {
    if (typeof mod === 'object' && mod['default']) mod = mod['default'];
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

export { RxSchema, PouchDB, QueryChangeDetector, RxDatabase };