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
PouchDB.countAllUndeleted = async function(pouchdb) {
    const docs = await pouchdb.allDocs({
        include_docs: false,
        attachments: false
    });
    return docs.rows
        .filter(row => !row.id.startsWith('_design/'))
        .length;
};

/**
 * get a batch of documents from the pouch-instance
 * @param  {PouchDB}  pouchdb instance
 * @param  {number}  limit
 * @return {{}[]} array with documents
 */
PouchDB.getBatch = async function(pouchdb, limit) {
    if (limit <= 1)
        throw new Error('PouchDB.getBatch: limit must be > 2');

    const docs = await pouchdb.allDocs({
        include_docs: true,
        attachments: false,
        limit
    });
    return docs
        .rows
        .map(row => row.doc)
        .filter(doc => !doc._id.startsWith('_design'));
};


export default PouchDB;
