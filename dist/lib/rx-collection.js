"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxCollectionBase = void 0;
exports.createRxCollection = createRxCollection;
exports.isRxCollection = isRxCollection;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _operators = require("rxjs/operators");
var _utils = require("./plugins/utils");
var _rxCollectionHelper = require("./rx-collection-helper");
var _rxQuery = require("./rx-query");
var _rxError = require("./rx-error");
var _docCache = require("./doc-cache");
var _queryCache = require("./query-cache");
var _changeEventBuffer = require("./change-event-buffer");
var _hooks = require("./hooks");
var _rxDocumentPrototypeMerge = require("./rx-document-prototype-merge");
var _rxStorageHelper = require("./rx-storage-helper");
var _replicationProtocol = require("./replication-protocol");
var _incrementalWrite = require("./incremental-write");
var _rxDocument = require("./rx-document");
var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
var hooksApplied = false;
var RxCollectionBase = /*#__PURE__*/function () {
  /**
   * Stores all 'normal' documents
   */

  function RxCollectionBase(database, name, schema, internalStorageInstance, instanceCreationOptions = {}, migrationStrategies = {}, methods = {}, attachments = {}, options = {}, cacheReplacementPolicy = _queryCache.defaultCacheReplacementPolicy, statics = {}, conflictHandler = _replicationProtocol.defaultConflictHandler) {
    this.storageInstance = {};
    this.timeouts = new Set();
    this.incrementalWriteQueue = {};
    this._incrementalUpsertQueues = new Map();
    this.synced = false;
    this.hooks = {};
    this._subs = [];
    this._docCache = {};
    this._queryCache = (0, _queryCache.createQueryCache)();
    this.$ = {};
    this._changeEventBuffer = {};
    this.onDestroy = [];
    this.destroyed = false;
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
  }
  var _proto = RxCollectionBase.prototype;
  _proto.prepare = async function prepare() {
    this.storageInstance = (0, _rxStorageHelper.getWrappedStorageInstance)(this.database, this.internalStorageInstance, this.schema.jsonSchema);
    this.incrementalWriteQueue = new _incrementalWrite.IncrementalWriteQueue(this.storageInstance, this.schema.primaryPath, (newData, oldData) => (0, _rxDocument.beforeDocumentUpdateWrite)(this, newData, oldData), result => this._runHooks('post', 'save', result));
    this.$ = this.database.eventBulks$.pipe((0, _operators.filter)(changeEventBulk => changeEventBulk.collectionName === this.name), (0, _operators.mergeMap)(changeEventBulk => changeEventBulk.events));
    this._changeEventBuffer = (0, _changeEventBuffer.createChangeEventBuffer)(this.asRxCollection);
    this._docCache = new _docCache.DocumentCache(this.schema.primaryPath, this.$.pipe((0, _operators.filter)(cE => !cE.isLocal)), docData => (0, _rxDocumentPrototypeMerge.createNewRxDocument)(this.asRxCollection, docData));

    /**
     * Instead of resolving the EventBulk array here and spit it into
     * single events, we should fully work with event bulks internally
     * to save performance.
     */
    var databaseStorageToken = await this.database.storageToken;
    var subDocs = this.storageInstance.changeStream().subscribe(eventBulk => {
      var changeEventBulk = {
        id: eventBulk.id,
        internal: false,
        collectionName: this.name,
        storageToken: databaseStorageToken,
        events: eventBulk.events.map(ev => (0, _rxStorageHelper.storageChangeEventToRxChangeEvent)(false, ev, this)),
        databaseToken: this.database.token,
        checkpoint: eventBulk.checkpoint,
        context: eventBulk.context
      };
      this.database.$emit(changeEventBulk);
    });
    this._subs.push(subDocs);

    /**
     * Resolve the conflict tasks
     * of the RxStorageInstance
     */
    this._subs.push(this.storageInstance.conflictResultionTasks().subscribe(task => {
      this.conflictHandler(task.input, task.context).then(output => {
        this.storageInstance.resolveConflictResultionTask({
          id: task.id,
          output
        });
      });
    }));
    return _utils.PROMISE_RESOLVE_VOID;
  }

  // overwritte by migration-plugin
  ;
  _proto.migrationNeeded = function migrationNeeded() {
    throw (0, _utils.pluginMissing)('migration');
  };
  _proto.getDataMigrator = function getDataMigrator() {
    throw (0, _utils.pluginMissing)('migration');
  };
  _proto.migrate = function migrate(batchSize = 10) {
    return this.getDataMigrator().migrate(batchSize);
  };
  _proto.migratePromise = function migratePromise(batchSize = 10) {
    return this.getDataMigrator().migratePromise(batchSize);
  };
  _proto.insert = async function insert(json) {
    // TODO do we need fillObjectDataBeforeInsert() here because it is also run at bulkInsert() later
    var useJson = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(this.schema, json);
    var writeResult = await this.bulkInsert([useJson]);
    var isError = writeResult.error[0];
    (0, _rxStorageHelper.throwIfIsStorageWriteError)(this, useJson[this.schema.primaryPath], json, isError);
    var insertResult = (0, _utils.ensureNotFalsy)(writeResult.success[0]);
    return insertResult;
  };
  _proto.bulkInsert = async function bulkInsert(docsData) {
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
    var useDocs = docsData.map(docData => {
      var useDocData = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(this.schema, docData);
      return useDocData;
    });
    var docs = this.hasHooks('pre', 'insert') ? await Promise.all(useDocs.map(doc => {
      return this._runHooks('pre', 'insert', doc).then(() => {
        return doc;
      });
    })) : useDocs;
    var docsMap = new Map();
    var insertRows = docs.map(doc => {
      docsMap.set(doc[this.schema.primaryPath], doc);
      var docData = Object.assign(doc, {
        _attachments: {},
        _meta: (0, _utils.getDefaultRxDocumentMeta)(),
        _rev: (0, _utils.getDefaultRevision)(),
        _deleted: false
      });
      var row = {
        document: docData
      };
      return row;
    });
    var results = await this.storageInstance.bulkWrite(insertRows, 'rx-collection-bulk-insert');

    // create documents
    var successDocData = Object.values(results.success);
    var rxDocuments = successDocData.map(writtenDocData => this._docCache.getCachedRxDocument(writtenDocData));
    if (this.hasHooks('post', 'insert')) {
      await Promise.all(rxDocuments.map(doc => {
        return this._runHooks('post', 'insert', docsMap.get(doc.primary), doc);
      }));
    }
    return {
      success: rxDocuments,
      error: Object.values(results.error)
    };
  };
  _proto.bulkRemove = async function bulkRemove(ids) {
    /**
     * Optimization shortcut,
     * do nothing when called with an empty array
     */
    if (ids.length === 0) {
      return {
        success: [],
        error: []
      };
    }
    var rxDocumentMap = await this.findByIds(ids).exec();
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
      var writeDoc = (0, _utils.flatClone)(doc);
      writeDoc._deleted = true;
      return {
        previous: doc,
        document: writeDoc
      };
    });
    var results = await this.storageInstance.bulkWrite(removeDocs, 'rx-collection-bulk-remove');
    var successIds = Object.keys(results.success);

    // run hooks
    await Promise.all(successIds.map(id => {
      return this._runHooks('post', 'remove', docsMap.get(id), rxDocumentMap.get(id));
    }));
    var rxDocuments = successIds.map(id => (0, _utils.getFromMapOrThrow)(rxDocumentMap, id));
    return {
      success: rxDocuments,
      error: Object.values(results.error)
    };
  }

  /**
   * same as bulkInsert but overwrites existing document with same primary
   */;
  _proto.bulkUpsert = async function bulkUpsert(docsData) {
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
    var ret = insertResult.success.slice(0);
    var updatedDocs = await Promise.all(insertResult.error.map(async error => {
      if (error.status !== 409) {
        throw (0, _rxError.newRxError)('VD2', {
          collection: this.name,
          writeError: error
        });
      }
      var id = error.documentId;
      var writeData = (0, _utils.getFromMapOrThrow)(useJsonByDocId, id);
      var docDataInDb = (0, _utils.ensureNotFalsy)(error.documentInDb);
      var doc = this._docCache.getCachedRxDocument(docDataInDb);
      var newDoc = await doc.incrementalModify(() => writeData);
      return newDoc;
    }));
    ret = ret.concat(updatedDocs);
    return ret;
  }

  /**
   * same as insert but overwrites existing document with same primary
   */;
  _proto.upsert = function upsert(json) {
    return this.bulkUpsert([json]).then(result => result[0]);
  }

  /**
   * upserts to a RxDocument, uses incrementalModify if document already exists
   */;
  _proto.incrementalUpsert = function incrementalUpsert(json) {
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
      queue = _utils.PROMISE_RESOLVE_VOID;
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
    if (typeof queryObj === 'string') {
      throw (0, _rxError.newRxError)('COL5', {
        queryObj
      });
    }
    if (!queryObj) {
      queryObj = (0, _rxQuery._getDefaultQuery)();
    }
    var query = (0, _rxQuery.createRxQuery)('find', queryObj, this);
    return query;
  };
  _proto.findOne = function findOne(queryObj) {
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

      // cannot have limit on findOne queries because it will be overwritte
      if (queryObj.limit) {
        throw (0, _rxError.newRxError)('QU6');
      }
      queryObj.limit = 1;
      query = (0, _rxQuery.createRxQuery)('findOne', queryObj, this);
    }
    if (typeof queryObj === 'number' || Array.isArray(queryObj)) {
      throw (0, _rxError.newRxTypeError)('COL6', {
        queryObj
      });
    }
    return query;
  };
  _proto.count = function count(queryObj) {
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
    throw (0, _utils.pluginMissing)('json-dump');
  }

  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
   */;
  _proto.importJSON = function importJSON(_exportedJSON) {
    throw (0, _utils.pluginMissing)('json-dump');
  };
  _proto.insertCRDT = function insertCRDT(_updateObj) {
    throw (0, _utils.pluginMissing)('crdt');
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
    var hooks = this.getHooks(when, key);
    if (!hooks) {
      return false;
    }
    return hooks.series.length > 0 || hooks.parallel.length > 0;
  };
  _proto._runHooks = function _runHooks(when, key, data, instance) {
    var hooks = this.getHooks(when, key);
    if (!hooks) {
      return _utils.PROMISE_RESOLVE_VOID;
    }

    // run parallel: false
    var tasks = hooks.series.map(hook => () => hook(data, instance));
    return (0, _utils.promiseSeries)(tasks)
    // run parallel: true
    .then(() => Promise.all(hooks.parallel.map(hook => hook(data, instance))));
  }

  /**
   * does the same as ._runHooks() but with non-async-functions
   */;
  _proto._runHooksSync = function _runHooksSync(when, key, data, instance) {
    var hooks = this.getHooks(when, key);
    if (!hooks) return;
    hooks.series.forEach(hook => hook(data, instance));
  }

  /**
   * Returns a promise that resolves after the given time.
   * Ensures that is properly cleans up when the collection is destroyed
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
  _proto.destroy = function destroy() {
    if (this.destroyed) {
      return _utils.PROMISE_RESOLVE_FALSE;
    }

    /**
     * Settings destroyed = true
     * must be the first thing to do,
     * so for example the replication can directly stop
     * instead of sending requests to a closed storage.
     */
    this.destroyed = true;
    Array.from(this.timeouts).forEach(timeout => clearTimeout(timeout));
    if (this._changeEventBuffer) {
      this._changeEventBuffer.destroy();
    }
    /**
     * First wait until the whole database is idle.
     * This ensures that the storage does not get closed
     * while some operation is running.
     * It is important that we do not intercept a running call
     * because it might lead to undefined behavior like when a doc is written
     * but the change is not added to the changes collection.
     */
    return this.database.requestIdlePromise().then(() => Promise.all(this.onDestroy.map(fn => fn()))).then(() => this.storageInstance.close()).then(() => {
      /**
       * Unsubscribing must be done AFTER the storageInstance.close()
       * Because the conflict handling is part of the subscriptions and
       * otherwise there might be open conflicts to be resolved which
       * will then stuck and never resolve.
       */
      this._subs.forEach(sub => sub.unsubscribe());
      delete this.database.collections[this.name];
      return (0, _hooks.runAsyncPluginHooks)('postDestroyRxCollection', this).then(() => true);
    });
  }

  /**
   * remove all data of the collection
   */;
  _proto.remove = async function remove() {
    await this.destroy();
    await (0, _rxCollectionHelper.removeCollectionStorages)(this.database.storage, this.database.internalStore, this.database.token, this.database.name, this.name, this.database.hashFunction);
  };
  (0, _createClass2.default)(RxCollectionBase, [{
    key: "insert$",
    get: function () {
      return this.$.pipe((0, _operators.filter)(cE => cE.operation === 'INSERT'));
    }
  }, {
    key: "update$",
    get: function () {
      return this.$.pipe((0, _operators.filter)(cE => cE.operation === 'UPDATE'));
    }
  }, {
    key: "remove$",
    get: function () {
      return this.$.pipe((0, _operators.filter)(cE => cE.operation === 'DELETE'));
    }
  }, {
    key: "asRxCollection",
    get: function () {
      return this;
    }
  }]);
  return RxCollectionBase;
}();
/**
 * adds the hook-functions to the collections prototype
 * this runs only once
 */
