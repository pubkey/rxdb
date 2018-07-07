import express from 'express';
import ExpressPouchDB from 'express-pouchdb';

import PouchDB from '../pouch-db';
import RxError from '../rx-error';

import Core from '../core';
import ReplicationPlugin from './replication';
Core.plugin(ReplicationPlugin);

const APP_OF_DB = new WeakMap();
const SERVERS_OF_DB = new WeakMap();
const DBS_WITH_SERVER = new WeakSet();


const normalizeDbName = function(db) {
    const splitted = db.name.split('/').filter(str => str !== '');
    return splitted.pop();
};

const getPrefix = function(db) {
    const splitted = db.name.split('/').filter(str => str !== '');
    splitted.pop(); // last was the name
    if (splitted.length === 0) return '';
    return splitted.join('/') + '/';
};

/**
 * tunnel requests so collection-names can be used as paths
 */
function tunnelCollectionPath(db, path, app, colName) {
    db[colName].watchForChanges();
    app.use(path + '/' + colName, function(req, res, next) {
        if (req.baseUrl === path + '/' + colName) {
            const to = normalizeDbName(db) + '-rxdb-0-' + colName;
            const toFull = req.originalUrl.replace('/db/' + colName, '/db/' + to);
            req.originalUrl = toFull;
        }
        next();
    });
}

export function spawnServer({
    path = '/db',
    port = 3000
}) {
    const db = this;
    if (!SERVERS_OF_DB.has(db))
        SERVERS_OF_DB.set(db, []);


    const pseudo = PouchDB.defaults({
        adapter: db.adapter,
        prefix: getPrefix(db)
    });

    const app = express();
    APP_OF_DB.set(db, app);


    // tunnel requests so collection-names can be used as paths
    // TODO do this for all collections that get created afterwards
    Object.keys(db.collections).forEach(colName => tunnelCollectionPath(db, path, app, colName));

    // show error if collection is created afterwards
    DBS_WITH_SERVER.add(db);

    app.use(path, ExpressPouchDB(pseudo));
    const server = app.listen(port);
    SERVERS_OF_DB.get(db).push(server);

    return {
        app,
        server
    };
}

/**
 * when a server is created, no more collections can be spawned
 */
const ensureNoMoreCollections = function(args) {
    if (DBS_WITH_SERVER.has(args.database)) {
        const err = RxError.newRxError(
            'S1', {
                collection: args.name,
                database: args.database.name
            }
        );
        throw err;
    }
};

/**
 * runs when the database gets destroyed
 */
export function onDestroy(db) {
    if (SERVERS_OF_DB.has(db))
        SERVERS_OF_DB.get(db).forEach(server => server.close());
}


export const rxdb = true;
export const prototypes = {
    RxDatabase: (proto) => {
        proto.server = spawnServer;
    }
};

export const hooks = {
    preDestroyRxDatabase: onDestroy,
    preCreateRxCollection: ensureNoMoreCollections
};

export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable,
    hooks,
    spawnServer
};
