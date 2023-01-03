import { Subject } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
// import {
//     open as foundationDBOpen,
//     directory as foundationDBDirectory,
//     encoders as foundationDBEncoders,
//     keySelector as foundationDBKeySelector,
//     StreamingMode as foundationDBStreamingMode
// } from 'foundationdb';
import { categorizeBulkWriteRows, getNewestOfDocumentStates } from '../../rx-storage-helper';
import { CLEANUP_INDEX, getFoundationDBIndexName } from './foundationdb-helpers';
import { getIndexableStringMonad, getStartIndexStringFromLowerBound, getStartIndexStringFromUpperBound } from '../../custom-index';
import { ensureNotFalsy, lastOfArray, now, PROMISE_RESOLVE_VOID, toArray } from '../../plugins/utils';
import { queryFoundationDB } from './foundationdb-query';
import { INDEX_MAX } from '../../query-planner';
import { attachmentMapKey } from '../storage-memory';
export var RxStorageInstanceFoundationDB = /*#__PURE__*/function () {
  function RxStorageInstanceFoundationDB(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.closed = false;
    this.changes$ = new Subject();
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
  }
  var _proto = RxStorageInstanceFoundationDB.prototype;
  _proto.bulkWrite = async function bulkWrite(documentWrites, context) {
    var dbs = await this.internals.dbsPromise;
    var categorized = null;
    var result = await dbs.root.doTransaction(async tx => {
      var ret = {
        success: {},
        error: {}
      };
      var ids = documentWrites.map(row => row.document[this.primaryPath]);
      var mainTx = tx.at(dbs.main.subspace);
      var attachmentTx = tx.at(dbs.attachments.subspace);
      var docsInDB = new Map();
      /**
       * TODO this might be faster if fdb
       * any time adds a bulk-fetch-by-key method.
       */
      await Promise.all(ids.map(async id => {
        var doc = await mainTx.get(id);
        docsInDB.set(id, doc);
      }));
      categorized = categorizeBulkWriteRows(this, this.primaryPath, docsInDB, documentWrites, context);
      ret.error = categorized.errors;

      // INSERTS
      categorized.bulkInsertDocs.forEach(writeRow => {
        var docId = writeRow.document[this.primaryPath];
        ret.success[docId] = writeRow.document;

        // insert document data
        mainTx.set(docId, writeRow.document);

        // insert secondary indexes
        Object.values(dbs.indexes).forEach(indexMeta => {
          var indexString = indexMeta.getIndexableString(writeRow.document);
          var indexTx = tx.at(indexMeta.db.subspace);
          indexTx.set(indexString, docId);
        });
      });
      // UPDATES
      categorized.bulkUpdateDocs.forEach(writeRow => {
        var docId = writeRow.document[this.primaryPath];

        // overwrite document data
        mainTx.set(docId, writeRow.document);

        // update secondary indexes
        Object.values(dbs.indexes).forEach(indexMeta => {
          var oldIndexString = indexMeta.getIndexableString(ensureNotFalsy(writeRow.previous));
          var newIndexString = indexMeta.getIndexableString(writeRow.document);
          if (oldIndexString !== newIndexString) {
            var indexTx = tx.at(indexMeta.db.subspace);
            indexTx.delete(oldIndexString);
            indexTx.set(newIndexString, docId);
          }
        });
        ret.success[docId] = writeRow.document;
      });

      // attachments
      categorized.attachmentsAdd.forEach(attachment => {
        attachmentTx.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
      });
      categorized.attachmentsUpdate.forEach(attachment => {
        attachmentTx.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
      });
      categorized.attachmentsRemove.forEach(attachment => {
        attachmentTx.delete(attachmentMapKey(attachment.documentId, attachment.attachmentId));
      });
      return ret;
    });
    /**
     * The events must be emitted AFTER the transaction
     * has finished.
     * Otherwise an observable changestream might cause a read
     * to a document that does not already exist outside of the transaction.
     */
    if (ensureNotFalsy(categorized).eventBulk.events.length > 0) {
      var lastState = getNewestOfDocumentStates(this.primaryPath, Object.values(result.success));
      ensureNotFalsy(categorized).eventBulk.checkpoint = {
        id: lastState[this.primaryPath],
        lwt: lastState._meta.lwt
      };
      this.changes$.next(ensureNotFalsy(categorized).eventBulk);
    }
    return result;
  };
  _proto.findDocumentsById = async function findDocumentsById(ids, withDeleted) {
    var dbs = await this.internals.dbsPromise;
    return dbs.main.doTransaction(async tx => {
      var ret = {};
      await Promise.all(ids.map(async docId => {
        var docInDb = await tx.get(docId);
        if (docInDb && (!docInDb._deleted || withDeleted)) {
          ret[docId] = docInDb;
        }
      }));
      return ret;
    });
  };
  _proto.query = function query(preparedQuery) {
    return queryFoundationDB(this, preparedQuery);
  };
  _proto.count = async function count(preparedQuery) {
    /**
     * At this point in time (end 2022), FoundationDB does not support
     * range counts. So we have to run a normal query and use the result set length.
     * @link https://github.com/apple/foundationdb/issues/5981
     */
    var result = await this.query(preparedQuery);
    return {
      count: result.documents.length,
      mode: 'fast'
    };
  };
  _proto.getAttachmentData = async function getAttachmentData(documentId, attachmentId) {
    var dbs = await this.internals.dbsPromise;
    var attachment = await dbs.attachments.get(attachmentMapKey(documentId, attachmentId));
    return attachment.data;
  };
  _proto.getChangedDocumentsSince = async function getChangedDocumentsSince(limit, checkpoint) {
    var {
      keySelector,
      StreamingMode
    } = require('foundationdb');
    var dbs = await this.internals.dbsPromise;
    var index = ['_meta.lwt', this.primaryPath];
    var indexName = getFoundationDBIndexName(index);
    var indexMeta = dbs.indexes[indexName];
    var lowerBoundString = '';
    if (checkpoint) {
      var checkpointPartialDoc = {
        [this.primaryPath]: checkpoint.id,
        _meta: {
          lwt: checkpoint.lwt
        }
      };
      lowerBoundString = indexMeta.getIndexableString(checkpointPartialDoc);
    }
    var result = await dbs.root.doTransaction(async tx => {
      var innerResult = [];
      var indexTx = tx.at(indexMeta.db.subspace);
      var mainTx = tx.at(dbs.main.subspace);
      var range = await indexTx.getRangeAll(keySelector.firstGreaterThan(lowerBoundString), INDEX_MAX, {
        limit,
        streamingMode: StreamingMode.Exact
      });
      var docIds = range.map(row => row[1]);
      var docsData = await Promise.all(docIds.map(docId => mainTx.get(docId)));
      innerResult = innerResult.concat(docsData);
      return innerResult;
    });
    var lastDoc = lastOfArray(result);
    return {
      documents: result,
      checkpoint: lastDoc ? {
        id: lastDoc[this.primaryPath],
        lwt: lastDoc._meta.lwt
      } : checkpoint ? checkpoint : {
        id: '',
        lwt: 0
      }
    };
  };
  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto.remove = async function remove() {
    var dbs = await this.internals.dbsPromise;
    await dbs.root.doTransaction(tx => {
      tx.clearRange('', INDEX_MAX);
      return PROMISE_RESOLVE_VOID;
    });
    return this.close();
  };
  _proto.cleanup = async function cleanup(minimumDeletedTime) {
    var {
      keySelector,
      StreamingMode
    } = require('foundationdb');
    var maxDeletionTime = now() - minimumDeletedTime;
    var dbs = await this.internals.dbsPromise;
    var index = CLEANUP_INDEX;
    var indexName = getFoundationDBIndexName(index);
    var indexMeta = dbs.indexes[indexName];
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, index, [true,
    /**
     * Do not use 0 here,
     * because 1 is the minimum value for _meta.lwt
     */
    1], false);
    var upperBoundString = getStartIndexStringFromUpperBound(this.schema, index, [true, maxDeletionTime], true);
    var noMoreUndeleted = true;
    await dbs.root.doTransaction(async tx => {
      var batchSize = ensureNotFalsy(this.settings.batchSize);
      var indexTx = tx.at(indexMeta.db.subspace);
      var mainTx = tx.at(dbs.main.subspace);
      var range = await indexTx.getRangeAll(keySelector.firstGreaterThan(lowerBoundString), upperBoundString, {
        limit: batchSize + 1,
        // get one more extra to detect what to return from cleanup()
        streamingMode: StreamingMode.Exact
      });
      if (range.length > batchSize) {
        noMoreUndeleted = false;
        range.pop();
      }
      var docIds = range.map(row => row[1]);
      var docsData = await Promise.all(docIds.map(docId => mainTx.get(docId)));
      Object.values(dbs.indexes).forEach(indexMetaInner => {
        var subIndexDB = tx.at(indexMetaInner.db.subspace);
        docsData.forEach(docData => {
          var indexString = indexMetaInner.getIndexableString(docData);
          subIndexDB.delete(indexString);
        });
      });
      docIds.forEach(id => mainTx.delete(id));
    });
    return noMoreUndeleted;
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new Subject().asObservable();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return PROMISE_RESOLVE_VOID;
  };
  _proto.close = async function close() {
    if (this.closed) {
      return Promise.reject(new Error('already closed'));
    }
    this.closed = true;
    this.changes$.complete();
    var dbs = await this.internals.dbsPromise;
    dbs.root.close();

    // TODO shouldn't we close the index databases?
    // Object.values(dbs.indexes).forEach(db => db.close());
  };
  return RxStorageInstanceFoundationDB;
}();
export function createFoundationDBStorageInstance(storage, params, settings) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
  var {
    open,
    directory,
    encoders
  } = require('foundationdb');
  var connection = open(settings.clusterFile);
  var dbsPromise = (async () => {
    var dir = await directory.createOrOpen(connection, 'rxdb');
    var root = connection.at(dir).at(params.databaseName + '.').at(params.collectionName + '.').at(params.schema.version + '.');
    var main = root.at('main.').withKeyEncoding(encoders.string) // automatically encode & decode keys using tuples
    .withValueEncoding(encoders.json); // and values using JSON

    var events = root.at('events.').withKeyEncoding(encoders.string).withValueEncoding(encoders.json);
    var attachments = root.at('attachments.').withKeyEncoding(encoders.string).withValueEncoding(encoders.json);
    var indexDBs = {};
    var useIndexes = params.schema.indexes ? params.schema.indexes.slice(0) : [];
    useIndexes.push([primaryPath]);
    var useIndexesFinal = useIndexes.map(index => {
      var indexAr = toArray(index);
      indexAr.unshift('_deleted');
      return indexAr;
    });
    // used for `getChangedDocumentsSince()`
    useIndexesFinal.push(['_meta.lwt', primaryPath]);
    useIndexesFinal.push(CLEANUP_INDEX);
    useIndexesFinal.forEach(indexAr => {
      var indexName = getFoundationDBIndexName(indexAr);
      var indexDB = root.at(indexName + '.').withKeyEncoding(encoders.string).withValueEncoding(encoders.string);
      indexDBs[indexName] = {
        indexName,
        db: indexDB,
        getIndexableString: getIndexableStringMonad(params.schema, indexAr),
        index: indexAr
      };
    });
    return {
      root,
      main,
      events,
      attachments,
      indexes: indexDBs
    };
  })();
  var internals = {
    connection,
    dbsPromise: dbsPromise
  };
  var instance = new RxStorageInstanceFoundationDB(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  return Promise.resolve(instance);
}
//# sourceMappingURL=rx-storage-instance-foundationdb.js.map