"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spawnServer = spawnServer;
exports.onDestroy = onDestroy;
exports["default"] = exports.overwritable = exports.hooks = exports.prototypes = exports.rxdb = void 0;

var _express = _interopRequireDefault(require("express"));

var _expressPouchdb = _interopRequireDefault(require("express-pouchdb"));

var _cors = _interopRequireDefault(require("cors"));

var _pouchDb = _interopRequireDefault(require("../pouch-db"));

var _rxError = _interopRequireDefault(require("../rx-error"));

var _core = _interopRequireDefault(require("../core"));

var _replication = _interopRequireDefault(require("./replication"));

var _watchForChanges = _interopRequireDefault(require("./watch-for-changes"));

_core["default"].plugin(_replication["default"]);

_core["default"].plugin(_watchForChanges["default"]); // we have to clean up after tests so there is no stupid logging
// @link https://github.com/pouchdb/pouchdb-server/issues/226


var PouchdbAllDbs = require('pouchdb-all-dbs');

PouchdbAllDbs(_pouchDb["default"]);
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
}

function spawnServer(_ref) {
  var _ref$path = _ref.path,
      path = _ref$path === void 0 ? '/db' : _ref$path,
      _ref$port = _ref.port,
      port = _ref$port === void 0 ? 3000 : _ref$port,
      _ref$cors = _ref.cors,
      cors = _ref$cors === void 0 ? false : _ref$cors;
  var db = this;
  if (!SERVERS_OF_DB.has(db)) SERVERS_OF_DB.set(db, []);

  var pseudo = _pouchDb["default"].defaults({
    adapter: db.adapter,
    prefix: getPrefix(db)
  });

  var app = (0, _express["default"])();
  APP_OF_DB.set(db, app); // tunnel requests so collection-names can be used as paths

  Object.keys(db.collections).forEach(function (colName) {
    return tunnelCollectionPath(db, path, app, colName);
  }); // show error if collection is created afterwards

  DBS_WITH_SERVER.add(db);

  if (cors) {
    ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'].map(function (method) {
      return method.toLowerCase();
    }).forEach(function (method) {
      return app[method]('*', (0, _cors["default"])());
    });
  }

  app.use(path, (0, _expressPouchdb["default"])(pseudo));
  var server = app.listen(port);
  SERVERS_OF_DB.get(db).push(server);
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
    var err = _rxError["default"].newRxError('S1', {
      collection: args.name,
      database: args.database.name
    });

    throw err;
  }
}
/**
 * runs when the database gets destroyed
 */


function onDestroy(db) {
  if (SERVERS_OF_DB.has(db)) SERVERS_OF_DB.get(db).forEach(function (server) {
    return server.close();
  });
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxDatabase: function RxDatabase(proto) {
    proto.server = spawnServer;
  }
};
exports.prototypes = prototypes;
var hooks = {
  preDestroyRxDatabase: onDestroy,
  preCreateRxCollection: ensureNoMoreCollections
};
exports.hooks = hooks;
var overwritable = {};
exports.overwritable = overwritable;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: hooks,
  spawnServer: spawnServer
};
exports["default"] = _default;
