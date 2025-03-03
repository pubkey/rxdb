"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EMPTY_FUNCTION = void 0;
exports.closeSQLiteDatabaseNode = closeSQLiteDatabaseNode;
exports.execSqlSQLiteNode = execSqlSQLiteNode;
exports.getSQLiteBasicsCapacitor = getSQLiteBasicsCapacitor;
exports.getSQLiteBasicsExpoSQLite = getSQLiteBasicsExpoSQLite;
exports.getSQLiteBasicsExpoSQLiteAsync = getSQLiteBasicsExpoSQLiteAsync;
exports.getSQLiteBasicsNode = getSQLiteBasicsNode;
exports.getSQLiteBasicsNodeNative = getSQLiteBasicsNodeNative;
exports.getSQLiteBasicsQuickSQLite = getSQLiteBasicsQuickSQLite;
exports.getSQLiteBasicsWasm = getSQLiteBasicsWasm;
exports.getSQLiteBasicsWebSQL = getSQLiteBasicsWebSQL;
exports.mapNodeNativeParams = mapNodeNativeParams;
exports.webSQLExecuteQuery = webSQLExecuteQuery;
var _index = require("../../index.js");
var _sqliteHelpers = require("./sqlite-helpers.js");
var BASICS_BY_SQLITE_LIB = new WeakMap();
function getSQLiteBasicsNode(sqlite3) {
  var basics = BASICS_BY_SQLITE_LIB.get(sqlite3);
  if (!basics) {
    basics = {
      open: name => Promise.resolve(new sqlite3.Database(name)),
      async run(db, queryWithParams) {
        if (!Array.isArray(queryWithParams.params)) {
          console.dir(queryWithParams);
          throw new Error('no params array given for query: ' + queryWithParams.query);
        }
        await execSqlSQLiteNode(db, queryWithParams, 'run');
      },
      async all(db, queryWithParams) {
        var result = await execSqlSQLiteNode(db, queryWithParams, 'all');
        return result;
      },
      async setPragma(db, key, value) {
        return await execSqlSQLiteNode(db, {
          query: 'PRAGMA ' + key + ' = ' + value,
          params: [],
          context: {
            method: 'setPragma',
            data: {
              key,
              value
            }
          }
        }, 'run');
      },
      async close(db) {
        return await closeSQLiteDatabaseNode(db);
      },
      journalMode: 'WAL2'
    };
    BASICS_BY_SQLITE_LIB.set(sqlite3, basics);
  }
  return basics;
}

/**
 * Uses the native sqlite that comes sshipped with node version 22+
 * @link https://nodejs.org/api/sqlite.html
 */
function getSQLiteBasicsNodeNative(
// Pass the `sqlite.DatabaseSync` method here
constructor) {
  return {
    open: async name => {
      var db = new constructor(name);
      return db;
    },
    all: async (db, queryWithParams) => {
      await (0, _index.promiseWait)(0); // TODO we should not need this
      var prepared = db.prepare(queryWithParams.query);
      var result = await prepared.all(...mapNodeNativeParams(queryWithParams.params));
      return result;
    },
    run: async (db, queryWithParams) => {
      var prepared = db.prepare(queryWithParams.query);
      await prepared.run(...mapNodeNativeParams(queryWithParams.params));
    },
    setPragma: async (db, key, value) => {
      await db.exec("pragma " + key + " = " + value + ";");
    },
    close: async db => {
      return db.close();
    },
    journalMode: 'WAL'
  };
}
;

/**
 * For unknown reason we cannot bind boolean values
 * and have to map them to one and zero.
 * TODO create an issue at Node.js
 */
function mapNodeNativeParams(params) {
  return params.map(param => {
    if (typeof param === 'boolean') {
      if (param) {
        return 1;
      } else {
        return 0;
      }
    } else {
      return param;
    }
  });
}

/**
 * Promisified version of db.run()
 */