exports.RxCollectionBase = RxCollectionBase;
function _applyHookFunctions(collection) {
  if (hooksApplied) return; // already run
  hooksApplied = true;
  var colProto = Object.getPrototypeOf(collection);
  HOOKS_KEYS.forEach(key => {
    HOOKS_WHEN.map(when => {
      var fnName = when + (0, _utils.ucfirst)(key);
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
      doc: rxCollection._docCache.getCachedRxDocument(docDataFromCache),
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
function createRxCollection({
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
  conflictHandler = _replicationProtocol.defaultConflictHandler
}) {
  var storageInstanceCreationParams = {
    databaseInstanceToken: database.token,
    databaseName: database.name,
    collectionName: name,
    schema: schema.jsonSchema,
    options: instanceCreationOptions,
    multiInstance: database.multiInstance,
    password: database.password
  };
  (0, _hooks.runPluginHooks)('preCreateRxStorageInstance', storageInstanceCreationParams);
  return (0, _rxCollectionHelper.createRxCollectionStorageInstance)(database, storageInstanceCreationParams).then(storageInstance => {
    var collection = new RxCollectionBase(database, name, schema, storageInstance, instanceCreationOptions, migrationStrategies, methods, attachments, options, cacheReplacementPolicy, statics, conflictHandler);
    return collection.prepare().then(() => {
      // ORM add statics
      Object.entries(statics).forEach(([funName, fun]) => {
        Object.defineProperty(collection, funName, {
          get: () => fun.bind(collection)
        });
      });
      var ret = _utils.PROMISE_RESOLVE_VOID;
      if (autoMigrate && collection.schema.version !== 0) {
        ret = collection.migratePromise();
      }
      return ret;
    }).then(() => {
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
      return collection;
    })
    /**
     * If the collection creation fails,
     * we yet have to close the storage instances.
     */.catch(err => {
      return storageInstance.close().then(() => Promise.reject(err));
    });
  });
}
function isRxCollection(obj) {
  return obj instanceof RxCollectionBase;
}
//# sourceMappingURL=rx-collection.js.map