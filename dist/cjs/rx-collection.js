"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxCollectionBase = exports.OPEN_COLLECTIONS = void 0;
exports.createRxCollection = createRxCollection;
exports.isRxCollection = isRxCollection;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _rxjs = require("rxjs");
var _index = require("./plugins/utils/index.js");
var _rxCollectionHelper = require("./rx-collection-helper.js");
var _rxQuery = require("./rx-query.js");
var _rxError = require("./rx-error.js");
var _docCache = require("./doc-cache.js");
var _queryCache = require("./query-cache.js");
var _changeEventBuffer = require("./change-event-buffer.js");
var _hooks = require("./hooks.js");
var _rxDocumentPrototypeMerge = require("./rx-document-prototype-merge.js");
var _rxStorageHelper = require("./rx-storage-helper.js");
var _incrementalWrite = require("./incremental-write.js");
var _rxDocument = require("./rx-document.js");
var _overwritable = require("./overwritable.js");
var _defaultConflictHandler = require("./replication-protocol/default-conflict-handler.js");
var _rxChangeEvent = require("./rx-change-event.js");
var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
var hooksApplied = false;
var OPEN_COLLECTIONS = exports.OPEN_COLLECTIONS = new Set();
var RxCollectionBase = exports.RxCollectionBase = /*#__PURE__*/function () {
  /**
   * Stores all 'normal' documents
   */

  /**
   * Before reads, all these methods are awaited. Used to "block" reads
   * depending on other processes, like when the RxPipeline is running.
   */

  function RxCollectionBase(database, name, schema, internalStorageInstance, instanceCreationOptions = {}, migrationStrategies = {}, methods = {}, attachments = {}, options = {}, cacheReplacementPolicy = _queryCache.defaultCacheReplacementPolicy, statics = {}, conflictHandler = _defaultConflictHandler.defaultConflictHandler) {
    this.storageInstance = {};
    this.timeouts = new Set();
    this.incrementalWriteQueue = {};
    this.awaitBeforeReads = new Set();
    this._incrementalUpsertQueues = new Map();
    this.synced = false;
    this.hooks = {};
    this._subs = [];
    this._docCache = {};
    this._queryCache = (0, _queryCache.createQueryCache)();
    this.$ = {};
    this.checkpoint$ = {};
    this._changeEventBuffer = {};
    this.eventBulks$ = {};
    this.onClose = [];
    this.closed = false;
    this.onRemove = [];
    this.database = database;
    this.name = name;
    this.schema = schema;
    this.internalStorageInstance = internalStorageInstance;
    this.instanceCreationOptions = instanceCreationOptions;
    this.migrationStrategies = migrationStrategies;
    this.methods = methods;
    this.attachments = attachments;
    this.options = options;
    this.cacheReplacementPolicy = cacheReplacementPolicy;
    this.statics = statics;
    this.conflictHandler = conflictHandler;
    _applyHookFunctions(this.asRxCollection);
    if (database) {
      // might be falsy on pseudoInstance
      this.eventBulks$ = database.eventBulks$.pipe((0, _rxjs.filter)(changeEventBulk => changeEventBulk.collectionName === this.name));
    } else {}

    /**
     * Must be last because the hooks might throw on dev-mode
     * checks and we do not want to have broken collections here.
     * RxCollection instances created for testings do not have a database
     * so we do not add these to the list.
     */
    if (this.database) {
      OPEN_COLLECTIONS.add(this);
    }
  }
  var _proto = RxCollectionBase.prototype;
  _proto.prepare = async function prepare() {
    if (!(await (0, _index.hasPremiumFlag)())) {
      /**
       * When used in a test suite, we often open and close many databases with collections
       * while not awaiting the database.close() call to improve the test times.
       * So when reopening collections and the OPEN_COLLECTIONS size is full,
       * we retry after some times to account for this.
       */
      var count = 0;
      while (count < 10 && OPEN_COLLECTIONS.size > _index.NON_PREMIUM_COLLECTION_LIMIT) {
        count++;
        await this.promiseWait(30);
      }
      if (OPEN_COLLECTIONS.size > _index.NON_PREMIUM_COLLECTION_LIMIT) {
        throw (0, _rxError.newRxError)('COL23', {
          database: this.database.name,
          collection: this.name,
          args: {
            existing: Array.from(OPEN_COLLECTIONS.values()).map(c => ({
              db: c.database ? c.database.name : '',
              c: c.name
            }))
          }
        });
      }
    }
    this.storageInstance = (0, _rxStorageHelper.getWrappedStorageInstance)(this.database, this.internalStorageInstance, this.schema.jsonSchema);
    this.incrementalWriteQueue = new _incrementalWrite.IncrementalWriteQueue(this.storageInstance, this.schema.primaryPath, (newData, oldData) => (0, _rxDocument.beforeDocumentUpdateWrite)(this, newData, oldData), result => this._runHooks('post', 'save', result));
    this.$ = this.eventBulks$.pipe((0, _rxjs.mergeMap)(changeEventBulk => (0, _rxChangeEvent.rxChangeEventBulkToRxChangeEvents)(changeEventBulk)));
    this.checkpoint$ = this.eventBulks$.pipe((0, _rxjs.map)(changeEventBulk => changeEventBulk.checkpoint));
    this._changeEventBuffer = (0, _changeEventBuffer.createChangeEventBuffer)(this.asRxCollection);
    var documentConstructor;
    this._docCache = new _docCache.DocumentCache(this.schema.primaryPath, this.eventBulks$.pipe((0, _rxjs.filter)(bulk => !bulk.isLocal), (0, _rxjs.map)(bulk => bulk.events)), docData => {
      if (!documentConstructor) {
        documentConstructor = (0, _rxDocumentPrototypeMerge.getRxDocumentConstructor)(this.asRxCollection);
      }
      return (0, _rxDocumentPrototypeMerge.createNewRxDocument)(this.asRxCollection, documentConstructor, docData);
    });
    var listenToRemoveSub = this.database.internalStore.changeStream().pipe((0, _rxjs.filter)(bulk => {
      var key = this.name + '-' + this.schema.version;
      var found = bulk.events.find(event => {
        return event.documentData.context === 'collection' && event.documentData.key === key && event.operation === 'DELETE';
      });
      return !!found;
    })).subscribe(async () => {
      await this.close();
      await Promise.all(this.onRemove.map(fn => fn()));
    });
    this._subs.push(listenToRemoveSub);
    var databaseStorageToken = await this.database.storageToken;
    var subDocs = this.storageInstance.changeStream().subscribe(eventBulk => {
      var changeEventBulk = {
        id: eventBulk.id,
        isLocal: false,
        internal: false,
        collectionName: this.name,
        storageToken: databaseStorageToken,
        events: eventBulk.events,
        databaseToken: this.database.token,
        checkpoint: eventBulk.checkpoint,
        context: eventBulk.context
      };
      this.database.$emit(changeEventBulk);
    });
    this._subs.push(subDocs);
    return _index.PROMISE_RESOLVE_VOID;
  }

  /**
   * Manually call the cleanup function of the storage.
   * @link https://rxdb.info/cleanup.html
   */;
  _proto.cleanup = function cleanup(_minimumDeletedTime) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    throw (0, _index.pluginMissing)('cleanup');
  }

  // overwritten by migration-plugin
  ;
  _proto.migrationNeeded = function migrationNeeded() {
    throw (0, _index.pluginMissing)('migration-schema');
  };
  _proto.getMigrationState = function getMigrationState() {
    throw (0, _index.pluginMissing)('migration-schema');
  };
  _proto.startMigration = function startMigration(batchSize = 10) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    return this.getMigrationState().startMigration(batchSize);
  };
  _proto.migratePromise = function migratePromise(batchSize = 10) {
    return this.getMigrationState().migratePromise(batchSize);
  };
  _proto.insert = async function insert(json) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    var writeResult = await this.bulkInsert([json]);
    var isError = writeResult.error[0];
    (0, _rxStorageHelper.throwIfIsStorageWriteError)(this, json[this.schema.primaryPath], json, isError);
    var insertResult = (0, _index.ensureNotFalsy)(writeResult.success[0]);
    return insertResult;
  };
  _proto.insertIfNotExists = async function insertIfNotExists(json) {
    var writeResult = await this.bulkInsert([json]);
    if (writeResult.error.length > 0) {
      var error = writeResult.error[0];
      if (error.status === 409) {
        var conflictDocData = error.documentInDb;
        return (0, _docCache.mapDocumentsDataToCacheDocs)(this._docCache, [conflictDocData])[0];
      } else {
        throw error;
      }
    }
    return writeResult.success[0];
  };
  _proto.bulkInsert = async function bulkInsert(docsData) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    /**
     * Optimization shortcut,
     * do nothing when called with an empty array
    */
    if (docsData.length === 0) {
      return {
        success: [],
        error: []
      };
    }
    var primaryPath = this.schema.primaryPath;
    var ids = new Set();

    /**
     * This code is a bit redundant for better performance.
     * Instead of iterating multiple times,
     * we directly transform the input to a write-row array.
     */
    var insertRows;
    if (this.hasHooks('pre', 'insert')) {
      insertRows = await Promise.all(docsData.map(docData => {
        var useDocData = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(this.schema, docData);
        return this._runHooks('pre', 'insert', useDocData).then(() => {
          ids.add(useDocData[primaryPath]);
          return {
            document: useDocData
          };
        });
      }));
    } else {
      insertRows = new Array(docsData.length);
      var _schema = this.schema;
      for (var index = 0; index < docsData.length; index++) {
        var docData = docsData[index];
        var useDocData = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(_schema, docData);
        ids.add(useDocData[primaryPath]);
        insertRows[index] = {
          document: useDocData
        };
      }
    }
    if (ids.size !== docsData.length) {
      throw (0, _rxError.newRxError)('COL22', {
        collection: this.name,
        args: {
          documents: docsData
        }
      });
    }
    var results = await this.storageInstance.bulkWrite(insertRows, 'rx-collection-bulk-insert');

    /**
     * Often the user does not need to access the RxDocuments of the bulkInsert() call.
     * So we transform the data to RxDocuments only if needed to use less CPU performance.
     */
    var rxDocuments;
    var collection = this;
    var ret = {
      get success() {
        if (!rxDocuments) {
          var success = (0, _rxStorageHelper.getWrittenDocumentsFromBulkWriteResponse)(collection.schema.primaryPath, insertRows, results);
          rxDocuments = (0, _docCache.mapDocumentsDataToCacheDocs)(collection._docCache, success);
        }
        return rxDocuments;
      },
      error: results.error
    };
    if (this.hasHooks('post', 'insert')) {
      var docsMap = new Map();
      insertRows.forEach(row => {
        var doc = row.document;
        docsMap.set(doc[primaryPath], doc);
      });
      await Promise.all(ret.success.map(doc => {
        return this._runHooks('post', 'insert', docsMap.get(doc.primary), doc);
      }));
    }
    return ret;
  };
  _proto.bulkRemove = async function bulkRemove(
  /**
   * You can either remove the documents by their ids
   * or by directly providing the RxDocument instances
   * if you have them already. This improves performance a bit.
   */
  idsOrDocs) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    var primaryPath = this.schema.primaryPath;
    /**
     * Optimization shortcut,
     * do nothing when called with an empty array
     */
    if (idsOrDocs.length === 0) {
      return {
        success: [],
        error: []
      };
    }
    var rxDocumentMap;
    if (typeof idsOrDocs[0] === 'string') {
      rxDocumentMap = await this.findByIds(idsOrDocs).exec();
    } else {
      rxDocumentMap = new Map();
      idsOrDocs.forEach(d => rxDocumentMap.set(d.primary, d));
    }
    var docsData = [];
    var docsMap = new Map();
    Array.from(rxDocumentMap.values()).forEach(rxDocument => {
      var data = rxDocument.toMutableJSON(true);
      docsData.push(data);
      docsMap.set(rxDocument.primary, data);
    });
    await Promise.all(docsData.map(doc => {
      var primary = doc[this.schema.primaryPath];
      return this._runHooks('pre', 'remove', doc, rxDocumentMap.get(primary));
    }));
    var removeDocs = docsData.map(doc => {
      var writeDoc = (0, _index.flatClone)(doc);
      writeDoc._deleted = true;
      return {
        previous: doc,
        document: writeDoc
      };
    });
    var results = await this.storageInstance.bulkWrite(removeDocs, 'rx-collection-bulk-remove');
    var success = (0, _rxStorageHelper.getWrittenDocumentsFromBulkWriteResponse)(this.schema.primaryPath, removeDocs, results);
    var deletedRxDocuments = [];
    var successIds = success.map(d => {
      var id = d[primaryPath];
      var doc = this._docCache.getCachedRxDocument(d);
      deletedRxDocuments.push(doc);
      return id;
    });

    // run hooks
    await Promise.all(successIds.map(id => {
      return this._runHooks('post', 'remove', docsMap.get(id), rxDocumentMap.get(id));
    }));
    return {
      success: deletedRxDocuments,
      error: results.error
    };
  }

  /**
   * same as bulkInsert but overwrites existing document with same primary
   */;
  _proto.bulkUpsert = async function bulkUpsert(docsData) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    var insertData = [];
    var useJsonByDocId = new Map();
    docsData.forEach(docData => {
      var useJson = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(this.schema, docData);
      var primary = useJson[this.schema.primaryPath];
      if (!primary) {
        throw (0, _rxError.newRxError)('COL3', {
          primaryPath: this.schema.primaryPath,
          data: useJson,
          schema: this.schema.jsonSchema
        });
      }
      useJsonByDocId.set(primary, useJson);
      insertData.push(useJson);
    });
    var insertResult = await this.bulkInsert(insertData);
    var success = insertResult.success.slice(0);
    var error = [];

    // update the ones that existed already
    await Promise.all(insertResult.error.map(async err => {
      if (err.status !== 409) {
        error.push(err);
      } else {
        var id = err.documentId;
        var writeData = (0, _index.getFromMapOrThrow)(useJsonByDocId, id);
        var docDataInDb = (0, _index.ensureNotFalsy)(err.documentInDb);
        var doc = this._docCache.getCachedRxDocuments([docDataInDb])[0];
        var newDoc = await doc.incrementalModify(() => writeData);
        success.push(newDoc);
      }
    }));
    return {
      error,
      success
    };
  }

  /**
   * same as insert but overwrites existing document with same primary
   */;
  _proto.upsert = async function upsert(json) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    var bulkResult = await this.bulkUpsert([json]);
    (0, _rxStorageHelper.throwIfIsStorageWriteError)(this.asRxCollection, json[this.schema.primaryPath], json, bulkResult.error[0]);
    return bulkResult.success[0];
  }

  /**
   * upserts to a RxDocument, uses incrementalModify if document already exists
   */;
  _proto.incrementalUpsert = function incrementalUpsert(json) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    var useJson = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(this.schema, json);
    var primary = useJson[this.schema.primaryPath];
    if (!primary) {
      throw (0, _rxError.newRxError)('COL4', {
        data: json
      });
    }

    // ensure that it won't try 2 parallel runs
    var queue = this._incrementalUpsertQueues.get(primary);
    if (!queue) {
      queue = _index.PROMISE_RESOLVE_VOID;
    }
    queue = queue.then(() => _incrementalUpsertEnsureRxDocumentExists(this, primary, useJson)).then(wasInserted => {
      if (!wasInserted.inserted) {
        return _incrementalUpsertUpdate(wasInserted.doc, useJson);
      } else {
        return wasInserted.doc;
      }
    });
    this._incrementalUpsertQueues.set(primary, queue);
    return queue;
  };
  _proto.find = function find(queryObj) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    (0, _hooks.runPluginHooks)('prePrepareRxQuery', {
      op: 'find',
      queryObj,
      collection: this
    });
    if (!queryObj) {
      queryObj = (0, _rxQuery._getDefaultQuery)();
    }
    var query = (0, _rxQuery.createRxQuery)('find', queryObj, this);
    return query;
  };
  _proto.findOne = function findOne(queryObj) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    (0, _hooks.runPluginHooks)('prePrepareRxQuery', {
      op: 'findOne',
      queryObj,
      collection: this
    });
    var query;
    if (typeof queryObj === 'string') {
      query = (0, _rxQuery.createRxQuery)('findOne', {
        selector: {
          [this.schema.primaryPath]: queryObj
        },
        limit: 1
      }, this);
    } else {
      if (!queryObj) {
        queryObj = (0, _rxQuery._getDefaultQuery)();
      }

      // cannot have limit on findOne queries because it will be overwritten
      if (queryObj.limit) {
        throw (0, _rxError.newRxError)('QU6');
      }
      queryObj = (0, _index.flatClone)(queryObj);
      queryObj.limit = 1;
      query = (0, _rxQuery.createRxQuery)('findOne', queryObj, this);
    }
    return query;
  };
  _proto.count = function count(queryObj) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    if (!queryObj) {
      queryObj = (0, _rxQuery._getDefaultQuery)();
    }
    var query = (0, _rxQuery.createRxQuery)('count', queryObj, this);
    return query;
  }

  /**
   * find a list documents by their primary key
   * has way better performance then running multiple findOne() or a find() with a complex $or-selected
   */;
  _proto.findByIds = function findByIds(ids) {
    (0, _rxCollectionHelper.ensureRxCollectionIsNotClosed)(this);
    var mangoQuery = {
      selector: {
        [this.schema.primaryPath]: {
          $in: ids.slice(0)
        }
      }
    };
    var query = (0, _rxQuery.createRxQuery)('findByIds', mangoQuery, this);
    return query;
  }

  /**
   * Export collection to a JSON friendly format.
   */;
  _proto.exportJSON = function exportJSON() {
    throw (0, _index.pluginMissing)('json-dump');
  }

  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
   */;
  _proto.importJSON = function importJSON(_exportedJSON) {
    throw (0, _index.pluginMissing)('json-dump');
  };
  _proto.insertCRDT = function insertCRDT(_updateObj) {
    throw (0, _index.pluginMissing)('crdt');
  };
  _proto.addPipeline = function addPipeline(_options) {
    throw (0, _index.pluginMissing)('pipeline');
  }

  /**
   * HOOKS
   */;
  _proto.addHook = function addHook(when, key, fun, parallel = false) {
    if (typeof fun !== 'function') {
      throw (0, _rxError.newRxTypeError)('COL7', {
        key,
        when
      });
    }
    if (!HOOKS_WHEN.includes(when)) {
      throw (0, _rxError.newRxTypeError)('COL8', {
        key,
        when
      });
    }
    if (!HOOKS_KEYS.includes(key)) {
      throw (0, _rxError.newRxError)('COL9', {
        key
      });
    }
    if (when === 'post' && key === 'create' && parallel === true) {
      throw (0, _rxError.newRxError)('COL10', {
        when,
        key,
        parallel
      });
    }

    // bind this-scope to hook-function
    var boundFun = fun.bind(this);
    var runName = parallel ? 'parallel' : 'series';
    this.hooks[key] = this.hooks[key] || {};
    this.hooks[key][when] = this.hooks[key][when] || {
      series: [],
      parallel: []
    };
    this.hooks[key][when][runName].push(boundFun);
  };
  _proto.getHooks = function getHooks(when, key) {
    if (!this.hooks[key] || !this.hooks[key][when]) {
      return {
        series: [],
        parallel: []
      };
    }
    return this.hooks[key][when];
  };
  _proto.hasHooks = function hasHooks(when, key) {
    /**
     * Performance shortcut
     * so that we not have to build the empty object.
     */
    if (!this.hooks[key] || !this.hooks[key][when]) {
      return false;
    }
    var hooks = this.getHooks(when, key);
    if (!hooks) {
      return false;
    }
    return hooks.series.length > 0 || hooks.parallel.length > 0;
  };
  _proto._runHooks = function _runHooks(when, key, data, instance) {
    var hooks = this.getHooks(when, key);
    if (!hooks) {
      return _index.PROMISE_RESOLVE_VOID;
    }

    // run parallel: false
    var tasks = hooks.series.map(hook => () => hook(data, instance));
    return (0, _index.promiseSeries)(tasks)
    // run parallel: true
    .then(() => Promise.all(hooks.parallel.map(hook => hook(data, instance))));
  }

  /**
   * does the same as ._runHooks() but with non-async-functions
   */;
  _proto._runHooksSync = function _runHooksSync(when, key, data, instance) {
    if (!this.hasHooks(when, key)) {
      return;
    }
    var hooks = this.getHooks(when, key);
    if (!hooks) return;
    hooks.series.forEach(hook => hook(data, instance));
  }

  /**
   * Returns a promise that resolves after the given time.
   * Ensures that is properly cleans up when the collection is closed
   * so that no running timeouts prevent the exit of the JavaScript process.
   */;
  _proto.promiseWait = function promiseWait(time) {
    var ret = new Promise(res => {
      var timeout = setTimeout(() => {
        this.timeouts.delete(timeout);
        res();
      }, time);
      this.timeouts.add(timeout);
    });
    return ret;
  };
  _proto.close = async function close() {
    if (this.closed) {
      return _index.PROMISE_RESOLVE_FALSE;
    }
    OPEN_COLLECTIONS.delete(this);
    await Promise.all(this.onClose.map(fn => fn()));

    /**
     * Settings closed = true
     * must be the first thing to do,
     * so for example the replication can directly stop
     * instead of sending requests to a closed storage.
     */
    this.closed = true;
    Array.from(this.timeouts).forEach(timeout => clearTimeout(timeout));
    if (this._changeEventBuffer) {
      this._changeEventBuffer.close();
    }
    /**
     * First wait until the whole database is idle.
     * This ensures that the storage does not get closed
     * while some operation is running.
     * It is important that we do not intercept a running call
     * because it might lead to undefined behavior like when a doc is written
     * but the change is not added to the changes collection.
     */
    return this.database.requestIdlePromise().then(() => this.storageInstance.close()).then(() => {
      /**
       * Unsubscribing must be done AFTER the storageInstance.close()
       * Because the conflict handling is part of the subscriptions and
       * otherwise there might be open conflicts to be resolved which
       * will then stuck and never resolve.
       */
      this._subs.forEach(sub => sub.unsubscribe());
      delete this.database.collections[this.name];
      return (0, _hooks.runAsyncPluginHooks)('postCloseRxCollection', this).then(() => true);
    });
  }

  /**
   * remove all data of the collection
   */;
  _proto.remove = async function remove() {
    await this.close();
    await Promise.all(this.onRemove.map(fn => fn()));
    /**
     * TODO here we should pass the already existing
     * storage instances instead of creating new ones.
     */
    await (0, _rxCollectionHelper.removeCollectionStorages)(this.database.storage, this.database.internalStore, this.database.token, this.database.name, this.name, this.database.multiInstance, this.database.password, this.database.hashFunction);
  };
  return (0, _createClass2.default)(RxCollectionBase, [{
    key: "insert$",
    get: function () {
      return this.$.pipe((0, _rxjs.filter)(cE => cE.operation === 'INSERT'));
    }
  }, {
    key: "update$",
    get: function () {
      return this.$.pipe((0, _rxjs.filter)(cE => cE.operation === 'UPDATE'));
    }
  }, {
    key: "remove$",
    get: function () {
      return this.$.pipe((0, _rxjs.filter)(cE => cE.operation === 'DELETE'));
    }

    // defaults

    /**
     * Internally only use eventBulks$
     * Do not use .$ or .observable$ because that has to transform
     * the events which decreases performance.
     */

    /**
     * When the collection is closed,
     * these functions will be called an awaited.
     * Used to automatically clean up stuff that
     * belongs to this collection.
    */
  }, {
    key: "asRxCollection",
    get: function () {
      return this;
    }
  }]);
}();
/**
 * adds the hook-functions to the collections prototype
 * this runs only once
 */
