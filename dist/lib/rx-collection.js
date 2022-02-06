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

var _util = require("./util");

var _rxCollectionHelper = require("./rx-collection-helper");

var _rxQuery = require("./rx-query");

var _rxError = require("./rx-error");

var _crypter = require("./crypter");

var _docCache = require("./doc-cache");

var _queryCache = require("./query-cache");

var _changeEventBuffer = require("./change-event-buffer");

var _hooks = require("./hooks");

var _rxDocument = require("./rx-document");

var _rxDocumentPrototypeMerge = require("./rx-document-prototype-merge");

var _rxStorageHelper = require("./rx-storage-helper");

var _overwritable = require("./overwritable");

var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
var hooksApplied = false;

var RxCollectionBase = /*#__PURE__*/function () {
  function RxCollectionBase(database, name, schema,
  /**
   * Stores all 'normal' documents
   */
  storageInstance,
  /**
   * Stores the local documents so that they are not deleted
   * when a migration runs.
   */
  localDocumentsStore) {
    var instanceCreationOptions = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
    var migrationStrategies = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
    var methods = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
    var attachments = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : {};
    var options = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : {};
    var cacheReplacementPolicy = arguments.length > 10 && arguments[10] !== undefined ? arguments[10] : _queryCache.defaultCacheReplacementPolicy;
    var statics = arguments.length > 11 && arguments[11] !== undefined ? arguments[11] : {};
    this._isInMemory = false;
    this.destroyed = false;
    this._atomicUpsertQueues = new Map();
    this.synced = false;
    this.hooks = {};
    this._subs = [];
    this._repStates = new Set();
    this._docCache = (0, _docCache.createDocCache)();
    this._queryCache = (0, _queryCache.createQueryCache)();
    this._crypter = {};
    this._observable$ = {};
    this._changeEventBuffer = {};
    this.database = database;
    this.name = name;
    this.schema = schema;
    this.storageInstance = storageInstance;
    this.localDocumentsStore = localDocumentsStore;
    this.instanceCreationOptions = instanceCreationOptions;
    this.migrationStrategies = migrationStrategies;
    this.methods = methods;
    this.attachments = attachments;
    this.options = options;
    this.cacheReplacementPolicy = cacheReplacementPolicy;
    this.statics = statics;

    _applyHookFunctions(this.asRxCollection);
  }
  /**
   * returns observable
   */


  var _proto = RxCollectionBase.prototype;

  _proto.prepare = function prepare(
  /**
   * TODO is this still needed?
   * set to true if the collection data already exists on this storage adapter
   */
  _wasCreatedBefore) {
    try {
      var _this2 = this;

      // we trigger the non-blocking things first and await them later so we can do stuff in the mean time
      _this2._crypter = (0, _crypter.createCrypter)(_this2.database.password, _this2.schema);
      _this2._observable$ = _this2.database.eventBulks$.pipe((0, _operators.filter)(function (changeEventBulk) {
        return changeEventBulk.collectionName === _this2.name;
      }), (0, _operators.mergeMap)(function (changeEventBulk) {
        return changeEventBulk.events;
      }));
      _this2._changeEventBuffer = (0, _changeEventBuffer.createChangeEventBuffer)(_this2.asRxCollection);
      /**
       * Instead of resolving the EventBulk array here and spit it into
       * single events, we should fully work with event bulks internally
       * to save performance.
       */

      var subDocs = _this2.storageInstance.changeStream().subscribe(function (eventBulk) {
        var changeEventBulk = {
          id: eventBulk.id,
          internal: false,
          collectionName: _this2.name,
          storageToken: (0, _util.ensureNotFalsy)(_this2.database.storageToken),
          events: eventBulk.events.map(function (ev) {
            return (0, _rxStorageHelper.storageChangeEventToRxChangeEvent)(false, ev, _this2);
          }),
          databaseToken: _this2.database.token
        };

        _this2.database.$emit(changeEventBulk);
      });

      _this2._subs.push(subDocs);

      var subLocalDocs = _this2.localDocumentsStore.changeStream().subscribe(function (eventBulk) {
        var changeEventBulk = {
          id: eventBulk.id,
          internal: false,
          collectionName: _this2.name,
          storageToken: (0, _util.ensureNotFalsy)(_this2.database.storageToken),
          events: eventBulk.events.map(function (ev) {
            return (0, _rxStorageHelper.storageChangeEventToRxChangeEvent)(true, ev, _this2);
          }),
          databaseToken: _this2.database.token
        };

        _this2.database.$emit(changeEventBulk);
      });

      _this2._subs.push(subLocalDocs);
      /**
       * When a write happens to the collection
       * we find the changed document in the docCache
       * and tell it that it has to change its data.
       */


      _this2._subs.push(_this2._observable$.pipe((0, _operators.filter)(function (cE) {
        return !cE.isLocal;
      })).subscribe(function (cE) {
        // when data changes, send it to RxDocument in docCache
        var doc = _this2._docCache.get(cE.documentId);

        if (doc) {
          doc._handleChangeEvent(cE);
        }
      }));

      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  } // overwritte by migration-plugin
  ;

  _proto.migrationNeeded = function migrationNeeded() {
    throw (0, _util.pluginMissing)('migration');
  };

  _proto.getDataMigrator = function getDataMigrator() {
    throw (0, _util.pluginMissing)('migration');
  };

  _proto.migrate = function migrate() {
    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    return this.getDataMigrator().migrate(batchSize);
  };

  _proto.migratePromise = function migratePromise() {
    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    return this.getDataMigrator().migratePromise(batchSize);
  }
  /**
   * wrapps the query function of the storage instance.
   */
  ;

  _proto._queryStorageInstance = function _queryStorageInstance(rxQuery, limit) {
    try {
      var _temp3 = function _temp3() {
        docs = docs.map(function (doc) {
          return (0, _rxCollectionHelper._handleFromStorageInstance)(_this4, doc, noDecrypt);
        });
        return docs;
      };

      var _arguments2 = arguments,
          _this4 = this;

      var noDecrypt = _arguments2.length > 2 && _arguments2[2] !== undefined ? _arguments2[2] : false;
      var docs = [];
      /**
       * Optimizations shortcut.
       * If query is find-one-document-by-id,
       * then we do not have to use the slow query() method
       * but instead can use findDocumentsById()
       */

      var _temp4 = function () {
        if (rxQuery.isFindOneByIdQuery) {
          var docId = rxQuery.isFindOneByIdQuery;
          return Promise.resolve(_this4.database.lockedRun(function () {
            return _this4.storageInstance.findDocumentsById([docId], false);
          })).then(function (docsMap) {
            var docData = docsMap[docId];

            if (docData) {
              docs.push(docData);
            }
          });
        } else {
          var preparedQuery = rxQuery.getPreparedQuery();

          if (limit) {
            preparedQuery['limit'] = limit;
          }

          return Promise.resolve(_this4.database.lockedRun(function () {
            return _this4.storageInstance.query(preparedQuery);
          })).then(function (queryResult) {
            docs = queryResult.documents;
          });
        }
      }();

      return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * TODO internally call bulkInsert
   * to not have duplicated code.
   */
  ;

  _proto.insert = function insert(json) {
    try {
      var _this6 = this;

      // inserting a temporary-document
      var tempDoc = null;

      if ((0, _rxDocument.isRxDocument)(json)) {
        tempDoc = json;

        if (!tempDoc._isTemporary) {
          throw (0, _rxError.newRxError)('COL1', {
            data: json
          });
        }

        json = tempDoc.toJSON();
      }

      var useJson = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(_this6, json);
      var newDoc = tempDoc;
      return Promise.resolve(_this6._runHooks('pre', 'insert', useJson)).then(function () {
        _this6.schema.validate(useJson);

        return Promise.resolve((0, _rxCollectionHelper.writeToStorageInstance)(_this6, {
          document: useJson
        })).then(function (insertResult) {
          if (tempDoc) {
            tempDoc._dataSync$.next(insertResult);
          } else {
            newDoc = (0, _rxDocumentPrototypeMerge.createRxDocument)(_this6, insertResult);
          }

          return Promise.resolve(_this6._runHooks('post', 'insert', useJson, newDoc)).then(function () {
            return newDoc;
          });
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.bulkInsert = function bulkInsert(docsData) {
    try {
      var _this8 = this;

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
        var useDocData = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(_this8, docData);
        return useDocData;
      });
      return Promise.resolve(Promise.all(useDocs.map(function (doc) {
        return _this8._runHooks('pre', 'insert', doc).then(function () {
          _this8.schema.validate(doc);

          return doc;
        });
      }))).then(function (docs) {
        var insertDocs = docs.map(function (d) {
          return {
            document: (0, _rxCollectionHelper._handleToStorageInstance)(_this8, d)
          };
        });
        var docsMap = new Map();
        docs.forEach(function (d) {
          docsMap.set(d[_this8.schema.primaryPath], d);
        });
        return Promise.resolve(_this8.database.lockedRun(function () {
          return _this8.storageInstance.bulkWrite(insertDocs);
        })).then(function (results) {
          // create documents
          var successEntries = Object.entries(results.success);
          var rxDocuments = successEntries.map(function (_ref) {
            var key = _ref[0],
                writtenDocData = _ref[1];
            var docData = (0, _util.getFromMapOrThrow)(docsMap, key);
            docData._rev = writtenDocData._rev;
            var doc = (0, _rxDocumentPrototypeMerge.createRxDocument)(_this8, docData);
            return doc;
          });
          return Promise.resolve(Promise.all(rxDocuments.map(function (doc) {
            return _this8._runHooks('post', 'insert', docsMap.get(doc.primary), doc);
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
      var _this10 = this;

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

      return Promise.resolve(_this10.findByIds(ids)).then(function (rxDocumentMap) {
        var docsData = [];
        var docsMap = new Map();
        Array.from(rxDocumentMap.values()).forEach(function (rxDocument) {
          var data = (0, _util.clone)(rxDocument.toJSON(true));
          docsData.push(data);
          docsMap.set(rxDocument.primary, data);
        });
        return Promise.resolve(Promise.all(docsData.map(function (doc) {
          var primary = doc[_this10.schema.primaryPath];
          return _this10._runHooks('pre', 'remove', doc, rxDocumentMap.get(primary));
        }))).then(function () {
          var removeDocs = docsData.map(function (doc) {
            var writeDoc = (0, _util.flatClone)(doc);
            writeDoc._deleted = true;
            return {
              previous: (0, _rxCollectionHelper._handleToStorageInstance)(_this10, doc),
              document: (0, _rxCollectionHelper._handleToStorageInstance)(_this10, writeDoc)
            };
          });
          return Promise.resolve(_this10.database.lockedRun(function () {
            return _this10.storageInstance.bulkWrite(removeDocs);
          })).then(function (results) {
            var successIds = Object.keys(results.success); // run hooks

            return Promise.resolve(Promise.all(successIds.map(function (id) {
              return _this10._runHooks('post', 'remove', docsMap.get(id), rxDocumentMap.get(id));
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
   * same as insert but overwrites existing document with same primary
   */
  ;

  _proto.upsert = function upsert(json) {
    var _this11 = this;

    var useJson = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(this, json);
    var primary = useJson[this.schema.primaryPath];

    if (!primary) {
      throw (0, _rxError.newRxError)('COL3', {
        primaryPath: this.schema.primaryPath,
        data: useJson,
        schema: this.schema.jsonSchema
      });
    }

    return this.findOne(primary).exec().then(function (existing) {
      if (existing && !existing.deleted) {
        useJson._rev = existing['_rev'];
        return existing.atomicUpdate(function () {
          return useJson;
        }).then(function () {
          return existing;
        });
      } else {
        return _this11.insert(json);
      }
    });
  }
  /**
   * upserts to a RxDocument, uses atomicUpdate if document already exists
   */
  ;

  _proto.atomicUpsert = function atomicUpsert(json) {
    var _this12 = this;

    var useJson = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(this, json);
    var primary = useJson[this.schema.primaryPath];

    if (!primary) {
      throw (0, _rxError.newRxError)('COL4', {
        data: json
      });
    } // ensure that it wont try 2 parallel runs


    var queue;

    if (!this._atomicUpsertQueues.has(primary)) {
      queue = _util.PROMISE_RESOLVE_VOID;
    } else {
      queue = this._atomicUpsertQueues.get(primary);
    }

    queue = queue.then(function () {
      return _atomicUpsertEnsureRxDocumentExists(_this12, primary, useJson);
    }).then(function (wasInserted) {
      if (!wasInserted.inserted) {
        return _atomicUpsertUpdate(wasInserted.doc, useJson)
        /**
         * tick here so the event can propagate
         * TODO we should not need that here
         */
        .then(function () {
          return (0, _util.nextTick)();
        }).then(function () {
          return (0, _util.nextTick)();
        }).then(function () {
          return (0, _util.nextTick)();
        }).then(function () {
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
      throw (0, _rxError.newRxError)('COL5', {
        queryObj: queryObj
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
      var _selector;

      query = (0, _rxQuery.createRxQuery)('findOne', {
        selector: (_selector = {}, _selector[this.schema.primaryPath] = queryObj, _selector),
        limit: 1
      }, this);
    } else {
      if (!queryObj) {
        queryObj = (0, _rxQuery._getDefaultQuery)();
      } // cannot have limit on findOne queries because it will be overwritte


      if (queryObj.limit) {
        throw (0, _rxError.newRxError)('QU6');
      }

      queryObj.limit = 1;
      query = (0, _rxQuery.createRxQuery)('findOne', queryObj, this);
    }

    if (typeof queryObj === 'number' || Array.isArray(queryObj)) {
      throw (0, _rxError.newRxTypeError)('COL6', {
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
      var _this14 = this;

      var ret = new Map();
      var mustBeQueried = []; // first try to fill from docCache

      ids.forEach(function (id) {
        var doc = _this14._docCache.get(id);

        if (doc) {
          ret.set(id, doc);
        } else {
          mustBeQueried.push(id);
        }
      }); // find everything which was not in docCache

      var _temp6 = function () {
        if (mustBeQueried.length > 0) {
          return Promise.resolve(_this14.storageInstance.findDocumentsById(mustBeQueried, false)).then(function (docs) {
            Object.values(docs).forEach(function (docData) {
              docData = (0, _rxCollectionHelper._handleFromStorageInstance)(_this14, docData);
              var doc = (0, _rxDocumentPrototypeMerge.createRxDocument)(_this14, docData);
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
    var _this15 = this;

    var currentValue = null;
    var lastChangeEvent = -1;
    /**
     * Ensure we do not process events in parallel
     */

    var queue = _util.PROMISE_RESOLVE_VOID;
    var initialPromise = this.findByIds(ids).then(function (docsMap) {
      lastChangeEvent = _this15._changeEventBuffer.counter;
      currentValue = docsMap;
    });
    var firstEmitDone = false;
    return this.$.pipe((0, _operators.startWith)(null),
    /**
     * Optimization shortcut.
     * Do not proceed if the emited RxChangeEvent
     * is not relevant for the query.
     */
    (0, _operators.filter)(function (changeEvent) {
      if ( // first emit has no event
      changeEvent && ( // local documents are not relevant for the query
      changeEvent.isLocal || // document of the change is not in the ids list.
      !ids.includes(changeEvent.documentId))) {
        return false;
      } else {
        return true;
      }
    }), (0, _operators.mergeMap)(function () {
      return initialPromise;
    }),
    /**
     * Because shareReplay with refCount: true
     * will often subscribe/unsusbscribe
     * we always ensure that we handled all missed events
     * since the last subscription.
     */
    (0, _operators.mergeMap)(function () {
      queue = queue.then(function () {
        try {
          var _temp10 = function _temp10(_result) {
            if (_exit2) return _result;
            firstEmitDone = true;
            return resultMap;
          };

          var _exit2 = false;
          var resultMap = (0, _util.ensureNotFalsy)(currentValue);

          var missedChangeEvents = _this15._changeEventBuffer.getFrom(lastChangeEvent + 1);

          lastChangeEvent = _this15._changeEventBuffer.counter;

          var _temp11 = function () {
            if (missedChangeEvents === null) {
              /**
               * changeEventBuffer is of bounds -> we must re-execute over the database
               * because we cannot calculate the new results just from the events.
               */
              return Promise.resolve(_this15.findByIds(ids)).then(function (newResult) {
                lastChangeEvent = _this15._changeEventBuffer.counter;
                Array.from(newResult.entries()).forEach(function (_ref2) {
                  var k = _ref2[0],
                      v = _ref2[1];
                  return resultMap.set(k, v);
                });
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
                  var rxDocument = (0, _rxDocumentPrototypeMerge.createRxDocument)(_this15.asRxCollection, rxChangeEvent.documentData);
                  resultMap.set(docId, rxDocument);
                } else {
                  if (resultMap.has(docId)) {
                    resultHasChanged = true;
                    resultMap["delete"](docId);
                  }
                }
              }); // nothing happened that affects the result -> do not emit

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
    }), (0, _operators.filter)(function (x) {
      return !!x;
    }), (0, _operators.shareReplay)(_util.RXJS_SHARE_REPLAY_DEFAULTS));
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
    var _decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    throw (0, _util.pluginMissing)('json-dump');
  }
  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
   */
  ;

  _proto.importJSON = function importJSON(_exportedJSON) {
    throw (0, _util.pluginMissing)('json-dump');
  }
  /**
   * sync with a CouchDB endpoint
   */
  ;

  _proto.syncCouchDB = function syncCouchDB(_syncOptions) {
    throw (0, _util.pluginMissing)('replication');
  }
  /**
   * sync with a GraphQL endpoint
   */
  ;

  _proto.syncGraphQL = function syncGraphQL(_options) {
    throw (0, _util.pluginMissing)('replication-graphql');
  }
  /**
   * Create a replicated in-memory-collection
   */
  ;

  _proto.inMemory = function inMemory() {
    throw (0, _util.pluginMissing)('in-memory');
  }
  /**
   * HOOKS
   */
  ;

  _proto.addHook = function addHook(when, key, fun) {
    var parallel = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

    if (typeof fun !== 'function') {
      throw (0, _rxError.newRxTypeError)('COL7', {
        key: key,
        when: when
      });
    }

    if (!HOOKS_WHEN.includes(when)) {
      throw (0, _rxError.newRxTypeError)('COL8', {
        key: key,
        when: when
      });
    }

    if (!HOOKS_KEYS.includes(key)) {
      throw (0, _rxError.newRxError)('COL9', {
        key: key
      });
    }

    if (when === 'post' && key === 'create' && parallel === true) {
      throw (0, _rxError.newRxError)('COL10', {
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
      return _util.PROMISE_RESOLVE_VOID;
    } // run parallel: false


    var tasks = hooks.series.map(function (hook) {
      return function () {
        return hook(data, instance);
      };
    });
    return (0, _util.promiseSeries)(tasks) // run parallel: true
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
    docData = this.schema.fillObjectWithDefaults(docData);
    var doc = (0, _rxDocument.createWithConstructor)((0, _rxDocumentPrototypeMerge.getRxDocumentConstructor)(this), this, docData);
    doc._isTemporary = true;

    this._runHooksSync('post', 'create', docData, doc);

    return doc;
  };

  _proto.destroy = function destroy() {
    var _this16 = this;

    if (this.destroyed) {
      return _util.PROMISE_RESOLVE_FALSE;
    }

    if (this._onDestroyCall) {
      this._onDestroyCall();
    }

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });

    if (this._changeEventBuffer) {
      this._changeEventBuffer.destroy();
    }

    Array.from(this._repStates).forEach(function (replicationState) {
      return replicationState.cancel();
    });
    return Promise.all([this.storageInstance.close(), this.localDocumentsStore.close()]).then(function () {
      delete _this16.database.collections[_this16.name];
      _this16.destroyed = true;
      return (0, _hooks.runAsyncPluginHooks)('postDestroyRxCollection', _this16).then(function () {
        return true;
      });
    });
  }
  /**
   * remove all data of the collection
   */
  ;

  _proto.remove = function remove() {
    return this.database.removeCollection(this.name);
  };

  (0, _createClass2["default"])(RxCollectionBase, [{
    key: "$",
    get: function get() {
      return this._observable$;
    }
  }, {
    key: "insert$",
    get: function get() {
      return this.$.pipe((0, _operators.filter)(function (cE) {
        return cE.operation === 'INSERT';
      }));
    }
  }, {
    key: "update$",
    get: function get() {
      return this.$.pipe((0, _operators.filter)(function (cE) {
        return cE.operation === 'UPDATE';
      }));
    }
  }, {
    key: "remove$",
    get: function get() {
      return this.$.pipe((0, _operators.filter)(function (cE) {
        return cE.operation === 'DELETE';
      }));
    }
  }, {
    key: "onDestroy",
    get: function get() {
      var _this17 = this;

      if (!this._onDestroy) {
        this._onDestroy = new Promise(function (res) {
          return _this17._onDestroyCall = res;
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


exports.RxCollectionBase = RxCollectionBase;

function _applyHookFunctions(collection) {
  if (hooksApplied) return; // already run

  hooksApplied = true;
  var colProto = Object.getPrototypeOf(collection);
  HOOKS_KEYS.forEach(function (key) {
    HOOKS_WHEN.map(function (when) {
      var fnName = when + (0, _util.ucfirst)(key);

      colProto[fnName] = function (fun, parallel) {
        return this.addHook(when, key, fun, parallel);
      };
    });
  });
}

function _atomicUpsertUpdate(doc, json) {
  return doc.atomicUpdate(function (innerDoc) {
    json._rev = innerDoc._rev;
    innerDoc._data = json;
    return innerDoc._data;
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


function createRxCollection(_ref3, wasCreatedBefore) {
  var database = _ref3.database,
      name = _ref3.name,
      schema = _ref3.schema,
      _ref3$instanceCreatio = _ref3.instanceCreationOptions,
      instanceCreationOptions = _ref3$instanceCreatio === void 0 ? {} : _ref3$instanceCreatio,
      _ref3$migrationStrate = _ref3.migrationStrategies,
      migrationStrategies = _ref3$migrationStrate === void 0 ? {} : _ref3$migrationStrate,
      _ref3$autoMigrate = _ref3.autoMigrate,
      autoMigrate = _ref3$autoMigrate === void 0 ? true : _ref3$autoMigrate,
      _ref3$statics = _ref3.statics,
      statics = _ref3$statics === void 0 ? {} : _ref3$statics,
      _ref3$methods = _ref3.methods,
      methods = _ref3$methods === void 0 ? {} : _ref3$methods,
      _ref3$attachments = _ref3.attachments,
      attachments = _ref3$attachments === void 0 ? {} : _ref3$attachments,
      _ref3$options = _ref3.options,
      options = _ref3$options === void 0 ? {} : _ref3$options,
      _ref3$cacheReplacemen = _ref3.cacheReplacementPolicy,
      cacheReplacementPolicy = _ref3$cacheReplacemen === void 0 ? _queryCache.defaultCacheReplacementPolicy : _ref3$cacheReplacemen;

  // TODO move this check to dev-mode plugin
  if (_overwritable.overwritable.isDevMode()) {
    Object.keys(methods).filter(function (funName) {
      return schema.topLevelFields.includes(funName);
    }).forEach(function (funName) {
      throw (0, _rxError.newRxError)('COL18', {
        funName: funName
      });
    });
  }

  var storageInstanceCreationParams = {
    databaseName: database.name,
    collectionName: name,
    schema: schema.jsonSchema,
    options: instanceCreationOptions,
    multiInstance: database.multiInstance
  };
  (0, _hooks.runPluginHooks)('preCreateRxStorageInstance', storageInstanceCreationParams);
  return (0, _rxCollectionHelper.createRxCollectionStorageInstances)(name, database, storageInstanceCreationParams, instanceCreationOptions).then(function (storageInstances) {
    var collection = new RxCollectionBase(database, name, schema, storageInstances.storageInstance, storageInstances.localDocumentsStore, instanceCreationOptions, migrationStrategies, methods, attachments, options, cacheReplacementPolicy, statics);
    return collection.prepare(wasCreatedBefore).then(function () {
      // ORM add statics
      Object.entries(statics).forEach(function (_ref4) {
        var funName = _ref4[0],
            fun = _ref4[1];
        Object.defineProperty(collection, funName, {
          get: function get() {
            return fun.bind(collection);
          }
        });
      });
      var ret = _util.PROMISE_RESOLVE_VOID;

      if (autoMigrate && collection.schema.version !== 0) {
        ret = collection.migratePromise();
      }

      return ret;
    }).then(function () {
      (0, _hooks.runPluginHooks)('createRxCollection', collection);
      return collection;
    })
    /**
     * If the collection creation fails,
     * we yet have to close the storage instances.
     */
    ["catch"](function (err) {
      return Promise.all([storageInstances.storageInstance.close(), storageInstances.localDocumentsStore.close()]).then(function () {
        return Promise.reject(err);
      });
    });
  });
}

function isRxCollection(obj) {
  return obj instanceof RxCollectionBase;
}
//# sourceMappingURL=rx-collection.js.map