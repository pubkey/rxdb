import _createClass from "@babel/runtime/helpers/createClass";
import { filter, startWith, mergeMap, shareReplay } from 'rxjs/operators';
import { ucfirst, flatClone, promiseSeries, pluginMissing, ensureNotFalsy, getFromMapOrThrow, clone, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_VOID, RXJS_SHARE_REPLAY_DEFAULTS, getDefaultRxDocumentMeta, getDefaultRevision, nextTick, createRevision } from './util';
import { fillObjectDataBeforeInsert, createRxCollectionStorageInstance } from './rx-collection-helper';
import { createRxQuery, _getDefaultQuery } from './rx-query';
import { newRxError, newRxTypeError } from './rx-error';
import { DocCache } from './doc-cache';
import { createQueryCache, defaultCacheReplacementPolicy } from './query-cache';
import { createChangeEventBuffer } from './change-event-buffer';
import { runAsyncPluginHooks, runPluginHooks } from './hooks';
import { createWithConstructor as createRxDocumentWithConstructor, isRxDocument } from './rx-document';
import { createRxDocument, getRxDocumentConstructor } from './rx-document-prototype-merge';
import { getWrappedStorageInstance, storageChangeEventToRxChangeEvent, throwIfIsStorageWriteError } from './rx-storage-helper';
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
    this.storageInstance = {};
    this.timeouts = new Set();
    this.destroyed = false;
    this._atomicUpsertQueues = new Map();
    this.synced = false;
    this.hooks = {};
    this._subs = [];
    this._docCache = new DocCache();
    this._queryCache = createQueryCache();
    this.$ = {};
    this._changeEventBuffer = {};
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
            databaseToken: _this2.database.token
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

      // inserting a temporary-document
      var tempDoc = null;

      if (isRxDocument(json)) {
        tempDoc = json;

        if (!tempDoc._isTemporary) {
          throw newRxError('COL1', {
            data: json
          });
        }

        json = tempDoc.toJSON();
      }

      var useJson = fillObjectDataBeforeInsert(_this4.schema, json);
      return Promise.resolve(_this4.bulkInsert([useJson])).then(function (writeResult) {
        var isError = writeResult.error[0];
        throwIfIsStorageWriteError(_this4, useJson[_this4.schema.primaryPath], json, isError);
        var insertResult = ensureNotFalsy(writeResult.success[0]);

        if (tempDoc) {
          tempDoc._dataSync$.next(insertResult._data);

          return tempDoc;
        } else {
          return insertResult;
        }
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.bulkInsert = function bulkInsert(docsData) {
    try {
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
      return Promise.resolve(Promise.all(useDocs.map(function (doc) {
        return _this6._runHooks('pre', 'insert', doc).then(function () {
          _this6.schema.validate(doc);

          return doc;
        });
      }))).then(function (docs) {
        var docsMap = new Map();
        var insertRows = docs.map(function (doc) {
          docsMap.set(doc[_this6.schema.primaryPath], doc);
          var docData = Object.assign(doc, {
            _attachments: {},
            _meta: getDefaultRxDocumentMeta(),
            _rev: getDefaultRevision(),
            _deleted: false
          });
          docData._rev = createRevision(docData);
          var row = {
            document: docData
          };
          return row;
        });
        return Promise.resolve(_this6.storageInstance.bulkWrite(insertRows)).then(function (results) {
          // create documents
          var successEntries = Object.entries(results.success);
          var rxDocuments = successEntries.map(function (_ref) {
            var key = _ref[0],
                writtenDocData = _ref[1];
            var docData = getFromMapOrThrow(docsMap, key);
            docData._rev = writtenDocData._rev;
            var doc = createRxDocument(_this6, docData);
            return doc;
          });
          return Promise.resolve(Promise.all(rxDocuments.map(function (doc) {
            return _this6._runHooks('post', 'insert', docsMap.get(doc.primary), doc);
          }))).then(function () {
            return {
              success: rxDocuments,
              error: Object.values(results.error)
            };
          });
        });
      });
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
            writeDoc._rev = createRevision(writeDoc, doc);
            return {
              previous: doc,
              document: writeDoc
            };
          });
          return Promise.resolve(_this8.storageInstance.bulkWrite(removeDocs)).then(function (results) {
            var successIds = Object.keys(results.success); // run hooks

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
   */
  ;

  _proto.atomicUpsert = function atomicUpsert(json) {
    var _this11 = this;

    var useJson = fillObjectDataBeforeInsert(this.schema, json);
    var primary = useJson[this.schema.primaryPath];

    if (!primary) {
      throw newRxError('COL4', {
        data: json
      });
    } // ensure that it wont try 2 parallel runs


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

    var query = createRxQuery('find', queryObj, this);
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
      } // cannot have limit on findOne queries because it will be overwritte


      if (queryObj.limit) {
        throw newRxError('QU6');
      }

      queryObj.limit = 1;
      query = createRxQuery('findOne', queryObj, this);
    }

    if (typeof queryObj === 'number' || Array.isArray(queryObj)) {
      throw newRxTypeError('COL6', {
        queryObj: queryObj
      });
    }

    return query;
  }
  /**
   * find a list documents by their primary key
   * has way better performance then running multiple findOne() or a find() with a complex $or-selected
   */
  ;

  _proto.findByIds = function findByIds(ids) {
    try {
      var _this13 = this;

      var ret = new Map();
      var mustBeQueried = []; // first try to fill from docCache

      ids.forEach(function (id) {
        var doc = _this13._docCache.get(id);

        if (doc) {
          ret.set(id, doc);
        } else {
          mustBeQueried.push(id);
        }
      }); // find everything which was not in docCache

      var _temp2 = function () {
        if (mustBeQueried.length > 0) {
          return Promise.resolve(_this13.storageInstance.findDocumentsById(mustBeQueried, false)).then(function (docs) {
            Object.values(docs).forEach(function (docData) {
              var doc = createRxDocument(_this13, docData);
              ret.set(doc.primary, doc);
            });
          });
        }
      }();

      return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {
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
     * Do not proceed if the emited RxChangeEvent
     * is not relevant for the query.
     */
    filter(function (changeEvent) {
      if ( // first emit has no event
      changeEvent && ( // local documents are not relevant for the query
      changeEvent.isLocal || // document of the change is not in the ids list.
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
          var _temp6 = function _temp6(_result) {
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

          var _temp7 = function () {
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
              }); // nothing happened that affects the result -> do not emit

              if (!resultHasChanged && firstEmitDone) {
                var _temp8 = false;
                _exit2 = true;
                return _temp8;
              }
            }
          }();

          return Promise.resolve(_temp7 && _temp7.then ? _temp7.then(_temp6) : _temp6(_temp7));
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
   * @param _decrypted
   * When true, all encrypted values will be decrypted.
   * When false or omitted and an interface or type is loaded in this collection,
   * all base properties of the type are typed as `any` since data could be encrypted.
   */
  ;

  _proto.exportJSON = function exportJSON() {
    throw pluginMissing('json-dump');
  }
  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
   */
  ;

  _proto.importJSON = function importJSON(_exportedJSON) {
    throw pluginMissing('json-dump');
  }
  /**
   * sync with a CouchDB endpoint
   */
  ;

  _proto.syncCouchDB = function syncCouchDB(_syncOptions) {
    throw pluginMissing('replication');
  }
  /**
   * sync with a GraphQL endpoint
   */
  ;

  _proto.syncGraphQL = function syncGraphQL(_options) {
    throw pluginMissing('replication-graphql');
  }
  /**
   * HOOKS
   */
  ;

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
    } // bind this-scope to hook-function


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
    try {
      return this.hooks[key][when];
    } catch (e) {
      return {
        series: [],
        parallel: []
      };
    }
  };

  _proto._runHooks = function _runHooks(when, key, data, instance) {
    var hooks = this.getHooks(when, key);

    if (!hooks) {
      return PROMISE_RESOLVE_VOID;
    } // run parallel: false


    var tasks = hooks.series.map(function (hook) {
      return function () {
        return hook(data, instance);
      };
    });
    return promiseSeries(tasks) // run parallel: true
    .then(function () {
      return Promise.all(hooks.parallel.map(function (hook) {
        return hook(data, instance);
      }));
    });
  }
  /**
   * does the same as ._runHooks() but with non-async-functions
   */
  ;

  _proto._runHooksSync = function _runHooksSync(when, key, data, instance) {
    var hooks = this.getHooks(when, key);
    if (!hooks) return;
    hooks.series.forEach(function (hook) {
      return hook(data, instance);
    });
  }
  /**
   * creates a temporaryDocument which can be saved later
   */
  ;

  _proto.newDocument = function newDocument() {
    var docData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var filledDocData = this.schema.fillObjectWithDefaults(docData);
    var doc = createRxDocumentWithConstructor(getRxDocumentConstructor(this), this, filledDocData);
    doc._isTemporary = true;

    this._runHooksSync('post', 'create', docData, doc);

    return doc;
  }
  /**
   * Returns a promise that resolves after the given time.
   * Ensures that is properly cleans up when the collection is destroyed
   * so that no running timeouts prevent the exit of the JavaScript process.
   */
  ;

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
    try {
      var _this17 = this;

      if (_this17.destroyed) {
        return Promise.resolve(PROMISE_RESOLVE_FALSE);
      }
      /**
       * Settings destroyed = true
       * must be the first thing to do,
       * so for example the replication can directly stop
       * instead of sending requests to a closed storage.
       */


      _this17.destroyed = true;

      if (_this17._onDestroyCall) {
        _this17._onDestroyCall();
      }

      Array.from(_this17.timeouts).forEach(function (timeout) {
        return clearTimeout(timeout);
      });

      _this17._subs.forEach(function (sub) {
        return sub.unsubscribe();
      });

      if (_this17._changeEventBuffer) {
        _this17._changeEventBuffer.destroy();
      }
      /**
       * First wait until the whole database is idle.
       * This ensures that the storage does not get closed
       * while some operation is running.
       * It is important that we do not intercept a running call
       * because it might lead to undefined behavior like when a doc is written
       * but the change is not added to the changes collection.
       */


      return Promise.resolve(_this17.database.requestIdlePromise().then(function () {
        return _this17.storageInstance.close();
      }).then(function () {
        delete _this17.database.collections[_this17.name];
        return runAsyncPluginHooks('postDestroyRxCollection', _this17).then(function () {
          return true;
        });
      }));
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * remove all data of the collection
   */
  ;

  _proto.remove = function remove() {
    return this.database.removeCollection(this.name);
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
    key: "onDestroy",
    get: function get() {
      var _this18 = this;

      if (!this._onDestroy) {
        this._onDestroy = new Promise(function (res) {
          return _this18._onDestroyCall = res;
        });
      }

      return this._onDestroy;
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


export function createRxCollection(_ref2) {
  var database = _ref2.database,
      name = _ref2.name,
      schema = _ref2.schema,
      _ref2$instanceCreatio = _ref2.instanceCreationOptions,
      instanceCreationOptions = _ref2$instanceCreatio === void 0 ? {} : _ref2$instanceCreatio,
      _ref2$migrationStrate = _ref2.migrationStrategies,
      migrationStrategies = _ref2$migrationStrate === void 0 ? {} : _ref2$migrationStrate,
      _ref2$autoMigrate = _ref2.autoMigrate,
      autoMigrate = _ref2$autoMigrate === void 0 ? true : _ref2$autoMigrate,
      _ref2$statics = _ref2.statics,
      statics = _ref2$statics === void 0 ? {} : _ref2$statics,
      _ref2$methods = _ref2.methods,
      methods = _ref2$methods === void 0 ? {} : _ref2$methods,
      _ref2$attachments = _ref2.attachments,
      attachments = _ref2$attachments === void 0 ? {} : _ref2$attachments,
      _ref2$options = _ref2.options,
      options = _ref2$options === void 0 ? {} : _ref2$options,
      _ref2$localDocuments = _ref2.localDocuments,
      localDocuments = _ref2$localDocuments === void 0 ? false : _ref2$localDocuments,
      _ref2$cacheReplacemen = _ref2.cacheReplacementPolicy,
      cacheReplacementPolicy = _ref2$cacheReplacemen === void 0 ? defaultCacheReplacementPolicy : _ref2$cacheReplacemen;
  var storageInstanceCreationParams = {
    databaseInstanceToken: database.token,
    databaseName: database.name,
    collectionName: name,
    schema: schema.jsonSchema,
    options: instanceCreationOptions,
    multiInstance: database.multiInstance
  };
  runPluginHooks('preCreateRxStorageInstance', storageInstanceCreationParams);
  return createRxCollectionStorageInstance(database, storageInstanceCreationParams).then(function (storageInstance) {
    var collection = new RxCollectionBase(database, name, schema, storageInstance, instanceCreationOptions, migrationStrategies, methods, attachments, options, cacheReplacementPolicy, statics);
    return collection.prepare().then(function () {
      // ORM add statics
      Object.entries(statics).forEach(function (_ref3) {
        var funName = _ref3[0],
            fun = _ref3[1];
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
     */
    ["catch"](function (err) {
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