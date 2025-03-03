import { PROMISE_RESOLVE_VOID, promiseWait, errorToPlainJson } from "../../index.js";
export var NON_IMPLEMENTED_OPERATOR_QUERY_BATCH_SIZE = 50;
var DATABASE_STATE_BY_NAME = new Map();
export var RX_STORAGE_NAME_SQLITE = 'sqlite';

/**
 * @link https://www.sqlite.org/inmemorydb.html
 */
export var SQLITE_IN_MEMORY_DB_NAME = ':memory:';
export function getDatabaseConnection(sqliteBasics, databaseName) {
  var state = DATABASE_STATE_BY_NAME.get(databaseName);
  if (!state) {
    state = {
      database: sqliteBasics.open(databaseName),
      sqliteBasics,
      openConnections: 1
    };
    DATABASE_STATE_BY_NAME.set(databaseName, state);
  } else {
    if (state.sqliteBasics !== sqliteBasics && databaseName !== SQLITE_IN_MEMORY_DB_NAME) {
      throw new Error('opened db with different creator method ' + databaseName + ' ' + state.sqliteBasics.debugId + ' ' + sqliteBasics.debugId);
    }
    state.openConnections = state.openConnections + 1;
  }
  return state.database;
}
export function closeDatabaseConnection(databaseName, sqliteBasics) {
  var state = DATABASE_STATE_BY_NAME.get(databaseName);
  if (state) {
    state.openConnections = state.openConnections - 1;
    if (state.openConnections === 0) {
      DATABASE_STATE_BY_NAME.delete(databaseName);
      return state.database.then(db => sqliteBasics.close(db));
    }
  }
}
export function getDataFromResultRow(row) {
  if (!row) {
    return row;
  }
  if (Array.isArray(row)) {
    if (row[4]) {
      return row[4];
    } else {
      return row[0];
    }
  } else {
    return row.data;
  }
}
export function getSQLiteInsertSQL(collectionName, primaryPath, docData) {
  // language=SQL
  var query = "\n        INSERT INTO \"" + collectionName + "\" (\n            id,\n            revision,\n            deleted,\n            lastWriteTime,\n            data\n        ) VALUES (\n            ?,\n            ?,\n            ?,\n            ?,\n            ?\n        );\n    ";
  var params = [docData[primaryPath], docData._rev, docData._deleted ? 1 : 0, docData._meta.lwt, JSON.stringify(docData)];
  return {
    query,
    params,
    context: {
      method: 'getSQLiteInsertSQL',
      data: {
        collectionName,
        primaryPath
      }
    }
  };
}
export function getSQLiteUpdateSQL(tableName, primaryPath, writeRow) {
  var docData = writeRow.document;
  // language=SQL
  var query = "\n    UPDATE \"" + tableName + "\"\n    SET \n        revision = ?,\n        deleted = ?,\n        lastWriteTime = ?,\n        data = json(?)\n    WHERE\n        id = ?\n    ";
  var params = [docData._rev, docData._deleted ? 1 : 0, docData._meta.lwt, JSON.stringify(docData), docData[primaryPath]];
  return {
    query,
    params,
    context: {
      method: 'getSQLiteUpdateSQL',
      data: {
        tableName,
        primaryPath
      }
    }
  };
}
;
var TX_QUEUE_BY_DATABASE = new WeakMap();
export function sqliteTransaction(database, sqliteBasics, handler,
/**
 * Context will be logged
 * if the commit does error.
 */
context) {
  var queue = TX_QUEUE_BY_DATABASE.get(database);
  if (!queue) {
    queue = PROMISE_RESOLVE_VOID;
  }
  queue = queue.then(async () => {
    await openSqliteTransaction(database, sqliteBasics);
    var handlerResult = await handler();
    await finishSqliteTransaction(database, sqliteBasics, handlerResult, context);
  });
  TX_QUEUE_BY_DATABASE.set(database, queue);
  return queue;
}

/**
 * TODO instead of doing a while loop, we should find a way to listen when the
 * other transaction is committed.
 */
export async function openSqliteTransaction(database, sqliteBasics) {
  var openedTransaction = false;
  while (!openedTransaction) {
    try {
      await sqliteBasics.run(database, {
        query: 'BEGIN;',
        params: [],
        context: {
          method: 'openSqliteTransaction',
          data: ''
        }
      });
      openedTransaction = true;
    } catch (err) {
      console.log('open transaction error (will retry):');
      var errorAsJson = errorToPlainJson(err);
      console.log(errorAsJson);
      console.dir(err);
      if (err.message && (err.message.includes('Database is closed') || err.message.includes('API misuse'))) {
        throw err;
      }
      // wait one tick to not fully block the cpu on errors.
      await promiseWait(0);
    }
  }
  return;
}
export function finishSqliteTransaction(database, sqliteBasics, mode,
/**
 * Context will be logged
 * if the commit does error.
 */
context) {
  return sqliteBasics.run(database, {
    query: mode + ';',
    params: [],
    context: {
      method: 'finishSqliteTransaction',
      data: mode
    }
  }).catch(err => {
    if (context) {
      console.error('cannot close transaction (mode: ' + mode + ')');
      console.log(JSON.stringify(context, null, 4));
    }
    throw err;
  });
}
export var PARAM_KEY = '?';
export function ensureParamsCountIsCorrect(queryWithParams) {
  var paramsCount = queryWithParams.params.length;
  var paramKeyCount = queryWithParams.query.split(PARAM_KEY).length - 1;
  if (paramsCount !== paramKeyCount) {
    throw new Error('ensureParamsCountIsCorrect() wrong param count: ' + JSON.stringify(queryWithParams));
  }
}

/**
 * SQLite itself does not know about boolean types
 * and uses integers instead.
 * So some libraries need to bind integers and fail on booleans.
 * @link https://stackoverflow.com/a/2452569/3443137
 * This method transforms all boolean params to the
 * correct int representation.
 */
export function boolParamsToInt(params) {
  return params.map(p => {
    if (typeof p === 'boolean') {
      if (p) {
        return 1;
      } else {
        return 0;
      }
    } else {
      return p;
    }
  });
}
//# sourceMappingURL=sqlite-helpers.js.map