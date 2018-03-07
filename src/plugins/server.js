import express from 'express';
import ExpressPouchDB from 'express-pouchdb';

import PouchDB from '../pouch-db';
import RxError from '../rx-error';

import Core from '../core';
import ReplicationPlugin from './replication';
Core.plugin(ReplicationPlugin);

const APP_OF_DB = new WeakMap();
const SERVERS_OF_DB = new WeakMap();


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

export async function spawnServer({
    path = '/db',
    port = 3000
}) {
    const db = this;
    if (!SERVERS_OF_DB.has(db))
        SERVERS_OF_DB.set(db, []);

    db.human.watchForChanges();

    const pseudo = PouchDB.defaults({
        adapter: db.adapter,
        prefix: getPrefix(db)
    });

    const app = express();
    APP_OF_DB.set(db, app);

    // tunnel requests so collection-names can be used as paths
    // TODO do this for all collections that exist or come
    app.use(path + '/human', function(req, res, next) {
        console.log('#### one req:');
        console.dir(req.baseUrl);
        if (req.baseUrl === '/db/human') {
            console.log('# tunnel:');
            const to = normalizeDbName(db) + '-rxdb-0-human';
            const toFull = req.originalUrl.replace('/db/human', '/db/' + to);
            req.originalUrl = toFull;
            console.dir(toFull);
        }
        next();
    });


    app.use('*', function(req, res, next) {
        console.log('#### log:');
        console.dir(req.baseUrl);
        next();
    });


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