function execSqlSQLiteNode(database, queryWithParams, operator) {
  var debug = false;
  var resolved = false;
  return new Promise((res, rej) => {
    if (debug) {
      console.log('# execSqlSQLiteNode() ' + queryWithParams.query);
    }
    database[operator](queryWithParams.query, queryWithParams.params, (err, result) => {
      if (resolved) {
        throw new Error('callback called multiple times ' + queryWithParams.query);
      }
      resolved = true;
      if (err) {
        if (debug) {
          console.log('---- ERROR RUNNING SQL:');
          console.log(queryWithParams.query);
          console.dir(queryWithParams.params);
          console.dir(err);
          console.log('----');
        }
        rej(err);
      } else {
        if (debug) {
          console.log('execSql() result: ' + database.eventNames());
          console.log(queryWithParams.query);
          console.dir(result);
          console.log('execSql() result:');
          console.log(queryWithParams.query);
          console.dir(queryWithParams.params);
          console.log('execSql() result -------------------------');
        }
        res(result);
      }
    });
  });
}
function closeSQLiteDatabaseNode(database) {
  return new Promise((res, rej) => {
    var resolved = false;
    database.close(err => {
      if (resolved) {
        throw new Error('close() callback called multiple times');
      }
      resolved = true;
      if (err && !err.message.includes('Database is closed')) {
        rej(err);
      } else {
        res();
      }
    });
  });
}
var BASICS_BY_SQLITE_LIB_CAPACITOR = new WeakMap();
var CAPACITOR_CONNECTION_BY_NAME = new Map();
/**
 * In capacitor it is not allowed to reopen an already
 * open database connection. So we have to queue the open-close
 * calls so that they do not run in parallel and we do not open&close
 * database connections at the same time.
 */
var capacitorOpenCloseQueue = _index.PROMISE_RESOLVE_VOID;
function getSQLiteBasicsCapacitor(sqlite, capacitorCore) {
  var basics = (0, _index.getFromMapOrCreate)(BASICS_BY_SQLITE_LIB_CAPACITOR, sqlite, () => {
    var innerBasics = {
      open(dbName) {
        capacitorOpenCloseQueue = capacitorOpenCloseQueue.then(async () => {
          var db = await (0, _index.getFromMapOrCreate)(CAPACITOR_CONNECTION_BY_NAME, dbName, () => sqlite.createConnection(dbName, false, 'no-encryption', 1));
          await db.open();
          return db;
        });
        return capacitorOpenCloseQueue;
      },
      async run(db, queryWithParams) {
        await db.run(queryWithParams.query, queryWithParams.params, false);
      },
      async all(db, queryWithParams) {
        var result = await db.query(queryWithParams.query, queryWithParams.params);
        return (0, _index.ensureNotFalsy)(result.values);
      },
      setPragma(db, key, value) {
        return db.execute('PRAGMA ' + key + ' = ' + value, false);
      },
      close(db) {
        capacitorOpenCloseQueue = capacitorOpenCloseQueue.then(() => {
          return db.close();
        });
        return capacitorOpenCloseQueue;
      },
      /**
       * On android, there is already WAL mode set.
       * So we do not have to set it by our own.
       * @link https://github.com/capacitor-community/sqlite/issues/258#issuecomment-1102966087
       */
      journalMode: capacitorCore.getPlatform() === 'android' ? '' : 'WAL'
    };
    return innerBasics;
  });
  return basics;
}
var EMPTY_FUNCTION = () => {};
exports.EMPTY_FUNCTION = EMPTY_FUNCTION;
function getSQLiteBasicsQuickSQLite(openDB) {
  return {
    open: async name => {
      return await openDB({
        name
      });
    },
    all: async (db, queryWithParams) => {
      var result = await db.executeAsync(queryWithParams.query, queryWithParams.params);
      return result.rows._array;
    },
    run: (db, queryWithParams) => {
      return db.executeAsync(queryWithParams.query, queryWithParams.params);
    },
    setPragma(db, key, value) {
      return db.executeAsync('PRAGMA ' + key + ' = ' + value, []);
    },
    close: async db => {
      return await db.close(EMPTY_FUNCTION, EMPTY_FUNCTION);
    },
    journalMode: ''
  };
}

