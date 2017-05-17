function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDB from 'pouchdb-core';

// pouchdb-find
import * as PouchDBFind from 'pouchdb-find';
PouchDB.plugin(PouchDBFind);

/**
 * get the number of all undeleted documents
 * @param  {PouchDB}  pouchdb instance
 * @return {Promise(number)} number of documents
 */
PouchDB.countAllUndeleted = (() => {
    var _ref = _asyncToGenerator(function* (pouchdb) {
        const docs = yield pouchdb.allDocs({
            include_docs: false,
            attachments: false
        });
        return docs.rows.filter(function (row) {
            return !row.id.startsWith('_design/');
        }).length;
    });

    return function (_x) {
        return _ref.apply(this, arguments);
    };
})();

/**
 * get a batch of documents from the pouch-instance
 * @param  {PouchDB}  pouchdb instance
 * @param  {number}  limit
 * @return {{}[]} array with documents
 */
PouchDB.getBatch = (() => {
    var _ref2 = _asyncToGenerator(function* (pouchdb, limit) {
        if (limit <= 1) throw new Error('PouchDB.getBatch: limit must be > 2');

        const docs = yield pouchdb.allDocs({
            include_docs: true,
            attachments: false,
            limit
        });
        return docs.rows.map(function (row) {
            return row.doc;
        }).filter(function (doc) {
            return !doc._id.startsWith('_design');
        });
    });

    return function (_x2, _x3) {
        return _ref2.apply(this, arguments);
    };
})();

export default PouchDB;