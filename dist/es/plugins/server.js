import express from 'express';
import ExpressPouchDB from 'express-pouchdb';
import { filter } from 'rxjs/operators/filter';
import { map } from 'rxjs/operators/map';

import PouchDB from '../pouch-db';
import RxError from '../rx-error';

import Core from '../core';
import ReplicationPlugin from './replication';
Core.plugin(ReplicationPlugin);

var APP_OF_DB = new WeakMap();
var SERVERS_OF_DB = new WeakMap();
var SUBSCRIPTIONS_OF_DB = new WeakMap();

var normalizeDbName = function normalizeDbName(db) {
    var splitted = db.name.split('/').filter(function (str) {
        return str !== '';
    });
    return splitted.pop();
};

var getPrefix = function getPrefix(db) {
    var splitted = db.name.split('/').filter(function (str) {
        return str !== '';
    });
    splitted.pop(); // last was the name
    if (splitted.length === 0) return '';
    return splitted.join('/') + '/';
};

/**
 * tunnel requests so collection-names can be used as paths
 */
function tunnelCollectionPath(db, path, app, colName) {
    db[colName].watchForChanges();
    app.use(path + '/' + colName, function (req, res, next) {
        if (req.baseUrl === path + '/' + colName) {
            var to = normalizeDbName(db) + '-rxdb-0-' + colName;
            var toFull = req.originalUrl.replace('/db/' + colName, '/db/' + to);
            req.originalUrl = toFull;
        }
        next();
    });
};

export function spawnServer(_ref) {
    var _ref$path = _ref.path,
        path = _ref$path === undefined ? '/db' : _ref$path,
        _ref$port = _ref.port,
        port = _ref$port === undefined ? 3000 : _ref$port;

    var db = this;
    if (!SERVERS_OF_DB.has(db)) SERVERS_OF_DB.set(db, []);

    var pseudo = PouchDB.defaults({
        adapter: db.adapter,
        prefix: getPrefix(db)
    });

    var app = express();
    APP_OF_DB.set(db, app);

    // tunnel requests so collection-names can be used as paths
    // TODO do this for all collections that get created afterwards
    Object.keys(db.collections).forEach(function (colName) {
        return tunnelCollectionPath(db, path, app, colName);
    });

    // also tunnel if collection is created afterwards
    // show error if collection is created afterwards
    var dbSub = db.$.pipe(filter(function (ev) {
        return ev.data.col === '_collections';
    }), map(function (ev) {
        return ev.data.v;
    })).subscribe(function (colName) {
        var err = RxError.newRxError('S1', {
            collection: colName,
            database: db.name
        });
        throw err;
    });
    SUBSCRIPTIONS_OF_DB.set(db, dbSub);

    app.use(path, ExpressPouchDB(pseudo));
    var server = app.listen(port);
    SERVERS_OF_DB.get(db).push(server);

    return {
        app: app,
        server: server
    };
}

/**
 * runs when the database gets destroyed
 */
export function onDestroy(db) {
    if (SERVERS_OF_DB.has(db)) {
        SERVERS_OF_DB.get(db).forEach(function (server) {
            return server.close();
        });
        SUBSCRIPTIONS_OF_DB.get(db).unsubscribe();
    }
}

export var rxdb = true;
export var prototypes = {
    RxDatabase: function RxDatabase(proto) {
        proto.server = spawnServer;
    }
};

export var hooks = {
    preDestroyRxDatabase: onDestroy
};

export var overwritable = {};

export default {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable,
    hooks: hooks,
    spawnServer: spawnServer
};