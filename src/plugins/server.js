import express from 'express';
import ExpressPouchDB from 'express-pouchdb';
import {
    filter
} from 'rxjs/operators/filter';
import {
    map
} from 'rxjs/operators/map';

import PouchDB from '../pouch-db';
import RxError from '../rx-error';

import Core from '../core';
import ReplicationPlugin from './replication';
Core.plugin(ReplicationPlugin);

const APP_OF_DB = new WeakMap();
const SERVERS_OF_DB = new WeakMap();
const SUBSCRIPTIONS_OF_DB = new WeakMap();


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
};

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

    // also tunnel if collection is created afterwards
    // show error if collection is created afterwards
    const dbSub = db.$
        .pipe(
            filter(ev => ev.data.col === '_collections'),
            map(ev => ev.data.v)
        )
        .subscribe(colName => {
            const err = RxError.newRxError(
                'S1', {
                    collection: colName,
                    database: db.name
                }
            );
            throw err;
        });
    SUBSCRIPTIONS_OF_DB.set(db, dbSub);

    app.use(path, ExpressPouchDB(pseudo));
    const server = app.listen(port);
    SERVERS_OF_DB.get(db).push(server);

    return {
        app,
        server
    };
}


/**
 * runs when the database gets destroyed
 */
export function onDestroy(db) {
    if (SERVERS_OF_DB.has(db)) {
        SERVERS_OF_DB.get(db).forEach(server => server.close());
        SUBSCRIPTIONS_OF_DB.get(db).unsubscribe();
    }
}


export const rxdb = true;
export const prototypes = {
    RxDatabase: (proto) => {
        proto.server = spawnServer;
    }
};

export const hooks = {
    preDestroyRxDatabase: onDestroy
};

export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable,
    hooks,
    spawnServer
};
