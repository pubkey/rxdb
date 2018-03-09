'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.hooks = exports.prototypes = exports.rxdb = undefined;
exports.spawnServer = spawnServer;
exports.onDestroy = onDestroy;

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _expressPouchdb = require('express-pouchdb');

var _expressPouchdb2 = _interopRequireDefault(_expressPouchdb);

var _filter = require('rxjs/operators/filter');

var _map = require('rxjs/operators/map');

var _pouchDb = require('../pouch-db');

var _pouchDb2 = _interopRequireDefault(_pouchDb);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _core = require('../core');

var _core2 = _interopRequireDefault(_core);

var _replication = require('./replication');

var _replication2 = _interopRequireDefault(_replication);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

_core2['default'].plugin(_replication2['default']);

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

function spawnServer(_ref) {
    var _ref$path = _ref.path,
        path = _ref$path === undefined ? '/db' : _ref$path,
        _ref$port = _ref.port,
        port = _ref$port === undefined ? 3000 : _ref$port;

    var db = this;
    if (!SERVERS_OF_DB.has(db)) SERVERS_OF_DB.set(db, []);

    var pseudo = _pouchDb2['default'].defaults({
        adapter: db.adapter,
        prefix: getPrefix(db)
    });

    var app = (0, _express2['default'])();
    APP_OF_DB.set(db, app);

    // tunnel requests so collection-names can be used as paths
    // TODO do this for all collections that get created afterwards
    Object.keys(db.collections).forEach(function (colName) {
        return tunnelCollectionPath(db, path, app, colName);
    });

    // also tunnel if collection is created afterwards
    // show error if collection is created afterwards
    var dbSub = db.$.pipe((0, _filter.filter)(function (ev) {
        return ev.data.col === '_collections';
    }), (0, _map.map)(function (ev) {
        return ev.data.v;
    })).subscribe(function (colName) {
        var err = _rxError2['default'].newRxError('S1', {
            collection: colName,
            database: db.name
        });
        throw err;
    });
    SUBSCRIPTIONS_OF_DB.set(db, dbSub);

    app.use(path, (0, _expressPouchdb2['default'])(pseudo));
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
function onDestroy(db) {
    if (SERVERS_OF_DB.has(db)) {
        SERVERS_OF_DB.get(db).forEach(function (server) {
            return server.close();
        });
        SUBSCRIPTIONS_OF_DB.get(db).unsubscribe();
    }
}

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    RxDatabase: function RxDatabase(proto) {
        proto.server = spawnServer;
    }
};

var hooks = exports.hooks = {
    preDestroyRxDatabase: onDestroy
};

var overwritable = exports.overwritable = {};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable,
    hooks: hooks,
    spawnServer: spawnServer
};
