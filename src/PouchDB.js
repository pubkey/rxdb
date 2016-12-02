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

export default PouchDB;
