/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import {
    default as PouchDB
} from 'pouchdb-core';

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
    return docs.total_rows;
};


export default PouchDB;