/**
 * @deprecated Use getSQLiteBasicsExpoSQLiteAsync() instead
 */
function getSQLiteBasicsExpoSQLite(openDB, options, directory) {
  return {
    open: async name => {
      return await openDB(name, options, directory);
    },
    all: (db, queryWithParams) => {
      var result = new Promise((resolve, reject) => {
        db.exec([{
          sql: queryWithParams.query,
          args: queryWithParams.params
        }], false, (err, res) => {
          if (err) {
            return reject(err);
          }
          if (Array.isArray(res)) {
            var queryResult = res[0]; // there is only one query
            if (Object.prototype.hasOwnProperty.call(queryResult, 'rows')) {
              return resolve(queryResult.rows);
            }
            return reject(queryResult.error);
          }
          return reject(new Error("getSQLiteBasicsExpoSQLite.all() response is not an array: " + res));
        });
      });
      return result;
    },
    run: (db, queryWithParams) => {
      return new Promise((resolve, reject) => {
        db.exec([{
          sql: queryWithParams.query,
          args: queryWithParams.params
        }], false, (err, res) => {
          if (err) {
            return reject(err);
          }
          if (Array.isArray(res) && res[0] && res[0].error) {
            return reject(res);
          } else {
            resolve(res);
          }
          ;
        });
      });
    },
    setPragma(db, key, value) {
      return new Promise((resolve, reject) => {
        db.exec([{
          sql: "pragma " + key + " = " + value + ";",
          args: []
        }], false, (err, res) => {
          if (err) {
            return reject(err);
          }
          if (Array.isArray(res) && res[0] && res[0].error) {
            return reject(res);
          } else {
            resolve(res);
          }
          ;
        });
      });
    },
    close: async db => {
      return await db.closeAsync();
    },
    journalMode: ''
  };
}
;

/**
 * @link https://docs.expo.dev/versions/latest/sdk/sqlite/
 */
function getSQLiteBasicsExpoSQLiteAsync(openDB, options, directory) {
  return {
    open: async name => {
      return await openDB(name, options, directory);
    },
    all: async (db, queryWithParams) => {
      var result = await db.getAllAsync(queryWithParams.query, queryWithParams.params);
      return result;
    },
    run: async (db, queryWithParams) => {
      var ret = await db.runAsync(queryWithParams.query, queryWithParams.params);
      return ret;
    },
    async setPragma(db, key, value) {
      await db.execAsync('PRAGMA ' + key + ' = ' + value);
    },
    close: async db => {
      return await db.closeAsync();
    },
    journalMode: ''
  };
}
;

/**
 * Build to be compatible with packages
 * that use the websql npm package like:
 * @link https://www.npmjs.com/package/react-native-sqlite-2
 * @link https://www.npmjs.com/package/websql
 * Use like:
 * import SQLite from 'react-native-sqlite-2';
 * getRxStorageSQLite({
 *   sqliteBasics: getSQLiteBasicsWebSQL(SQLite.openDatabase)
 * });
 *
 */
