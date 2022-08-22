"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBServerCouchDBPlugin = void 0;
exports.onDestroy = onDestroy;
exports.spawnServer = void 0;

var os = _interopRequireWildcard(require("os"));

var nodePath = _interopRequireWildcard(require("path"));

var _express = _interopRequireDefault(require("express"));

var _cors = _interopRequireDefault(require("cors"));

var _pouchdb = require("../plugins/pouchdb");

var _rxError = require("../rx-error");

var _replicationCouchdb = require("./replication-couchdb");

var _pouchdbAdapterHttp = _interopRequireDefault(require("pouchdb-adapter-http"));

var _index = require("../index");

var _util = require("../util");

function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }

        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }

    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }

    pact.s = state;
    pact.v = value;
    var observer = pact.o;

    if (observer) {
      observer(pact);
    }
  }
}

var _Pact = /*#__PURE__*/function () {
  function _Pact() {}

  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;

    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;

      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }

        return result;
      } else {
        return this;
      }
    }

    this.o = function (_this) {
      try {
        var value = _this.v;

        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };

    return result;
  };

  return _Pact;
}();

function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}

function _for(test, update, body) {
  var stage;

  for (;;) {
    var shouldContinue = test();

    if (_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }

    if (!shouldContinue) {
      return result;
    }

    if (shouldContinue.then) {
      stage = 0;
      break;
    }

    var result = body();

    if (result && result.then) {
      if (_isSettledPact(result)) {
        result = result.s;
      } else {
        stage = 1;
        break;
      }
    }

    if (update) {
      var updateValue = update();

      if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
        stage = 2;
        break;
      }
    }
  }

  var pact = new _Pact();

  var reject = _settle.bind(null, pact, 2);

  (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
  return pact;

  function _resumeAfterBody(value) {
    result = value;

    do {
      if (update) {
        updateValue = update();

        if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
          updateValue.then(_resumeAfterUpdate).then(void 0, reject);
          return;
        }
      }

      shouldContinue = test();

      if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.v) {
        _settle(pact, 1, result);

        return;
      }

      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }

      result = body();

      if (_isSettledPact(result)) {
        result = result.v;
      }
    } while (!result || !result.then);

    result.then(_resumeAfterBody).then(void 0, reject);
  }

  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      result = body();

      if (result && result.then) {
        result.then(_resumeAfterBody).then(void 0, reject);
      } else {
        _resumeAfterBody(result);
      }
    } else {
      _settle(pact, 1, result);
    }
  }

  function _resumeAfterUpdate() {
    if (shouldContinue = test()) {
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _resumeAfterTest(shouldContinue);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
}

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var spawnServer = function spawnServer(_ref) {
  try {
    var _this2 = this;

    var _ref$path = _ref.path,
        path = _ref$path === void 0 ? '/db' : _ref$path,
        _ref$port = _ref.port,
        port = _ref$port === void 0 ? 3000 : _ref$port,
        _ref$cors = _ref.cors,
        cors = _ref$cors === void 0 ? false : _ref$cors,
        _ref$startServer = _ref.startServer,
        startServer = _ref$startServer === void 0 ? true : _ref$startServer,
        _ref$pouchdbExpressOp = _ref.pouchdbExpressOptions,
        pouchdbExpressOptions = _ref$pouchdbExpressOp === void 0 ? {} : _ref$pouchdbExpressOp;
    var db = _this2;
    var collectionsPath = startServer ? path : '/';

    if (!SERVERS_OF_DB.has(db)) {
      SERVERS_OF_DB.set(db, []);
    }

    var storage = db.storage;

    if (!storage.adapter) {
      throw new Error('The RxDB server plugin only works with pouchdb storage.');
    }

    var adapterObj = (0, _index.adapterObject)(storage.adapter);
    var pouchDBOptions = Object.assign({
      prefix: getPrefix(db),
      log: false
    }, adapterObj);

    var pseudo = _pouchdb.PouchDB.defaults(pouchDBOptions);

    var app = (0, _express["default"])();
    APP_OF_DB.set(db, app);
    Object.keys(db.collections).forEach(function (colName) {
      // tunnel requests so collection-names can be used as paths
      tunnelCollectionPath(db, collectionsPath, app, colName);
    }); // remember to throw error if collection is created after the server is already there

    DBS_WITH_SERVER.add(db);

    if (cors) {
      app.use((0, _cors["default"])({
        'origin': function origin(_origin, callback) {
          var originToSend = _origin || '*';
          callback(null, originToSend);
        },
        'credentials': true,
        'methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
      }));
    }
    /**
     * Overwrite the defaults of PouchDBExpressServerOptions.
     * In RxDB the defaults should not polute anything with folders so we store the config in memory
     * and the logs in the tmp folder of the os.
     */


    var usePouchExpressOptions = (0, _util.flatClone)(pouchdbExpressOptions);

    if (typeof usePouchExpressOptions.inMemoryConfig === 'undefined') {
      usePouchExpressOptions.inMemoryConfig = true;
    }

    if (typeof usePouchExpressOptions.logPath === 'undefined') {
      usePouchExpressOptions.logPath = nodePath.join(os.tmpdir(), 'rxdb-server-log.txt');
    }

    var pouchApp = ExpressPouchDB(pseudo, usePouchExpressOptions);
    app.use(collectionsPath, pouchApp);
    var server = null;
    var startupPromise = _util.PROMISE_RESOLVE_VOID;

    if (startServer) {
      /**
       * Listen for errors on server startup.
       * and properly handle the error instead of returning a startupPromise
       */
      startupPromise = new Promise(function (res, rej) {
        var answered = false;
        server = app.listen(port, function () {
          if (!answered) {
            answered = true;
            res();
          }
        });
        server.on('error', function (err) {
          if (!answered) {
            answered = true;
            rej(err);
          }
        });
      });
      SERVERS_OF_DB.get(db).push(server);
      /**
       * When the database has no documents, there is no db file
       * and so the replication would not work.
       * This is a hack which ensures that the couchdb instance exists
       * and we can replicate even if there is no document in the beginning.
       */

      Promise.all(Object.values(db.collections).map(function (collection) {
        try {
          var url = 'http://localhost:' + port + collectionsPath + '/' + collection.name;

          var _temp10 = _catch(function () {
            var pingDb = new _pouchdb.PouchDB(url);
            return Promise.resolve(pingDb.info()).then(function () {
              return Promise.resolve(pingDb.close()).then(function () {});
            });
          }, function () {});

          return Promise.resolve(_temp10 && _temp10.then ? _temp10.then(function () {}) : void 0);
        } catch (e) {
          return Promise.reject(e);
        }
      }));
    }

    return Promise.resolve(startupPromise).then(function () {
      var response = {
        app: app,
        pouchApp: pouchApp,
        server: server
      };
      return response;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * when a server is created, no more collections can be spawned
 */


exports.spawnServer = spawnServer;
var ExpressPouchDB;

try {
  ExpressPouchDB = require('express-pouchdb');
} catch (error) {
  console.error('Since version 8.4.0 the module \'express-pouchdb\' is not longer delivered with RxDB.\n' + 'You can install it with \'npm install express-pouchdb\'');
} // we have to clean up after tests so there is no stupid logging
// @link https://github.com/pouchdb/pouchdb-server/issues/226


var PouchdbAllDbs = require('pouchdb-all-dbs');

PouchdbAllDbs(_pouchdb.PouchDB);
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

  if (splitted.length === 0) {
    return '';
  }

  var ret = splitted.join('/') + '/';

  if (db.name.startsWith('/')) {
    ret = '/' + ret;
  }

  return ret;
};
/**
 * tunnel requests so collection-names can be used as paths
 */


function tunnelCollectionPath(db, path, app, colName) {
  var pathWithSlash = path.endsWith('/') ? path : path + '/';
  var collectionPath = pathWithSlash + colName;
  app.use(collectionPath, function (req, res, next) {
    try {
      var _temp5 = function _temp5() {
        next();
      };

      var _temp6 = function () {
        if (req.baseUrl.endsWith(collectionPath)) {
          var _temp7 = function _temp7() {
            var to = normalizeDbName(db) + '-rxdb-' + db[colName].schema.version + '-' + colName;
            var toFull = req.originalUrl.replace(collectionPath, pathWithSlash + to);
            req.originalUrl = toFull;
          };

          var _temp8 = _for(function () {
            return !db[colName];
          }, void 0, function () {
            // if the collection is migrated,
            // it can happen that it does not exist at this moment
            return Promise.resolve(new Promise(function (res1) {
              return setTimeout(res1, 50);
            })).then(function () {});
          });

          return _temp8 && _temp8.then ? _temp8.then(_temp7) : _temp7(_temp8);
        }
      }();

      return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(_temp5) : _temp5(_temp6));
    } catch (e) {
      return Promise.reject(e);
    }
  });
}

function ensureNoMoreCollections(args) {
  if (DBS_WITH_SERVER.has(args.database)) {
    var err = (0, _rxError.newRxError)('S1', {
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
  if (SERVERS_OF_DB.has(db)) {
    SERVERS_OF_DB.get(db).forEach(function (server) {
      return server.close();
    });
  }
}

var RxDBServerCouchDBPlugin = {
  name: 'server-couchdb',
  rxdb: true,
  init: function init() {
    (0, _pouchdb.addPouchPlugin)(_pouchdbAdapterHttp["default"]);
    (0, _index.addRxPlugin)(_replicationCouchdb.RxDBReplicationCouchDBPlugin);
  },
  prototypes: {
    RxDatabase: function RxDatabase(proto) {
      proto.serverCouchDB = spawnServer;
    }
  },
  overwritable: {},
  hooks: {
    preDestroyRxDatabase: {
      after: onDestroy
    },
    preCreateRxCollection: {
      after: ensureNoMoreCollections
    }
  }
};
exports.RxDBServerCouchDBPlugin = RxDBServerCouchDBPlugin;
//# sourceMappingURL=server-couchdb.js.map