import _readOnlyError from "@babel/runtime/helpers/readOnlyError";
import { getPrimaryFieldOfPrimaryKey, categorizeBulkWriteRows, ensureNotFalsy, addRxStorageMultiInstanceSupport, promiseWait, getQueryMatcher } from "../../index.js";
import { BehaviorSubject, Subject, filter, firstValueFrom } from 'rxjs';
import { closeDatabaseConnection, ensureParamsCountIsCorrect, getDatabaseConnection, getSQLiteUpdateSQL, RX_STORAGE_NAME_SQLITE, sqliteTransaction, getDataFromResultRow, getSQLiteInsertSQL, TX_QUEUE_BY_DATABASE } from "./sqlite-helpers.js";
import { getSortComparator } from "../../rx-query-helper.js";
import { newRxError } from "../../rx-error.js";
var instanceId = 0;
export var RxStorageInstanceSQLite = /*#__PURE__*/function () {
  function RxStorageInstanceSQLite(storage, databaseName, collectionName, schema, internals, options, settings, tableName, devMode) {
    this.changes$ = new Subject();
    this.instanceId = instanceId++;
    this.openWriteCount$ = new BehaviorSubject(0);
    this.opCount = 0;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.tableName = tableName;
    this.devMode = devMode;
    this.sqliteBasics = storage.settings.sqliteBasics;
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
  }
  var _proto = RxStorageInstanceSQLite.prototype;
  _proto.run = function run(db, queryWithParams) {
    if (this.devMode) {
      ensureParamsCountIsCorrect(queryWithParams);
    }
    return this.sqliteBasics.run(db, queryWithParams);
  };
  _proto.all = function all(db, queryWithParams) {
    if (this.devMode) {
      ensureParamsCountIsCorrect(queryWithParams);
    }
    this.opCount = this.opCount + 1;
    if (this.opCount > 110) {
      throw newRxError('SQL3');
    }
    return this.sqliteBasics.all(db, queryWithParams);
  }

  /**
   * @link https://medium.com/@JasonWyatt/squeezing-performance-from-sqlite-insertions-971aff98eef2
   */;
  _proto.bulkWrite = async function bulkWrite(documentWrites, context) {
    this.openWriteCount$.next(this.openWriteCount$.getValue() + 1);
    var database = await this.internals.databasePromise;
    var ret = {
      error: []
    };
    var writePromises = [];
    var categorized = {};
    await sqliteTransaction(database, this.sqliteBasics, async () => {
      if (this.closed) {
        this.openWriteCount$.next(this.openWriteCount$.getValue() - 1);
        throw new Error('SQLite.bulkWrite(' + context + ') already closed ' + this.tableName + ' context: ' + context);
      }
      var result = await this.all(database, {
        query: "SELECT data FROM \"" + this.tableName + "\"",
        params: [],
        context: {
          method: 'bulkWrite',
          data: documentWrites
        }
      });
      var docsInDb = new Map();
      result.forEach(docSQLResult => {
        var doc = JSON.parse(getDataFromResultRow(docSQLResult));
        var id = doc[this.primaryPath];
        docsInDb.set(id, doc);
      });
      categorized = categorizeBulkWriteRows(this, this.primaryPath, docsInDb, documentWrites, context);
      ret.error = categorized.errors;
      if (result.length + categorized.bulkInsertDocs.length > 300) {
        throw newRxError('SQL2');
      }
      categorized.bulkInsertDocs.forEach(row => {
        var insertQuery = getSQLiteInsertSQL(this.tableName, this.primaryPath, row.document);
        writePromises.push(this.all(database, {
          query: insertQuery.query,
          params: insertQuery.params,
          context: {
            method: 'bulkWrite',
            data: categorized
          }
        }));
      });
      categorized.bulkUpdateDocs.forEach(row => {
        var updateQuery = getSQLiteUpdateSQL(this.tableName, this.primaryPath, row);
        writePromises.push(this.run(database, updateQuery));
      });
      await Promise.all(writePromises);

      // close transaction
      if (this.closed) {
        this.openWriteCount$.next(this.openWriteCount$.getValue() - 1);
        return 'ROLLBACK';
      } else {
        this.openWriteCount$.next(this.openWriteCount$.getValue() - 1);
        return 'COMMIT';
      }
    }, {
      databaseName: this.databaseName,
      collectionName: this.collectionName
    });
    if (categorized && categorized.eventBulk.events.length > 0) {
      var lastState = ensureNotFalsy(categorized.newestRow).document;
      categorized.eventBulk.checkpoint = {
        id: lastState[this.primaryPath],
        lwt: lastState._meta.lwt
      };
      this.changes$.next(categorized.eventBulk);
    }
    return ret;
  };
  _proto.query = async function query(originalPreparedQuery) {
    var database = await this.internals.databasePromise;
    var result = [];
    var query = originalPreparedQuery.query;
    var skip = query.skip ? query.skip : 0;
    var limit = query.limit ? query.limit : Infinity;
    var skipPlusLimit = skip + limit;
    var queryMatcher = getQueryMatcher(this.schema, query);
    var subResult = await this.all(database, {
      query: 'SELECT data FROM "' + this.tableName + '"',
      params: [],
      context: {
        method: 'query',
        data: originalPreparedQuery
      }
    });
    subResult.forEach(row => {
      var docData = JSON.parse(getDataFromResultRow(row));
      if (queryMatcher(docData)) {
        result.push(docData);
      }
    });
    var sortComparator = getSortComparator(this.schema, query);
    result = result.sort(sortComparator);
    result = result.slice(skip, skipPlusLimit);
    return {
      documents: result
    };
  };
  _proto.count = async function count(originalPreparedQuery) {
    var results = await this.query(originalPreparedQuery);
    return {
      count: results.documents.length,
      mode: 'fast'
    };
  };
  _proto.findDocumentsById = async function findDocumentsById(ids, withDeleted) {
    var database = await this.internals.databasePromise;
    if (this.closed) {
      throw new Error('SQLite.findDocumentsById() already closed ' + this.tableName + ' context: ' + context);
    }
    var result = await this.all(database, {
      query: "SELECT data FROM \"" + this.tableName + "\"",
      params: [],
      context: {
        method: 'findDocumentsById',
        data: ids
      }
    });
    var ret = [];
    for (var i = 0; i < result.length; ++i) {
      var resultRow = result[i];
      var doc = JSON.parse(getDataFromResultRow(resultRow));
      if (ids.includes(doc[this.primaryPath]) && (withDeleted || !doc._deleted)) {
        ret.push(doc);
      }
    }
    return ret;
  };
  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto.cleanup = async function cleanup(minimumDeletedTime) {
    await promiseWait(0);
    await promiseWait(0);
    var database = await this.internals.databasePromise;

    /**
     * Purge deleted documents
     */
    var minTimestamp = new Date().getTime() - minimumDeletedTime;
    await this.all(database, {
      query: "\n                    DELETE FROM\n                        \"" + this.tableName + "\"\n                    WHERE\n                        deleted = 1\n                        AND\n                        lastWriteTime < ?\n                ",
      params: [minTimestamp],
      context: {
        method: 'cleanup',
        data: minimumDeletedTime
      }
    });
    return true;
  };
  _proto.getAttachmentData = async function getAttachmentData(_documentId, _attachmentId) {
    throw newRxError('SQL1');
  };
  _proto.remove = async function remove() {
    if (this.closed) {
      throw new Error('closed already');
    }
    var database = await this.internals.databasePromise;
    var promises = [this.run(database, {
      query: "DROP TABLE IF EXISTS \"" + this.tableName + "\"",
      params: [],
      context: {
        method: 'remove',
        data: this.tableName
      }
    })];
    await Promise.all(promises);
    return this.close();
  };
  _proto.close = async function close() {
    var queue = TX_QUEUE_BY_DATABASE.get(await this.internals.databasePromise);
    if (queue) {
      await queue;
    }
    if (this.closed) {
      return this.closed;
    }
    this.closed = (async () => {
      await firstValueFrom(this.openWriteCount$.pipe(filter(v => v === 0)));
      var database = await this.internals.databasePromise;

      /**
       * First get a transaction
       * to ensure currently running operations
       * are finished
       */
      await sqliteTransaction(database, this.sqliteBasics, () => {
        return Promise.resolve('COMMIT');
      }).catch(() => {});
      this.changes$.complete();
      await closeDatabaseConnection(this.databaseName, this.storage.settings.sqliteBasics);
    })();
    return this.closed;
  };
  return RxStorageInstanceSQLite;
}();
export async function createSQLiteTrialStorageInstance(storage, params, settings) {
  var sqliteBasics = settings.sqliteBasics;
  var tableName = params.collectionName + '-' + params.schema.version;
  if (params.schema.attachments) {
    throw newRxError('SQL1');
  }
  var internals = {};
  var useDatabaseName = (settings.databaseNamePrefix ? settings.databaseNamePrefix : '') + '_trial_' + params.databaseName;
  internals.databasePromise = getDatabaseConnection(storage.settings.sqliteBasics, useDatabaseName).then(async database => {
    await sqliteTransaction(database, sqliteBasics, async () => {
      var tableQuery = "\n                CREATE TABLE IF NOT EXISTS \"" + tableName + "\"(\n                    id TEXT NOT NULL PRIMARY KEY UNIQUE,\n                    revision TEXT,\n                    deleted BOOLEAN NOT NULL CHECK (deleted IN (0, 1)),\n                    lastWriteTime INTEGER NOT NULL,\n                    data json\n                );\n                ";
      await sqliteBasics.run(database, {
        query: tableQuery,
        params: [],
        context: {
          method: 'createSQLiteStorageInstance create tables',
          data: params.databaseName
        }
      });
      return 'COMMIT';
    }, {
      indexCreation: false,
      databaseName: params.databaseName,
      collectionName: params.collectionName
    });
    return database;
  });
  var instance = new RxStorageInstanceSQLite(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings, tableName, params.devMode);
  await addRxStorageMultiInstanceSupport(RX_STORAGE_NAME_SQLITE, params, instance);
  return instance;
}
//# sourceMappingURL=sqlite-storage-instance.js.map