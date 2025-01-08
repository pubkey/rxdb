import { Subject } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from "../../rx-schema-helper.js";
import { addRxStorageMultiInstanceSupport } from "../../rx-storage-multiinstance.js";
import { CLEANUP_INDEX, DENOKV_DOCUMENT_ROOT_PATH, RX_STORAGE_NAME_DENOKV, getDenoGlobal, getDenoKVIndexName } from "./denokv-helper.js";
import { getIndexableStringMonad, getStartIndexStringFromLowerBound } from "../../custom-index.js";
import { appendToArray, batchArray, toArray } from "../utils/utils-array.js";
import { ensureNotFalsy } from "../utils/utils-other.js";
import { categorizeBulkWriteRows } from "../../rx-storage-helper.js";
import { now } from "../utils/utils-time.js";
import { queryDenoKV } from "./denokv-query.js";
import { INDEX_MAX } from "../../query-planner.js";
import { flatClone } from "../utils/utils-object.js";
export var RxStorageInstanceDenoKV = /*#__PURE__*/function () {
  function RxStorageInstanceDenoKV(storage, databaseName, collectionName, schema, internals, options, settings, keySpace = ['rxdb', databaseName, collectionName, schema.version].join('|'), kvOptions = {
    consistency: settings.consistencyLevel
  }) {
    this.changes$ = new Subject();
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.keySpace = keySpace;
    this.kvOptions = kvOptions;
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    this.kvPromise = getDenoGlobal().openKv(settings.openKvPath).then(async kv => {
      // insert writeBlockKey
      await kv.set([this.keySpace], 1);
      return kv;
    });
  }

  /**
   * DenoKV has no transactions
   * so we have to ensure that there is no write in between our queries
   * which would confuse RxDB and return wrong query results.
   */
  var _proto = RxStorageInstanceDenoKV.prototype;
  _proto.retryUntilNoWriteInBetween = async function retryUntilNoWriteInBetween(fn) {
    var kv = await this.kvPromise;
    while (true) {
      var writeBlockKeyBefore = await kv.get([this.keySpace], this.kvOptions);
      var writeBlockValueBefore = writeBlockKeyBefore ? writeBlockKeyBefore.value : -1;
      var result = await fn();
      var writeBlockKeyAfter = await kv.get([this.keySpace], this.kvOptions);
      var writeBlockValueAfter = writeBlockKeyAfter ? writeBlockKeyAfter.value : -1;
      if (writeBlockValueBefore === writeBlockValueAfter) {
        return result;
      }
    }
  };
  _proto.bulkWrite = async function bulkWrite(documentWrites, context) {
    var _this = this;
    var kv = await this.kvPromise;
    var primaryPath = this.primaryPath;
    var ret = {
      error: []
    };
    var batches = batchArray(documentWrites, ensureNotFalsy(this.settings.batchSize));

    /**
     * DenoKV does not have transactions
     * so we use a special writeBlock row to ensure
     * atomic writes (per document)
     * and so that we can do bulkWrites
     */
    for (var writeBatch of batches) {
      var _loop = async function () {
        var writeBlockKey = await kv.get([_this.keySpace], _this.kvOptions);
        var docsInDB = new Map();

        /**
         * The max amount for .getMany() is 10 which is defined by deno itself:
         * @link https://docs.deno.com/deploy/kv/manual/transactions/
         * @link https://github.com/denoland/deno/issues/19284
         */
        var readManyBatches = batchArray(writeBatch, 10);
        await Promise.all(readManyBatches.map(async readManyBatch => {
          var docsResult = await kv.getMany(readManyBatch.map(writeRow => {
            var docId = writeRow.document[primaryPath];
            return [_this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId];
          }));
          docsResult.map(row => {
            var docData = row.value;
            if (!docData) {
              return;
            }
            var docId = docData[primaryPath];
            docsInDB.set(docId, docData);
          });
        }));
        var categorized = categorizeBulkWriteRows(_this, _this.primaryPath, docsInDB, writeBatch, context);
        var tx = kv.atomic();
        tx = tx.set([_this.keySpace], ensureNotFalsy(writeBlockKey.value) + 1);
        tx = tx.check(writeBlockKey);

        // INSERTS
        categorized.bulkInsertDocs.forEach(writeRow => {
          var docId = writeRow.document[_this.primaryPath];

          // insert document data
          tx = tx.set([_this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], writeRow.document);

          // insert secondary indexes
          Object.values(_this.internals.indexes).forEach(indexMeta => {
            var indexString = indexMeta.getIndexableString(writeRow.document);
            tx = tx.set([_this.keySpace, indexMeta.indexId, indexString], docId);
          });
        });
        // UPDATES
        categorized.bulkUpdateDocs.forEach(writeRow => {
          var docId = writeRow.document[_this.primaryPath];

          // insert document data
          tx = tx.set([_this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], writeRow.document);

          // insert secondary indexes
          Object.values(_this.internals.indexes).forEach(indexMeta => {
            var oldIndexString = indexMeta.getIndexableString(ensureNotFalsy(writeRow.previous));
            var newIndexString = indexMeta.getIndexableString(writeRow.document);
            if (oldIndexString !== newIndexString) {
              tx = tx.delete([_this.keySpace, indexMeta.indexId, oldIndexString]);
              tx = tx.set([_this.keySpace, indexMeta.indexId, newIndexString], docId);
            }
          });
        });
        var txResult;
        try {
          txResult = await tx.commit();
        } catch (err) {
          if (err.message.includes('Error code 5:') || err.message.includes('Error code 517:') || err.message.includes('database is locked')) {
            // retry
          } else {
            throw err;
          }
        }
        if (txResult && txResult.ok) {
          appendToArray(ret.error, categorized.errors);
          if (categorized.eventBulk.events.length > 0) {
            var lastState = ensureNotFalsy(categorized.newestRow).document;
            categorized.eventBulk.checkpoint = {
              id: lastState[primaryPath],
              lwt: lastState._meta.lwt
            };
            _this.changes$.next(categorized.eventBulk);
          }
          return 1; // break
        }
      };
      while (true) {
        if (await _loop()) break;
      }
    }
    return ret;
  };
  _proto.findDocumentsById = async function findDocumentsById(ids, withDeleted) {
    var kv = await this.kvPromise;
    var ret = [];
    await Promise.all(ids.map(async docId => {
      var kvKey = [this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId];
      var findSingleResult = await kv.get(kvKey, this.kvOptions);
      var docInDb = findSingleResult.value;
      if (docInDb && (!docInDb._deleted || withDeleted)) {
        ret.push(docInDb);
      }
    }));
    return ret;
  };
  _proto.query = function query(preparedQuery) {
    return this.retryUntilNoWriteInBetween(() => queryDenoKV(this, preparedQuery));
  };
  _proto.count = async function count(preparedQuery) {
    /**
     * At this point in time (end 2023), DenoKV does not support
     * range counts. So we have to run a normal query and use the result set length.
     * @link https://github.com/denoland/deno/issues/18965
     */
    var result = await this.retryUntilNoWriteInBetween(() => this.query(preparedQuery));
    return {
      count: result.documents.length,
      mode: 'fast'
    };
  };
  _proto.getAttachmentData = function getAttachmentData(documentId, attachmentId, digest) {
    throw new Error("Method not implemented.");
  };
  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto.cleanup = async function cleanup(minimumDeletedTime) {
    var _this2 = this;
    var maxDeletionTime = now() - minimumDeletedTime;
    var kv = await this.kvPromise;
    var index = CLEANUP_INDEX;
    var indexName = getDenoKVIndexName(index);
    var indexMeta = this.internals.indexes[indexName];
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, index, [true,
    /**
     * Do not use 0 here,
     * because 1 is the minimum value for _meta.lwt
     */
    1]);
    var upperBoundString = getStartIndexStringFromLowerBound(this.schema, index, [true, maxDeletionTime]);
    var noMoreUndeleted = true;
    var range = kv.list({
      start: [this.keySpace, indexMeta.indexId, lowerBoundString],
      end: [this.keySpace, indexMeta.indexId, upperBoundString]
    }, {
      consistency: this.settings.consistencyLevel,
      batchSize: this.settings.batchSize,
      limit: this.settings.batchSize
    });
    var rangeCount = 0;
    var _loop2 = async function () {
        rangeCount = rangeCount + 1;
        var docId = row.value;
        var docDataResult = await kv.get([_this2.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], _this2.kvOptions);
        if (!docDataResult.value) {
          return 0; // continue
        }
        var docData = ensureNotFalsy(docDataResult.value);
        if (!docData._deleted || docData._meta.lwt > maxDeletionTime) {
          return 0; // continue
        }
        var tx = kv.atomic();
        tx = tx.check(docDataResult);
        tx = tx.delete([_this2.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId]);
        Object.values(_this2.internals.indexes).forEach(indexMetaInner => {
          tx = tx.delete([_this2.keySpace, indexMetaInner.indexId, docId]);
        });
        await tx.commit();
      },
      _ret;
    for await (var row of range) {
      _ret = await _loop2();
      if (_ret === 0) continue;
    }
    return noMoreUndeleted;
  };
  _proto.close = async function close() {
    if (this.closed) {
      return this.closed;
    }
    this.closed = (async () => {
      this.changes$.complete();
      var kv = await this.kvPromise;
      await kv.close();
    })();
    return this.closed;
  };
  _proto.remove = async function remove() {
    ensureNotClosed(this);
    var kv = await this.kvPromise;
    var range = kv.list({
      start: [this.keySpace],
      end: [this.keySpace, INDEX_MAX]
    }, {
      consistency: this.settings.consistencyLevel,
      batchSize: this.settings.batchSize
    });
    var promises = [];
    for await (var row of range) {
      promises.push(kv.delete(row.key));
    }
    await Promise.all(promises);
    return this.close();
  };
  return RxStorageInstanceDenoKV;
}();
export async function createDenoKVStorageInstance(storage, params, settings) {
  settings = flatClone(settings);
  if (!settings.batchSize) {
    settings.batchSize = 100;
  }
  var primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
  var indexDBs = {};
  var useIndexes = params.schema.indexes ? params.schema.indexes.slice(0) : [];
  useIndexes.push([primaryPath]);
  var useIndexesFinal = useIndexes.map(index => {
    var indexAr = toArray(index);
    return indexAr;
  });
  useIndexesFinal.push(CLEANUP_INDEX);
  useIndexesFinal.forEach((indexAr, indexId) => {
    var indexName = getDenoKVIndexName(indexAr);
    indexDBs[indexName] = {
      indexId: '|' + indexId + '|',
      indexName,
      getIndexableString: getIndexableStringMonad(params.schema, indexAr),
      index: indexAr
    };
  });
  var internals = {
    indexes: indexDBs
  };
  var instance = new RxStorageInstanceDenoKV(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  await addRxStorageMultiInstanceSupport(RX_STORAGE_NAME_DENOKV, params, instance);
  return Promise.resolve(instance);
}
function ensureNotClosed(instance) {
  if (instance.closed) {
    throw new Error('RxStorageInstanceDenoKV is closed ' + instance.databaseName + '-' + instance.collectionName);
  }
}
//# sourceMappingURL=rx-storage-instance-denokv.js.map