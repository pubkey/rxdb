import _createClass from "@babel/runtime/helpers/createClass";
import { filter, startWith, mergeMap, shareReplay } from 'rxjs/operators';
import { ucfirst, flatClone, promiseSeries, pluginMissing, ensureNotFalsy, getFromMapOrThrow, clone, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_VOID, RXJS_SHARE_REPLAY_DEFAULTS, getDefaultRxDocumentMeta, getDefaultRevision, nextTick } from './util';
import { fillObjectDataBeforeInsert, createRxCollectionStorageInstance, removeCollectionStorages } from './rx-collection-helper';
import { createRxQuery, _getDefaultQuery } from './rx-query';
import { newRxError, newRxTypeError } from './rx-error';
import { DocCache } from './doc-cache';
import { createQueryCache, defaultCacheReplacementPolicy } from './query-cache';
import { createChangeEventBuffer } from './change-event-buffer';
import { runAsyncPluginHooks, runPluginHooks } from './hooks';
import { createRxDocument } from './rx-document-prototype-merge';
import { getWrappedStorageInstance, storageChangeEventToRxChangeEvent, throwIfIsStorageWriteError } from './rx-storage-helper';
import { defaultConflictHandler } from './replication-protocol';
var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
var hooksApplied = false;
export var RxCollectionBase = /*#__PURE__*/function () {
  /**
   * Stores all 'normal' documents
   */

  function RxCollectionBase(database, name, schema, internalStorageInstance) {
    var instanceCreationOptions = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    var migrationStrategies = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
    var methods = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
    var attachments = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
    var options = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : {};
    var cacheReplacementPolicy = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : defaultCacheReplacementPolicy;
    var statics = arguments.length > 10 && arguments[10] !== undefined ? arguments[10] : {};
    var conflictHandler = arguments.length > 11 && arguments[11] !== undefined ? arguments[11] : defaultConflictHandler;
    this.storageInstance = {};
    this.timeouts = new Set();
    this._atomicUpsertQueues = new Map();
    this.synced = false;
    this.hooks = {};
    this._subs = [];
    this._docCache = new DocCache();
    this._queryCache = createQueryCache();
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
  _proto.prepare = function prepare() {
    try {
      var _this2 = this;
      _this2.storageInstance = getWrappedStorageInstance(_this2.database, _this2.internalStorageInstance, _this2.schema.jsonSchema);
      _this2.$ = _this2.database.eventBulks$.pipe(filter(function (changeEventBulk) {
        return changeEventBulk.collectionName === _this2.name;
      }), mergeMap(function (changeEventBulk) {
        return changeEventBulk.events;
      }));
      _this2._changeEventBuffer = createChangeEventBuffer(_this2.asRxCollection);

      /**
       * Instead of resolving the EventBulk array here and spit it into
       * single events, we should fully work with event bulks internally
       * to save performance.
       */
      return Promise.resolve(_this2.database.storageToken).then(function (databaseStorageToken) {
        var subDocs = _this2.storageInstance.changeStream().subscribe(function (eventBulk) {
          var changeEventBulk = {
            id: eventBulk.id,
            internal: false,
            collectionName: _this2.name,
            storageToken: databaseStorageToken,
            events: eventBulk.events.map(function (ev) {
              return storageChangeEventToRxChangeEvent(false, ev, _this2);
            }),
            databaseToken: _this2.database.token,
            checkpoint: eventBulk.checkpoint,
            context: eventBulk.context
          };
          _this2.database.$emit(changeEventBulk);
        });
        _this2._subs.push(subDocs);

        /**
         * When a write happens to the collection
         * we find the changed document in the docCache
         * and tell it that it has to change its data.
         */
        _this2._subs.push(_this2.$.pipe(filter(function (cE) {
          return !cE.isLocal;
        })).subscribe(function (cE) {
          // when data changes, send it to RxDocument in docCache
          var doc = _this2._docCache.get(cE.documentId);
          if (doc) {
            doc._handleChangeEvent(cE);
          }
        }));

        /**
         * Resolve the conflict tasks
         * of the RxStorageInstance
         */
        _this2._subs.push(_this2.storageInstance.conflictResultionTasks().subscribe(function (task) {
          _this2.conflictHandler(task.input, task.context).then(function (output) {
            _this2.storageInstance.resolveConflictResultionTask({
              id: task.id,
              output: output
            });
          });
        }));
        return PROMISE_RESOLVE_VOID;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  } // overwritte by migration-plugin
  ;
  _proto.migrationNeeded = function migrationNeeded() {
    throw pluginMissing('migration');
  };
  _proto.getDataMigrator = function getDataMigrator() {
    throw pluginMissing('migration');
  };
  _proto.migrate = function migrate() {
    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    return this.getDataMigrator().migrate(batchSize);
  };
  _proto.migratePromise = function migratePromise() {
    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    return this.getDataMigrator().migratePromise(batchSize);
  };
  _proto.insert = function insert(json) {
    try {
      var _this4 = this;
      // TODO do we need fillObjectDataBeforeInsert() here because it is also run at bulkInsert() later
      var useJson = fillObjectDataBeforeInsert(_this4.schema, json);
      return Promise.resolve(_this4.bulkInsert([useJson])).then(function (writeResult) {
        var isError = writeResult.error[0];
        throwIfIsStorageWriteError(_this4, useJson[_this4.schema.primaryPath], json, isError);
        var insertResult = ensureNotFalsy(writeResult.success[0]);
        return insertResult;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.bulkInsert = function bulkInsert(docsData) {
    try {
      var _temp4 = function _temp4(docs) {
        var docsMap = new Map();
        var insertRows = docs.map(function (doc) {
          docsMap.set(doc[_this6.schema.primaryPath], doc);
          var docData = Object.assign(doc, {
            _attachments: {},
            _meta: getDefaultRxDocumentMeta(),
            _rev: getDefaultRevision(),
            _deleted: false
          });
          var row = {
            document: docData
          };
          return row;
        });
        return Promise.resolve(_this6.storageInstance.bulkWrite(insertRows, 'rx-collection-bulk-insert')).then(function (results) {
          function _temp2() {
            return {
              success: rxDocuments,
              error: Object.values(results.error)
            };
          }
          // create documents
          var successDocData = Object.values(results.success);
          var rxDocuments = successDocData.map(function (writtenDocData) {
            var doc = createRxDocument(_this6, writtenDocData);
            return doc;
          });
          var _temp = function () {
            if (_this6.hasHooks('post', 'insert')) {
              return Promise.resolve(Promise.all(rxDocuments.map(function (doc) {
                return _this6._runHooks('post', 'insert', docsMap.get(doc.primary), doc);
              }))).then(function () {});
            }
          }();
          return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
        });
      };
      var _this6 = this;
      /**
       * Optimization shortcut,
       * do nothing when called with an empty array
       */
      if (docsData.length === 0) {
        return Promise.resolve({
          success: [],
          error: []
        });
      }
      var useDocs = docsData.map(function (docData) {
        var useDocData = fillObjectDataBeforeInsert(_this6.schema, docData);
        return useDocData;
      });
      var _this5$hasHooks2 = _this6.hasHooks('pre', 'insert');
      return Promise.resolve(_this5$hasHooks2 ? Promise.resolve(Promise.all(useDocs.map(function (doc) {
        return _this6._runHooks('pre', 'insert', doc).then(function () {
          return doc;
        });
      }))).then(_temp4) : _temp4(useDocs));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.bulkRemove = function bulkRemove(ids) {
    try {
      var _this8 = this;
      /**
       * Optimization shortcut,
       * do nothing when called with an empty array
       */
      if (ids.length === 0) {
        return Promise.resolve({
          success: [],
          error: []
        });
      }
      return Promise.resolve(_this8.findByIds(ids)).then(function (rxDocumentMap) {
        var docsData = [];
        var docsMap = new Map();
        Array.from(rxDocumentMap.values()).forEach(function (rxDocument) {
          var data = clone(rxDocument.toJSON(true));
          docsData.push(data);
          docsMap.set(rxDocument.primary, data);
        });
        return Promise.resolve(Promise.all(docsData.map(function (doc) {
          var primary = doc[_this8.schema.primaryPath];
          return _this8._runHooks('pre', 'remove', doc, rxDocumentMap.get(primary));
        }))).then(function () {
          var removeDocs = docsData.map(function (doc) {
            var writeDoc = flatClone(doc);
            writeDoc._deleted = true;
            return {
              previous: doc,
              document: writeDoc
            };
          });
          return Promise.resolve(_this8.storageInstance.bulkWrite(removeDocs, 'rx-collection-bulk-remove')).then(function (results) {
            var successIds = Object.keys(results.success);

            // run hooks
            return Promise.resolve(Promise.all(successIds.map(function (id) {
              return _this8._runHooks('post', 'remove', docsMap.get(id), rxDocumentMap.get(id));
            }))).then(function () {
              var rxDocuments = successIds.map(function (id) {
                return rxDocumentMap.get(id);
              });
              return {
                success: rxDocuments,
                error: Object.values(results.error)
              };
            });
          });
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * same as bulkInsert but overwrites existing document with same primary
   */
  ;
  _proto.bulkUpsert = function bulkUpsert(docsData) {
    try {
      var _this10 = this;
      var insertData = [];
      var useJsonByDocId = new Map();
      docsData.forEach(function (docData) {
        var useJson = fillObjectDataBeforeInsert(_this10.schema, docData);
        var primary = useJson[_this10.schema.primaryPath];
        if (!primary) {
          throw newRxError('COL3', {
            primaryPath: _this10.schema.primaryPath,
            data: useJson,
            schema: _this10.schema.jsonSchema
          });
        }
        useJsonByDocId.set(primary, useJson);
        insertData.push(useJson);
      });
      return Promise.resolve(_this10.bulkInsert(insertData)).then(function (insertResult) {
        var ret = insertResult.success.slice(0);
        return Promise.resolve(Promise.all(insertResult.error.map(function (error) {
          var id = error.documentId;
          var writeData = getFromMapOrThrow(useJsonByDocId, id);
          var docDataInDb = ensureNotFalsy(error.documentInDb);
          var doc = createRxDocument(_this10.asRxCollection, docDataInDb);
          return doc.atomicUpdate(function () {
            return writeData;
          });
        }))).then(function (updatedDocs) {
          ret = ret.concat(updatedDocs);
          return ret;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * same as insert but overwrites existing document with same primary
   */
  ;
  _proto.upsert = function upsert(json) {
    return this.bulkUpsert([json]).then(function (result) {
      return result[0];
    });
  }

  /**
   * upserts to a RxDocument, uses atomicUpdate if document already exists
   */;
  _proto.atomicUpsert = function atomicUpsert(json) {
    var _this11 = this;
    var useJson = fillObjectDataBeforeInsert(this.schema, json);
    var primary = useJson[this.schema.primaryPath];
    if (!primary) {
      throw newRxError('COL4', {
        data: json
      });
    }

    // ensure that it won't try 2 parallel runs
    var queue = this._atomicUpsertQueues.get(primary);
    if (!queue) {
      queue = PROMISE_RESOLVE_VOID;
    }
    queue = queue.then(function () {
      return _atomicUpsertEnsureRxDocumentExists(_this11, primary, useJson);
    }).then(function (wasInserted) {
      if (!wasInserted.inserted) {
        return _atomicUpsertUpdate(wasInserted.doc, useJson).then(function () {
          return wasInserted.doc;
        });
      } else {
        return wasInserted.doc;
      }
    });
    this._atomicUpsertQueues.set(primary, queue);
    return queue;
  };
  _proto.find = function find(queryObj) {
    if (typeof queryObj === 'string') {
      throw newRxError('COL5', {
        queryObj: queryObj
      });
    }
    if (!queryObj) {
      queryObj = _getDefaultQuery();
    }
    var query = createRxQuery('find', queryObj, this.asRxCollection);
    return query;
  };
  _proto.findOne = function findOne(queryObj) {
    var query;
    if (typeof queryObj === 'string') {
      var _selector;
      query = createRxQuery('findOne', {
        selector: (_selector = {}, _selector[this.schema.primaryPath] = queryObj, _selector),
        limit: 1
      }, this);
    } else {
      if (!queryObj) {
        queryObj = _getDefaultQuery();
      }

      // cannot have limit on findOne queries because it will be overwritte
      if (queryObj.limit) {
        throw newRxError('QU6');
      }
      queryObj.limit = 1;
      query = createRxQuery('findOne', queryObj, this.asRxCollection);
    }
    if (typeof queryObj === 'number' || Array.isArray(queryObj)) {
      throw newRxTypeError('COL6', {
        queryObj: queryObj
      });
    }
    return query;
  };
  _proto.count = function count(queryObj) {
    if (!queryObj) {
      queryObj = _getDefaultQuery();
    }
    var query = createRxQuery('count', queryObj, this.asRxCollection);
    return query;
  }

  /**
   * find a list documents by their primary key
   * has way better performance then running multiple findOne() or a find() with a complex $or-selected
   */;
  _proto.findByIds = function findByIds(ids) {
    try {
      var _this13 = this;
      var ret = new Map();
      var mustBeQueried = [];

      // first try to fill from docCache
      ids.forEach(function (id) {
        var doc = _this13._docCache.get(id);
        if (doc) {
          ret.set(id, doc);
        } else {
          mustBeQueried.push(id);
        }
      });

      // find everything which was not in docCache
      var _temp6 = function () {
        if (mustBeQueried.length > 0) {
          return Promise.resolve(_this13.storageInstance.findDocumentsById(mustBeQueried, false)).then(function (docs) {
            Object.values(docs).forEach(function (docData) {
              var doc = createRxDocument(_this13, docData);
              ret.set(doc.primary, doc);
            });
          });
        }
      }();
      return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(function () {
        return ret;
      }) : ret);
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * like this.findByIds but returns an observable
   * that always emits the current state
   */
  ;
  _proto.findByIds$ = function findByIds$(ids) {
    var _this14 = this;
    var currentValue = null;
    var lastChangeEvent = -1;

    /**
     * Ensure we do not process events in parallel
     */
    var queue = PROMISE_RESOLVE_VOID;
    var initialPromise = this.findByIds(ids).then(function (docsMap) {
      lastChangeEvent = _this14._changeEventBuffer.counter;
      currentValue = docsMap;
    });
    var firstEmitDone = false;
    return this.$.pipe(startWith(null),
    /**
     * Optimization shortcut.
     * Do not proceed if the emitted RxChangeEvent
     * is not relevant for the query.
     */
    filter(function (changeEvent) {
      if (
      // first emit has no event
      changeEvent && (
      // local documents are not relevant for the query
      changeEvent.isLocal ||
      // document of the change is not in the ids list.
      !ids.includes(changeEvent.documentId))) {
        return false;
      } else {
        return true;
      }
    }), mergeMap(function () {
      return initialPromise;
    }),
    /**
     * Because shareReplay with refCount: true
     * will often subscribe/unsusbscribe
     * we always ensure that we handled all missed events
     * since the last subscription.
     */
    mergeMap(function () {
      queue = queue.then(function () {
        try {
          var _temp10 = function _temp10(_result) {
            if (_exit2) return _result;
            firstEmitDone = true;
            return currentValue;
          };
          var _exit2 = false;
          /**
           * We first have to clone the Map
           * to ensure we do not create side effects by mutating
           * a Map that has already been returned before.
           */
          currentValue = new Map(ensureNotFalsy(currentValue));
          var missedChangeEvents = _this14._changeEventBuffer.getFrom(lastChangeEvent + 1);
          lastChangeEvent = _this14._changeEventBuffer.counter;
          var _temp11 = function () {
            if (missedChangeEvents === null) {
              /**
               * changeEventBuffer is of bounds -> we must re-execute over the database
               * because we cannot calculate the new results just from the events.
               */
              return Promise.resolve(_this14.findByIds(ids)).then(function (newResult) {
                lastChangeEvent = _this14._changeEventBuffer.counter;
                _exit2 = true;
                return newResult;
              });
            } else {
              var resultHasChanged = false;
              missedChangeEvents.forEach(function (rxChangeEvent) {
                var docId = rxChangeEvent.documentId;
                if (!ids.includes(docId)) {
                  // document is not relevant for the result set
                  return;
                }
                var op = rxChangeEvent.operation;
                if (op === 'INSERT' || op === 'UPDATE') {
                  resultHasChanged = true;
                  var rxDocument = createRxDocument(_this14.asRxCollection, rxChangeEvent.documentData);
                  ensureNotFalsy(currentValue).set(docId, rxDocument);
                } else {
                  if (ensureNotFalsy(currentValue).has(docId)) {
                    resultHasChanged = true;
                    ensureNotFalsy(currentValue)["delete"](docId);
                  }
                }
              });

              // nothing happened that affects the result -> do not emit
              if (!resultHasChanged && firstEmitDone) {
                var _temp12 = false;
                _exit2 = true;
                return _temp12;
              }
            }
          }();
          return Promise.resolve(_temp11 && _temp11.then ? _temp11.then(_temp10) : _temp10(_temp11));
        } catch (e) {
          return Promise.reject(e);
        }
      });
      return queue;
    }), filter(function (x) {
      return !!x;
    }), shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
  }

  /**
   * Export collection to a JSON friendly format.
   */;
  _proto.exportJSON = function exportJSON() {
    throw pluginMissing('json-dump');
  }

  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
   */;
  _proto.importJSON = function importJSON(_exportedJSON) {
    throw pluginMissing('json-dump');
  };
  _proto.insertCRDT = function insertCRDT(_updateObj) {
    throw pluginMissing('crdt');
  }

  /**
   * sync with a CouchDB endpoint
   */;
  _proto.syncCouchDB = function syncCouchDB(_syncOptions) {
    throw pluginMissing('replication');
  }

  /**
   * sync with a GraphQL endpoint
   */;
  _proto.syncGraphQL = function syncGraphQL(_options) {
    throw pluginMissing('replication-graphql');
  };
  _proto.syncCouchDBNew = function syncCouchDBNew(_syncOptions) {
    throw pluginMissing('replication-couchdb-new');
  };
  _proto.syncP2P = function syncP2P(_syncOptions) {
    throw pluginMissing('replication-p2p');
  };
  _proto.syncFirestore = function syncFirestore(_syncOptions) {
    throw pluginMissing('replication-firestore');
  }

  /**
   * HOOKS
   */;
  _proto.addHook = function addHook(when, key, fun) {
    var parallel = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    if (typeof fun !== 'function') {
      throw newRxTypeError('COL7', {
        key: key,
        when: when
      });
    }
    if (!HOOKS_WHEN.includes(when)) {
      throw newRxTypeError('COL8', {
        key: key,
        when: when
      });
    }
    if (!HOOKS_KEYS.includes(key)) {
      throw newRxError('COL9', {
        key: key
      });
    }
    if (when === 'post' && key === 'create' && parallel === true) {
      throw newRxError('COL10', {
        when: when,
        key: key,
        parallel: parallel
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
      return PROMISE_RESOLVE_VOID;
    }

    // run parallel: false
    var tasks = hooks.series.map(function (hook) {
      return function () {
        return hook(data, instance);
      };
    });
    return promiseSeries(tasks)
    // run parallel: true
    .then(function () {
      return Promise.all(hooks.parallel.map(function (hook) {
        return hook(data, instance);
      }));
    });
  }

  /**
   * does the same as ._runHooks() but with non-async-functions
   */;
  _proto._runHooksSync = function _runHooksSync(when, key, data, instance) {
    var hooks = this.getHooks(when, key);
    if (!hooks) return;
    hooks.series.forEach(function (hook) {
      return hook(data, instance);
    });
  }

  /**
   * Returns a promise that resolves after the given time.
   * Ensures that is properly cleans up when the collection is destroyed
   * so that no running timeouts prevent the exit of the JavaScript process.
   */;
  _proto.promiseWait = function promiseWait(time) {
    var _this15 = this;
    var ret = new Promise(function (res) {
      var timeout = setTimeout(function () {
        _this15.timeouts["delete"](timeout);
        res();
      }, time);
      _this15.timeouts.add(timeout);
    });
    return ret;
  };
  _proto.destroy = function destroy() {
    var _this16 = this;
    if (this.destroyed) {
      return PROMISE_RESOLVE_FALSE;
    }

    /**
     * Settings destroyed = true
     * must be the first thing to do,
     * so for example the replication can directly stop
     * instead of sending requests to a closed storage.
     */
    this.destroyed = true;
    Array.from(this.timeouts).forEach(function (timeout) {
      return clearTimeout(timeout);
    });
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
    return this.database.requestIdlePromise().then(function () {
      return Promise.all(_this16.onDestroy.map(function (fn) {
        return fn();
      }));
    }).then(function () {
      return _this16.storageInstance.close();
    }).then(function () {
      /**
       * Unsubscribing must be done AFTER the storageInstance.close()
       * Because the conflict handling is part of the subscriptions and
       * otherwise there might be open conflicts to be resolved which
       * will then stuck and never resolve.
       */
      _this16._subs.forEach(function (sub) {
        return sub.unsubscribe();
      });
      delete _this16.database.collections[_this16.name];
      return runAsyncPluginHooks('postDestroyRxCollection', _this16).then(function () {
        return true;
      });
    });
  }

  /**
   * remove all data of the collection
   */;
  _proto.remove = function remove() {
    try {
      var _this18 = this;
      return Promise.resolve(_this18.destroy()).then(function () {
        return Promise.resolve(removeCollectionStorages(_this18.database.storage, _this18.database.internalStore, _this18.database.token, _this18.database.name, _this18.name, _this18.database.hashFunction)).then(function () {});
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _createClass(RxCollectionBase, [{
    key: "insert$",
    get: function get() {
      return this.$.pipe(filter(function (cE) {
        return cE.operation === 'INSERT';
      }));
    }
  }, {
    key: "update$",
    get: function get() {
      return this.$.pipe(filter(function (cE) {
        return cE.operation === 'UPDATE';
      }));
    }
  }, {
    key: "remove$",
    get: function get() {
      return this.$.pipe(filter(function (cE) {
        return cE.operation === 'DELETE';
      }));
    }
  }, {
    key: "asRxCollection",
    get: function get() {
      return this;
    }
  }]);
  return RxCollectionBase;
}();

/**
 * adds the hook-functions to the collections prototype
 * this runs only once
 */
function _applyHookFunctions(collection) {
  if (hooksApplied) return; // already run
  hooksApplied = true;
  var colProto = Object.getPrototypeOf(collection);
  HOOKS_KEYS.forEach(function (key) {
    HOOKS_WHEN.map(function (when) {
      var fnName = when + ucfirst(key);
      colProto[fnName] = function (fun, parallel) {
        return this.addHook(when, key, fun, parallel);
      };
    });
  });
}
function _atomicUpsertUpdate(doc, json) {
  return doc.atomicUpdate(function (_innerDoc) {
    return json;
  }).then(function () {
    return nextTick();
  }).then(function () {
    return doc;
  });
}

/**
 * ensures that the given document exists
 * @return promise that resolves with new doc and flag if inserted
 */
function _atomicUpsertEnsureRxDocumentExists(rxCollection, primary, json) {
  /**
   * Optimisation shortcut,
   * first try to find the document in the doc-cache
   */
  var docFromCache = rxCollection._docCache.get(primary);
  if (docFromCache) {
    return Promise.resolve({
      doc: docFromCache,
      inserted: false
    });
  }
  return rxCollection.findOne(primary).exec().then(function (doc) {
    if (!doc) {
      return rxCollection.insert(json).then(function (newDoc) {
        return {
          doc: newDoc,
          inserted: true
        };
      });
    } else {
      return {
        doc: doc,
        inserted: false
      };
    }
  });
}

/**
 * creates and prepares a new collection
 */
export function createRxCollection(_ref) {
  var database = _ref.database,
    name = _ref.name,
    schema = _ref.schema,
    _ref$instanceCreation = _ref.instanceCreationOptions,
    instanceCreationOptions = _ref$instanceCreation === void 0 ? {} : _ref$instanceCreation,
    _ref$migrationStrateg = _ref.migrationStrategies,
    migrationStrategies = _ref$migrationStrateg === void 0 ? {} : _ref$migrationStrateg,
    _ref$autoMigrate = _ref.autoMigrate,
    autoMigrate = _ref$autoMigrate === void 0 ? true : _ref$autoMigrate,
    _ref$statics = _ref.statics,
    statics = _ref$statics === void 0 ? {} : _ref$statics,
    _ref$methods = _ref.methods,
    methods = _ref$methods === void 0 ? {} : _ref$methods,
    _ref$attachments = _ref.attachments,
    attachments = _ref$attachments === void 0 ? {} : _ref$attachments,
    _ref$options = _ref.options,
    options = _ref$options === void 0 ? {} : _ref$options,
    _ref$localDocuments = _ref.localDocuments,
    localDocuments = _ref$localDocuments === void 0 ? false : _ref$localDocuments,
    _ref$cacheReplacement = _ref.cacheReplacementPolicy,
    cacheReplacementPolicy = _ref$cacheReplacement === void 0 ? defaultCacheReplacementPolicy : _ref$cacheReplacement,
    _ref$conflictHandler = _ref.conflictHandler,
    conflictHandler = _ref$conflictHandler === void 0 ? defaultConflictHandler : _ref$conflictHandler;
  var storageInstanceCreationParams = {
    databaseInstanceToken: database.token,
    databaseName: database.name,
    collectionName: name,
    schema: schema.jsonSchema,
    options: instanceCreationOptions,
    multiInstance: database.multiInstance,
    password: database.password
  };
  runPluginHooks('preCreateRxStorageInstance', storageInstanceCreationParams);
  return createRxCollectionStorageInstance(database, storageInstanceCreationParams).then(function (storageInstance) {
    var collection = new RxCollectionBase(database, name, schema, storageInstance, instanceCreationOptions, migrationStrategies, methods, attachments, options, cacheReplacementPolicy, statics, conflictHandler);
    return collection.prepare().then(function () {
      // ORM add statics
      Object.entries(statics).forEach(function (_ref2) {
        var funName = _ref2[0],
          fun = _ref2[1];
        Object.defineProperty(collection, funName, {
          get: function get() {
            return fun.bind(collection);
          }
        });
      });
      var ret = PROMISE_RESOLVE_VOID;
      if (autoMigrate && collection.schema.version !== 0) {
        ret = collection.migratePromise();
      }
      return ret;
    }).then(function () {
      runPluginHooks('createRxCollection', {
        collection: collection,
        creator: {
          name: name,
          schema: schema,
          storageInstance: storageInstance,
          instanceCreationOptions: instanceCreationOptions,
          migrationStrategies: migrationStrategies,
          methods: methods,
          attachments: attachments,
          options: options,
          cacheReplacementPolicy: cacheReplacementPolicy,
          localDocuments: localDocuments,
          statics: statics
        }
      });
      return collection;
    })
    /**
     * If the collection creation fails,
     * we yet have to close the storage instances.
     */["catch"](function (err) {
      return storageInstance.close().then(function () {
        return Promise.reject(err);
      });
    });
  });
}
export function isRxCollection(obj) {
  return obj instanceof RxCollectionBase;
}
//# sourceMappingURL=rx-collection.js.map