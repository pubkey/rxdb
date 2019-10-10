import express from 'express';
import corsFn from 'cors';
import { PouchDB } from '../pouch-db';
import { newRxError } from '../rx-error';
import Core from '../core';
import ReplicationPlugin from './replication';
Core.plugin(ReplicationPlugin);
import RxDBWatchForChangesPlugin from './watch-for-changes';
Core.plugin(RxDBWatchForChangesPlugin);
var ExpressPouchDB;

try {
  ExpressPouchDB = require('express-pouchdb');
} catch (error) {
  console.error('Since version 8.4.0 the module \'express-pouchdb\' is not longer delivered with RxDB.\n' + 'You can install it with \'npm install express-pouchdb\'');
} // we have to clean up after tests so there is no stupid logging
// @link https://github.com/pouchdb/pouchdb-server/issues/226


var PouchdbAllDbs = require('pouchdb-all-dbs');

PouchdbAllDbs(PouchDB);
var APP_OF_DB = new WeakMap();
var SERVERS_OF_DB = new WeakMap();
var DBS_WITH_SERVER = new WeakSet();

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
  var ret = splitted.join('/') + '/';
  if (db.name.startsWith('/')) ret = '/' + ret;
  return ret;
};
/**
 * tunnel requests so collection-names can be used as paths
 */


function tunnelCollectionPath(db, path, app, colName) {
  db[colName].watchForChanges();
  var pathWithSlash = path.endsWith('/') ? path : path + '/';
  var collectionPath = pathWithSlash + colName;
  app.use(collectionPath, function (req, res, next) {
    if (req.baseUrl.endsWith(collectionPath)) {
      var to = normalizeDbName(db) + '-rxdb-0-' + colName;
      var toFull = req.originalUrl.replace(collectionPath, pathWithSlash + to);
      req.originalUrl = toFull;
    }

    next();
  });
}

export function spawnServer(_ref) {
  var _ref$path = _ref.path,
      path = _ref$path === void 0 ? '/db' : _ref$path,
      _ref$port = _ref.port,
      port = _ref$port === void 0 ? 3000 : _ref$port,
      _ref$cors = _ref.cors,
      cors = _ref$cors === void 0 ? false : _ref$cors,
      _ref$startServer = _ref.startServer,
      startServer = _ref$startServer === void 0 ? true : _ref$startServer;
  var db = this;
  var collectionsPath = startServer ? path : '/';
  if (!SERVERS_OF_DB.has(db)) SERVERS_OF_DB.set(db, []);
  var pseudo = PouchDB.defaults({
    adapter: db.adapter,
    prefix: getPrefix(db)
  });
  var app = express();
  APP_OF_DB.set(db, app); // tunnel requests so collection-names can be used as paths

  Object.keys(db.collections).forEach(function (colName) {
    return tunnelCollectionPath(db, collectionsPath, app, colName);
  }); // show error if collection is created afterwards

  DBS_WITH_SERVER.add(db);

  if (cors) {
    app.use(corsFn({
      'origin': function origin(_origin, callback) {
        var originToSend = _origin || '*';
        callback(null, originToSend);
      },
      'credentials': true,
      'methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
    }));
  }

  app.use(collectionsPath, ExpressPouchDB(pseudo));
  var server = null;

  if (startServer) {
    server = app.listen(port);
    SERVERS_OF_DB.get(db).push(server);
  }

  return {
    app: app,
    server: server
  };
}
/**
 * when a server is created, no more collections can be spawned
 */

function ensureNoMoreCollections(args) {
  if (DBS_WITH_SERVER.has(args.database)) {
    var err = newRxError('S1', {
      collection: args.name,
      database: args.database.name
    });
    throw err;
  }
}
/**
 * runs when the database gets destroyed
 */


export function onDestroy(db) {
  if (SERVERS_OF_DB.has(db)) SERVERS_OF_DB.get(db).forEach(function (server) {
    return server.close();
  });
}
export var rxdb = true;
export var prototypes = {
  RxDatabase: function RxDatabase(proto) {
    proto.server = spawnServer;
  }
};
export var hooks = {
  preDestroyRxDatabase: onDestroy,
  preCreateRxCollection: ensureNoMoreCollections
};
export var overwritable = {};
export default {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: hooks,
  spawnServer: spawnServer
};
//# sourceMappingURL=server.js.map