/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDB from 'pouchdb-core';

// pouchdb-find
import PouchDBFind from 'pouchdb-find';
PouchDB.plugin(PouchDBFind);

import RxError from './rx-error';

/**
 * get the number of all undeleted documents
 * @param  {PouchDB}  pouchdb instance
 * @return {Promise<number>} number of documents
 */
PouchDB.countAllUndeleted = function(pouchdb) {
    return pouchdb
        .allDocs({
            include_docs: false,
            attachments: false
        })
        .then(docs => docs
            .rows
            .filter(row => !row.id.startsWith('_design/'))
            .length
        );
};

/**
 * get a batch of documents from the pouch-instance
 * @param  {PouchDB}  pouchdb instance
 * @param  {number}  limit
 * @return {Promise<{}[]>} array with documents
 */
PouchDB.getBatch = function(pouchdb, limit) {
    if (limit <= 1) {
        throw RxError.newRxError('P1', {
            limit
        });
    }

    return pouchdb
        .allDocs({
            include_docs: true,
            attachments: false,
            limit
        })
        .then(docs => docs
            .rows
            .map(row => row.doc)
            .filter(doc => !doc._id.startsWith('_design'))
        );
};


export default PouchDB;