function _applyHookFunctions(collection) {
  if (hooksApplied) return; // already run
  hooksApplied = true;
  var colProto = Object.getPrototypeOf(collection);
  HOOKS_KEYS.forEach(key => {
    HOOKS_WHEN.map(when => {
      var fnName = when + (0, _index.ucfirst)(key);
      colProto[fnName] = function (fun, parallel) {
        return this.addHook(when, key, fun, parallel);
      };
    });
  });
}
function _incrementalUpsertUpdate(doc, json) {
  return doc.incrementalModify(_innerDoc => {
    return json;
  });
}

/**
 * ensures that the given document exists
 * @return promise that resolves with new doc and flag if inserted
 */
function _incrementalUpsertEnsureRxDocumentExists(rxCollection, primary, json) {
  /**
   * Optimisation shortcut,
   * first try to find the document in the doc-cache
   */
  var docDataFromCache = rxCollection._docCache.getLatestDocumentDataIfExists(primary);
  if (docDataFromCache) {
    return Promise.resolve({
      doc: rxCollection._docCache.getCachedRxDocuments([docDataFromCache])[0],
      inserted: false
    });
  }
  return rxCollection.findOne(primary).exec().then(doc => {
    if (!doc) {
      return rxCollection.insert(json).then(newDoc => ({
        doc: newDoc,
        inserted: true
      }));
    } else {
      return {
        doc,
        inserted: false
      };
    }
  });
}