function getSQLiteBasicsWebSQL(openDB) {
  return {
    open: async name => {
      var webSQLDatabase = await openDB(name, '1.0', '', 1);
      return (0, _index.ensureNotFalsy)(webSQLDatabase._db);
    },
    all: async (db, queryWithParams) => {
      var rawResult = await webSQLExecuteQuery(db, queryWithParams);
      var rows = Array.from(rawResult.rows);
      return rows;
    },
    run: async (db, queryWithParams) => {
      await webSQLExecuteQuery(db, queryWithParams);
    },
    setPragma: async (db, key, value) => {
      await webSQLExecuteQuery(db, {
        query: "pragma " + key + " = " + value + ";",
        params: [],
        context: {
          method: 'setPragma',
          data: {
            key,
            value
          }
        }
      }).catch(err => {
        /**
         * WebSQL in the browser does not allow us to set any pragma
         * so we have to catch the error.
         * @link https://stackoverflow.com/a/10298712/3443137
         */
        if (err.message.includes('23 not authorized')) {
          return;
        }
        throw err;
      });
    },
    close: async db => {
      /**
       * The WebSQL API itself has no close() method.
       * But some libraries have different custom close methods.
       */
      if (typeof db.closeAsync === 'function') {
        return await db.closeAsync();
      }
      if (typeof db.close === 'function') {
        return await db.close();
      }
    },
    journalMode: ''
  };
}
;
function webSQLExecuteQuery(db, queryWithParams) {
  return new Promise((resolve, reject) => {
    db.exec([{
      sql: queryWithParams.query,
      args: queryWithParams.params
    }], false, (err, res) => {
      if (err) {
        return reject(err);
      }
      if (Array.isArray(res) && res[0] && res[0].error) {
        return reject(res[0].error);
      } else {
        return resolve(res[0]);
      }
      ;
    });
  });
}

/**
 * Build to be compatible with packages
 * that use SQLite compiled to webassembly:
 * @link https://github.com/rhashimoto/wa-sqlite
 * Use like:
 * ```ts
 * import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
 * const sqliteWasm = await sqlite3InitModule();
 * getSQLiteBasicsWasm({ dbConstructor: sqliteWasm.oo1.DB });
 * ```
 *
 */

/**
 * TODO the wa-sqlite module has problems
 * when running prepared statements with params
 * in parallel. So we de-parrallel the runs here.
 * This is bad for performance and should be fixed at the
 * wa-sqlite repo.
 */
var runQueueWasmSQLite = _index.PROMISE_RESOLVE_VOID;
function getSQLiteBasicsWasm(sqlite3) {
  var debugId = (0, _index.randomToken)(5);
  console.log('getSQLiteBasicsWasm() debugId: ' + debugId);
  return {
    debugId,
    open: name => {
      var newQueue = runQueueWasmSQLite.then(async () => {
        var dbNr = await sqlite3.open_v2(name);
        return {
          nr: dbNr,
          name
        };
      });
      runQueueWasmSQLite = newQueue.catch(() => {});
      return newQueue;
    },
    all: (db, queryWithParams) => {
      var newQueue = runQueueWasmSQLite.then(async () => {
        var result = await sqlite3.execWithParams(db.nr, queryWithParams.query, (0, _sqliteHelpers.boolParamsToInt)(queryWithParams.params));
        return result.rows;
      });
      runQueueWasmSQLite = newQueue.catch(() => {});
      return newQueue;
    },
    run: (db, queryWithParams) => {
      var newQueue = runQueueWasmSQLite.then(async () => {
        await sqlite3.run(db.nr, queryWithParams.query, queryWithParams.params);
        // return new Promise(async (res) => {
        //     console.log('run start! ' + queryWithParams.query);
        //     const runResult = await sqlite3.run(db.nr, queryWithParams, (a1: any, a2: any) => {
        //         console.log('run result ccallback:');
        //         console.log(JSON.stringify({ a1, a2 }));
        //         res();
        //     });
        //     console.log('runResult:');
        //     console.log(JSON.stringify(runResult));
        // });
      });
      runQueueWasmSQLite = newQueue.catch(() => {});
      return newQueue;
    },
    setPragma: (db, key, value) => {
      var newQueue = runQueueWasmSQLite.then(async () => {
        await sqlite3.exec(db.nr, "pragma " + key + " = " + value + ";");
      });
      runQueueWasmSQLite = newQueue.catch(() => {});
      return newQueue;
    },
    close: db => {
      var newQueue = runQueueWasmSQLite.then(async () => {
        await sqlite3.close(db.nr);
      });
      runQueueWasmSQLite = newQueue.catch(() => {});
      return newQueue;
    },
    journalMode: 'WAL'
  };
}
;
//# sourceMappingURL=sqlite-basics-helpers.js.map