import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _createClass from "@babel/runtime/helpers/createClass";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { filter, mergeMap } from 'rxjs/operators';
import { ucfirst, flatClone, promiseSeries, pluginMissing, ensureNotFalsy, getFromMapOrThrow, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_VOID, getDefaultRxDocumentMeta, getDefaultRevision } from './plugins/utils';
import { fillObjectDataBeforeInsert, createRxCollectionStorageInstance, removeCollectionStorages } from './rx-collection-helper';
import { createRxQuery, _getDefaultQuery } from './rx-query';
import { newRxError, newRxTypeError } from './rx-error';
import { DocumentCache } from './doc-cache';
import { createQueryCache, defaultCacheReplacementPolicy } from './query-cache';
import { createChangeEventBuffer } from './change-event-buffer';
import { runAsyncPluginHooks, runPluginHooks } from './hooks';
import { createNewRxDocument } from './rx-document-prototype-merge';
import { getWrappedStorageInstance, storageChangeEventToRxChangeEvent, throwIfIsStorageWriteError } from './rx-storage-helper';
import { defaultConflictHandler } from './replication-protocol';
import { IncrementalWriteQueue } from './incremental-write';
import { beforeDocumentUpdateWrite } from './rx-document';
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
    this.incrementalWriteQueue = {};
    this._incrementalUpsertQueues = new Map();
    this.synced = false;
    this.hooks = {};
    this._subs = [];
    this._docCache = {};
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
  _proto.prepare = /*#__PURE__*/function () {
    var _prepare = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
      var _this = this;
      var databaseStorageToken, subDocs;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            this.storageInstance = getWrappedStorageInstance(this.database, this.internalStorageInstance, this.schema.jsonSchema);
            this.incrementalWriteQueue = new IncrementalWriteQueue(this.storageInstance, this.schema.primaryPath, function (newData, oldData) {
              return beforeDocumentUpdateWrite(_this, newData, oldData);
            }, function (result) {
              return _this._runHooks('post', 'save', result);
            });
            this.$ = this.database.eventBulks$.pipe(filter(function (changeEventBulk) {
              return changeEventBulk.collectionName === _this.name;
            }), mergeMap(function (changeEventBulk) {
              return changeEventBulk.events;
            }));
            this._changeEventBuffer = createChangeEventBuffer(this.asRxCollection);
            this._docCache = new DocumentCache(this.schema.primaryPath, this.$.pipe(filter(function (cE) {
              return !cE.isLocal;
            })), function (docData) {
              return createNewRxDocument(_this.asRxCollection, docData);
            });

            /**
             * Instead of resolving the EventBulk array here and spit it into
             * single events, we should fully work with event bulks internally
             * to save performance.
             */
            _context.next = 7;
            return this.database.storageToken;
          case 7:
            databaseStorageToken = _context.sent;
            subDocs = this.storageInstance.changeStream().subscribe(function (eventBulk) {
              var changeEventBulk = {
                id: eventBulk.id,
                internal: false,
                collectionName: _this.name,
                storageToken: databaseStorageToken,
                events: eventBulk.events.map(function (ev) {
                  return storageChangeEventToRxChangeEvent(false, ev, _this);
                }),
                databaseToken: _this.database.token,
                checkpoint: eventBulk.checkpoint,
                context: eventBulk.context
              };
              _this.database.$emit(changeEventBulk);
            });
            this._subs.push(subDocs);

            /**
             * Resolve the conflict tasks
             * of the RxStorageInstance
             */
            this._subs.push(this.storageInstance.conflictResultionTasks().subscribe(function (task) {
              _this.conflictHandler(task.input, task.context).then(function (output) {
                _this.storageInstance.resolveConflictResultionTask({
                  id: task.id,
                  output: output
                });
              });
            }));
            return _context.abrupt("return", PROMISE_RESOLVE_VOID);
          case 12:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function prepare() {
      return _prepare.apply(this, arguments);
    }
    return prepare;
  }() // overwritte by migration-plugin
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
  _proto.insert = /*#__PURE__*/function () {
    var _insert = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(json) {
      var useJson, writeResult, isError, insertResult;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            // TODO do we need fillObjectDataBeforeInsert() here because it is also run at bulkInsert() later
            useJson = fillObjectDataBeforeInsert(this.schema, json);
            _context2.next = 3;
            return this.bulkInsert([useJson]);
          case 3:
            writeResult = _context2.sent;
            isError = writeResult.error[0];
            throwIfIsStorageWriteError(this, useJson[this.schema.primaryPath], json, isError);
            insertResult = ensureNotFalsy(writeResult.success[0]);
            return _context2.abrupt("return", insertResult);
          case 8:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function insert(_x) {
      return _insert.apply(this, arguments);
    }
    return insert;
  }();
  _proto.bulkInsert = /*#__PURE__*/function () {
    var _bulkInsert = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(docsData) {
      var _this2 = this;
      var useDocs, docs, docsMap, insertRows, results, successDocData, rxDocuments;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            if (!(docsData.length === 0)) {
              _context3.next = 2;
              break;
            }
            return _context3.abrupt("return", {
              success: [],
              error: []
            });
          case 2:
            useDocs = docsData.map(function (docData) {
              var useDocData = fillObjectDataBeforeInsert(_this2.schema, docData);
              return useDocData;
            });
            if (!this.hasHooks('pre', 'insert')) {
              _context3.next = 9;
              break;
            }
            _context3.next = 6;
            return Promise.all(useDocs.map(function (doc) {
              return _this2._runHooks('pre', 'insert', doc).then(function () {
                return doc;
              });
            }));
          case 6:
            _context3.t0 = _context3.sent;
            _context3.next = 10;
            break;
          case 9:
            _context3.t0 = useDocs;
          case 10:
            docs = _context3.t0;
            docsMap = new Map();
            insertRows = docs.map(function (doc) {
              docsMap.set(doc[_this2.schema.primaryPath], doc);
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
            _context3.next = 15;
            return this.storageInstance.bulkWrite(insertRows, 'rx-collection-bulk-insert');
          case 15:
            results = _context3.sent;
            // create documents
            successDocData = Object.values(results.success);
            rxDocuments = successDocData.map(function (writtenDocData) {
              return _this2._docCache.getCachedRxDocument(writtenDocData);
            });
            if (!this.hasHooks('post', 'insert')) {
              _context3.next = 21;
              break;
            }
            _context3.next = 21;
            return Promise.all(rxDocuments.map(function (doc) {
              return _this2._runHooks('post', 'insert', docsMap.get(doc.primary), doc);
            }));
          case 21:
            return _context3.abrupt("return", {
              success: rxDocuments,
              error: Object.values(results.error)
            });
          case 22:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function bulkInsert(_x2) {
      return _bulkInsert.apply(this, arguments);
    }
    return bulkInsert;
  }();
  _proto.bulkRemove = /*#__PURE__*/function () {
    var _bulkRemove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(ids) {
      var _this3 = this;
      var rxDocumentMap, docsData, docsMap, removeDocs, results, successIds, rxDocuments;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            if (!(ids.length === 0)) {
              _context4.next = 2;
              break;
            }
            return _context4.abrupt("return", {
              success: [],
              error: []
            });
          case 2:
            _context4.next = 4;
            return this.findByIds(ids).exec();
          case 4:
            rxDocumentMap = _context4.sent;
            docsData = [];
            docsMap = new Map();
            Array.from(rxDocumentMap.values()).forEach(function (rxDocument) {
              var data = rxDocument.toMutableJSON(true);
              docsData.push(data);
              docsMap.set(rxDocument.primary, data);
            });
            _context4.next = 10;
            return Promise.all(docsData.map(function (doc) {
              var primary = doc[_this3.schema.primaryPath];
              return _this3._runHooks('pre', 'remove', doc, rxDocumentMap.get(primary));
            }));
          case 10:
            removeDocs = docsData.map(function (doc) {
              var writeDoc = flatClone(doc);
              writeDoc._deleted = true;
              return {
                previous: doc,
                document: writeDoc
              };
            });
            _context4.next = 13;
            return this.storageInstance.bulkWrite(removeDocs, 'rx-collection-bulk-remove');
          case 13:
            results = _context4.sent;
            successIds = Object.keys(results.success); // run hooks
            _context4.next = 17;
            return Promise.all(successIds.map(function (id) {
              return _this3._runHooks('post', 'remove', docsMap.get(id), rxDocumentMap.get(id));
            }));
          case 17:
            rxDocuments = successIds.map(function (id) {
              return getFromMapOrThrow(rxDocumentMap, id);
            });
            return _context4.abrupt("return", {
              success: rxDocuments,
              error: Object.values(results.error)
            });
          case 19:
          case "end":
            return _context4.stop();
        }
      }, _callee4, this);
    }));
    function bulkRemove(_x3) {
      return _bulkRemove.apply(this, arguments);
    }
    return bulkRemove;
  }()
  /**
   * same as bulkInsert but overwrites existing document with same primary
   */
  ;
  _proto.bulkUpsert =
  /*#__PURE__*/
  function () {
    var _bulkUpsert = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(docsData) {
      var _this4 = this;
      var insertData, useJsonByDocId, insertResult, ret, updatedDocs;
      return _regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) switch (_context6.prev = _context6.next) {
          case 0:
            insertData = [];
            useJsonByDocId = new Map();
            docsData.forEach(function (docData) {
              var useJson = fillObjectDataBeforeInsert(_this4.schema, docData);
              var primary = useJson[_this4.schema.primaryPath];
              if (!primary) {
                throw newRxError('COL3', {
                  primaryPath: _this4.schema.primaryPath,
                  data: useJson,
                  schema: _this4.schema.jsonSchema
                });
              }
              useJsonByDocId.set(primary, useJson);
              insertData.push(useJson);
            });
            _context6.next = 5;
            return this.bulkInsert(insertData);
          case 5:
            insertResult = _context6.sent;
            ret = insertResult.success.slice(0);
            _context6.next = 9;
            return Promise.all(insertResult.error.map( /*#__PURE__*/function () {
              var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(error) {
                var id, writeData, docDataInDb, doc, newDoc;
                return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                  while (1) switch (_context5.prev = _context5.next) {
                    case 0:
                      if (!(error.status !== 409)) {
                        _context5.next = 2;
                        break;
                      }
                      throw newRxError('VD2', {
                        collection: _this4.name,
                        writeError: error
                      });
                    case 2:
                      id = error.documentId;
                      writeData = getFromMapOrThrow(useJsonByDocId, id);
                      docDataInDb = ensureNotFalsy(error.documentInDb);
                      doc = _this4._docCache.getCachedRxDocument(docDataInDb);
                      _context5.next = 8;
                      return doc.incrementalModify(function () {
                        return writeData;
                      });
                    case 8:
                      newDoc = _context5.sent;
                      return _context5.abrupt("return", newDoc);
                    case 10:
                    case "end":
                      return _context5.stop();
                  }
                }, _callee5);
              }));
              return function (_x5) {
                return _ref.apply(this, arguments);
              };
            }()));
          case 9:
            updatedDocs = _context6.sent;
            ret = ret.concat(updatedDocs);
            return _context6.abrupt("return", ret);
          case 12:
          case "end":
            return _context6.stop();
        }
      }, _callee6, this);
    }));
    function bulkUpsert(_x4) {
      return _bulkUpsert.apply(this, arguments);
    }
    return bulkUpsert;
  }()
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
   * upserts to a RxDocument, uses incrementalModify if document already exists
   */;
  _proto.incrementalUpsert = function incrementalUpsert(json) {
    var _this5 = this;
    var useJson = fillObjectDataBeforeInsert(this.schema, json);
    var primary = useJson[this.schema.primaryPath];
    if (!primary) {
      throw newRxError('COL4', {
        data: json
      });
    }

    // ensure that it won't try 2 parallel runs
    var queue = this._incrementalUpsertQueues.get(primary);
    if (!queue) {
      queue = PROMISE_RESOLVE_VOID;
    }
    queue = queue.then(function () {
      return _incrementalUpsertEnsureRxDocumentExists(_this5, primary, useJson);
    }).then(function (wasInserted) {
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
      }

      // cannot have limit on findOne queries because it will be overwritte
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
  };
  _proto.count = function count(queryObj) {
    if (!queryObj) {
      queryObj = _getDefaultQuery();
    }
    var query = createRxQuery('count', queryObj, this);
    return query;
  }

  /**
   * find a list documents by their primary key
   * has way better performance then running multiple findOne() or a find() with a complex $or-selected
   */;
  _proto.findByIds = function findByIds(ids) {
    var _selector2;
    var mangoQuery = {
      selector: (_selector2 = {}, _selector2[this.schema.primaryPath] = {
        $in: ids.slice(0)
      }, _selector2)
    };
    var query = createRxQuery('findByIds', mangoQuery, this);
    return query;
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
   * sync with a GraphQL endpoint
   */;
  _proto.syncGraphQL = function syncGraphQL(_options) {
    throw pluginMissing('replication-graphql');
  };
  _proto.syncCouchDB = function syncCouchDB(_syncOptions) {
    throw pluginMissing('replication-couchdb');
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
    var _this6 = this;
    var ret = new Promise(function (res) {
      var timeout = setTimeout(function () {
        _this6.timeouts["delete"](timeout);
        res();
      }, time);
      _this6.timeouts.add(timeout);
    });
    return ret;
  };
  _proto.destroy = function destroy() {
    var _this7 = this;
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
      return Promise.all(_this7.onDestroy.map(function (fn) {
        return fn();
      }));
    }).then(function () {
      return _this7.storageInstance.close();
    }).then(function () {
      /**
       * Unsubscribing must be done AFTER the storageInstance.close()
       * Because the conflict handling is part of the subscriptions and
       * otherwise there might be open conflicts to be resolved which
       * will then stuck and never resolve.
       */
      _this7._subs.forEach(function (sub) {
        return sub.unsubscribe();
      });
      delete _this7.database.collections[_this7.name];
      return runAsyncPluginHooks('postDestroyRxCollection', _this7).then(function () {
        return true;
      });
    });
  }

  /**
   * remove all data of the collection
   */;
  _proto.remove =
  /*#__PURE__*/
  function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7() {
      return _regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return this.destroy();
          case 2:
            _context7.next = 4;
            return removeCollectionStorages(this.database.storage, this.database.internalStore, this.database.token, this.database.name, this.name, this.database.hashFunction);
          case 4:
          case "end":
            return _context7.stop();
        }
      }, _callee7, this);
    }));
    function remove() {
      return _remove.apply(this, arguments);
    }
    return remove;
  }();
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
function _incrementalUpsertUpdate(doc, json) {
  return doc.incrementalModify(function (_innerDoc) {
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
    cacheReplacementPolicy = _ref2$cacheReplacemen === void 0 ? defaultCacheReplacementPolicy : _ref2$cacheReplacemen,
    _ref2$conflictHandler = _ref2.conflictHandler,
    conflictHandler = _ref2$conflictHandler === void 0 ? defaultConflictHandler : _ref2$conflictHandler;
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