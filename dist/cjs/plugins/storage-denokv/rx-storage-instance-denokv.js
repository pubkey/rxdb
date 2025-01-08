"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstanceDenoKV = void 0;
exports.createDenoKVStorageInstance = createDenoKVStorageInstance;
var _rxjs = require("rxjs");
var _rxSchemaHelper = require("../../rx-schema-helper.js");
var _rxStorageMultiinstance = require("../../rx-storage-multiinstance.js");
var _denokvHelper = require("./denokv-helper.js");
var _customIndex = require("../../custom-index.js");
var _utilsArray = require("../utils/utils-array.js");
var _utilsOther = require("../utils/utils-other.js");
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _utilsTime = require("../utils/utils-time.js");
var _denokvQuery = require("./denokv-query.js");
var _queryPlanner = require("../../query-planner.js");
var _utilsObject = require("../utils/utils-object.js");
var RxStorageInstanceDenoKV = exports.RxStorageInstanceDenoKV = /*#__PURE__*/function () {
  function RxStorageInstanceDenoKV(storage, databaseName, collectionName, schema, internals, options, settings, keySpace = ['rxdb', databaseName, collectionName, schema.version].join('|'), kvOptions = {
    consistency: settings.consistencyLevel
  }) {
    this.changes$ = new _rxjs.Subject();
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.keySpace = keySpace;
    this.kvOptions = kvOptions;
    this.primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(this.schema.primaryKey);
    this.kvPromise = (0, _denokvHelper.getDenoGlobal)().openKv(settings.openKvPath).then(async kv => {
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
    var batches = (0, _utilsArray.batchArray)(documentWrites, (0, _utilsOther.ensureNotFalsy)(this.settings.batchSize));

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
        var readManyBatches = (0, _utilsArray.batchArray)(writeBatch, 10);
        await Promise.all(readManyBatches.map(async readManyBatch => {
          var docsResult = await kv.getMany(readManyBatch.map(writeRow => {
            var docId = writeRow.document[primaryPath];
            return [_this.keySpace, _denokvHelper.DENOKV_DOCUMENT_ROOT_PATH, docId];
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
        var categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(_this, _this.primaryPath, docsInDB, writeBatch, context);
        var tx = kv.atomic();
        tx = tx.set([_this.keySpace], (0, _utilsOther.ensureNotFalsy)(writeBlockKey.value) + 1);
        tx = tx.check(writeBlockKey);

        // INSERTS
        categorized.bulkInsertDocs.forEach(writeRow => {
          var docId = writeRow.document[_this.primaryPath];

          // insert document data
          tx = tx.set([_this.keySpace, _denokvHelper.DENOKV_DOCUMENT_ROOT_PATH, docId], writeRow.document);

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
          tx = tx.set([_this.keySpace, _denokvHelper.DENOKV_DOCUMENT_ROOT_PATH, docId], writeRow.document);

          // insert secondary indexes
          Object.values(_this.internals.indexes).forEach(indexMeta => {
            var oldIndexString = indexMeta.getIndexableString((0, _utilsOther.ensureNotFalsy)(writeRow.previous));
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
          (0, _utilsArray.appendToArray)(ret.error, categorized.errors);
          if (categorized.eventBulk.events.length > 0) {
            var lastState = (0, _utilsOther.ensureNotFalsy)(categorized.newestRow).document;
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
      var kvKey = [this.keySpace, _denokvHelper.DENOKV_DOCUMENT_ROOT_PATH, docId];
      var findSingleResult = await kv.get(kvKey, this.kvOptions);
      var docInDb = findSingleResult.value;
      if (docInDb && (!docInDb._deleted || withDeleted)) {
        ret.push(docInDb);
      }
    }));
    return ret;
  };
  _proto.query = function query(preparedQuery) {
    return this.retryUntilNoWriteInBetween(() => (0, _denokvQuery.queryDenoKV)(this, preparedQuery));
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
    var maxDeletionTime = (0, _utilsTime.now)() - minimumDeletedTime;
    var kv = await this.kvPromise;
    var index = _denokvHelper.CLEANUP_INDEX;
    var indexName = (0, _denokvHelper.getDenoKVIndexName)(index);
    var indexMeta = this.internals.indexes[indexName];
    var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(this.schema, index, [true,
    /**
     * Do not use 0 here,
     * because 1 is the minimum value for _meta.lwt
     */
    1]);
    var upperBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(this.schema, index, [true, maxDeletionTime]);
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
        var docDataResult = await kv.get([_this2.keySpace, _denokvHelper.DENOKV_DOCUMENT_ROOT_PATH, docId], _this2.kvOptions);
        if (!docDataResult.value) {
          return 0; // continue
        }
        var docData = (0, _utilsOther.ensureNotFalsy)(docDataResult.value);
        if (!docData._deleted || docData._meta.lwt > maxDeletionTime) {
          return 0; // continue
        }
        var tx = kv.atomic();
        tx = tx.check(docDataResult);
        tx = tx.delete([_this2.keySpace, _denokvHelper.DENOKV_DOCUMENT_ROOT_PATH, docId]);
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
      end: [this.keySpace, _queryPlanner.INDEX_MAX]
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
async function createDenoKVStorageInstance(storage, params, settings) {
  settings = (0, _utilsObject.flatClone)(settings);
  if (!settings.batchSize) {
    settings.batchSize = 100;
  }
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(params.schema.primaryKey);
  var indexDBs = {};
  var useIndexes = params.schema.indexes ? params.schema.indexes.slice(0) : [];
  useIndexes.push([primaryPath]);
  var useIndexesFinal = useIndexes.map(index => {
    var indexAr = (0, _utilsArray.toArray)(index);
    return indexAr;
  });
  useIndexesFinal.push(_denokvHelper.CLEANUP_INDEX);
  useIndexesFinal.forEach((indexAr, indexId) => {
    var indexName = (0, _denokvHelper.getDenoKVIndexName)(indexAr);
    indexDBs[indexName] = {
      indexId: '|' + indexId + '|',
      indexName,
      getIndexableString: (0, _customIndex.getIndexableStringMonad)(params.schema, indexAr),
      index: indexAr
    };
  });
  var internals = {
    indexes: indexDBs
  };
  var instance = new RxStorageInstanceDenoKV(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  await (0, _rxStorageMultiinstance.addRxStorageMultiInstanceSupport)(_denokvHelper.RX_STORAGE_NAME_DENOKV, params, instance);
  return Promise.resolve(instance);
}
function ensureNotClosed(instance) {
  if (instance.closed) {
    throw new Error('RxStorageInstanceDenoKV is closed ' + instance.databaseName + '-' + instance.collectionName);
  }
}
//# sourceMappingURL=rx-storage-instance-denokv.js.map