/**
 * creates and prepares a new collection
 */
async function createRxCollection({
  database,
  name,
  schema,
  instanceCreationOptions = {},
  migrationStrategies = {},
  autoMigrate = true,
  statics = {},
  methods = {},
  attachments = {},
  options = {},
  localDocuments = false,
  cacheReplacementPolicy = _queryCache.defaultCacheReplacementPolicy,
  conflictHandler = _defaultConflictHandler.defaultConflictHandler
}) {
  var storageInstanceCreationParams = {
    databaseInstanceToken: database.token,
    databaseName: database.name,
    collectionName: name,
    schema: schema.jsonSchema,
    options: instanceCreationOptions,
    multiInstance: database.multiInstance,
    password: database.password,
    devMode: _overwritable.overwritable.isDevMode()
  };
  (0, _hooks.runPluginHooks)('preCreateRxStorageInstance', storageInstanceCreationParams);
  var storageInstance = await (0, _rxCollectionHelper.createRxCollectionStorageInstance)(database, storageInstanceCreationParams);
  var collection = new RxCollectionBase(database, name, schema, storageInstance, instanceCreationOptions, migrationStrategies, methods, attachments, options, cacheReplacementPolicy, statics, conflictHandler);
  try {
    await collection.prepare();

    // ORM add statics
    Object.entries(statics).forEach(([funName, fun]) => {
      Object.defineProperty(collection, funName, {
        get: () => fun.bind(collection)
      });
    });
    (0, _hooks.runPluginHooks)('createRxCollection', {
      collection,
      creator: {
        name,
        schema,
        storageInstance,
        instanceCreationOptions,
        migrationStrategies,
        methods,
        attachments,
        options,
        cacheReplacementPolicy,
        localDocuments,
        statics
      }
    });

    /**
     * Migration must run after the hooks so that the
     * dev-mode can check up front if the
     * migration strategies are correctly set.
     */
    if (autoMigrate && collection.schema.version !== 0) {
      await collection.migratePromise();
    }
  } catch (err) {
    /**
     * If the collection creation fails,
     * we yet have to close the storage instances.
     */
    OPEN_COLLECTIONS.delete(collection);
    await storageInstance.close();
    throw err;
  }
  return collection;
}
function isRxCollection(obj) {
  return obj instanceof RxCollectionBase;
}
//# sourceMappingURL=rx-collection.js.map