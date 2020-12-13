import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import express from 'express';
import corsFn from 'cors';
import { PouchDB } from '../pouch-db';
import { newRxError } from '../rx-error';
import { addRxPlugin } from '../core';
import { RxDBReplicationPlugin } from './replication';
addRxPlugin(RxDBReplicationPlugin);
import { RxDBWatchForChangesPlugin } from './watch-for-changes';
addRxPlugin(RxDBWatchForChangesPlugin);
import PouchAdapterHttp from 'pouchdb-adapter-http';
addRxPlugin(PouchAdapterHttp);
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
  app.use(collectionPath, /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(req, res, next) {
      var to, toFull;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!req.baseUrl.endsWith(collectionPath)) {
                _context.next = 9;
                break;
              }

            case 1:
              if (db[colName]) {
                _context.next = 6;
                break;
              }

              _context.next = 4;
              return new Promise(function (res1) {
                return setTimeout(res1, 50);
              });

            case 4:
              _context.next = 1;
              break;

            case 6:
              to = normalizeDbName(db) + '-rxdb-' + db[colName].schema.version + '-' + colName;
              toFull = req.originalUrl.replace(collectionPath, pathWithSlash + to);
              req.originalUrl = toFull;

            case 9:
              next();

            case 10:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function (_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }());
}

export function spawnServer(_ref2) {
  var _ref2$path = _ref2.path,
      path = _ref2$path === void 0 ? '/db' : _ref2$path,
      _ref2$port = _ref2.port,
      port = _ref2$port === void 0 ? 3000 : _ref2$port,
      _ref2$cors = _ref2.cors,
      cors = _ref2$cors === void 0 ? false : _ref2$cors,
      _ref2$startServer = _ref2.startServer,
      startServer = _ref2$startServer === void 0 ? true : _ref2$startServer,
      _ref2$pouchdbExpressO = _ref2.pouchdbExpressOptions,
      pouchdbExpressOptions = _ref2$pouchdbExpressO === void 0 ? {} : _ref2$pouchdbExpressO;
  var db = this;
  var collectionsPath = startServer ? path : '/';
  if (!SERVERS_OF_DB.has(db)) SERVERS_OF_DB.set(db, []);
  var pseudo = PouchDB.defaults({
    adapter: db.adapter,
    prefix: getPrefix(db),
    log: false
  });
  var app = express();
  APP_OF_DB.set(db, app); // tunnel requests so collection-names can be used as paths

  Object.keys(db.collections).forEach(function (colName) {
    return tunnelCollectionPath(db, collectionsPath, app, colName);
  }); // remember to throw error if collection is created after the server is already there

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

  var pouchApp = ExpressPouchDB(pseudo, pouchdbExpressOptions);
  app.use(collectionsPath, pouchApp);
  var server = null;

  if (startServer) {
    server = app.listen(port);
    SERVERS_OF_DB.get(db).push(server);
    /**
     * When the database has no documents, there is no db file
     * and so the replication would not work.
     * This is a hack which ensures that the couchdb instance exists
     * and we can replicate even if there is no document.
     */

    Promise.all(Object.values(db.collections).map( /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(collection) {
        var url, pingDb;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                url = 'http://localhost:' + port + collectionsPath + '/' + collection.name;
                _context2.prev = 1;
                pingDb = new PouchDB(url);
                _context2.next = 5;
                return pingDb.info();

              case 5:
                _context2.next = 7;
                return pingDb.close();

              case 7:
                _context2.next = 11;
                break;

              case 9:
                _context2.prev = 9;
                _context2.t0 = _context2["catch"](1);

              case 11:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, null, [[1, 9]]);
      }));

      return function (_x4) {
        return _ref3.apply(this, arguments);
      };
    }()));
  }

  return {
    app: app,
    pouchApp: pouchApp,
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
  if (SERVERS_OF_DB.has(db)) {
    SERVERS_OF_DB.get(db).forEach(function (server) {
      return server.close();
    });
  }
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
export var RxDBServerPlugin = {
  name: 'server',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: hooks
};
//# sourceMappingURL=server.js.map