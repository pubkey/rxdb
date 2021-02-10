"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.isInstanceOf = isInstanceOf;
exports["default"] = exports.RxCollectionBase = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _operators = require("rxjs/operators");

var _util = require("./util");

var _pouchDb = require("./pouch-db");

var _rxCollectionHelper = require("./rx-collection-helper");

var _rxQuery = require("./rx-query");

var _rxSchema = require("./rx-schema");

var _rxChangeEvent = require("./rx-change-event");

var _rxError = require("./rx-error");

var _crypter = require("./crypter");

var _docCache = require("./doc-cache");

var _queryCache = require("./query-cache");

var _changeEventBuffer = require("./change-event-buffer");

var _overwritable = require("./overwritable");

var _hooks = require("./hooks");

var _rxDocument = require("./rx-document");

var _rxDocumentPrototypeMerge = require("./rx-document-prototype-merge");

var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
var hooksApplied = false;

var RxCollectionBase = /*#__PURE__*/function () {
  function RxCollectionBase(database, name, schema) {
    var pouchSettings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    var migrationStrategies = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    var methods = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
    var attachments = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
    var options = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
    var cacheReplacementPolicy = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : _queryCache.defaultCacheReplacementPolicy;
    var statics = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : {};
    this._isInMemory = false;
    this.destroyed = false;
    this._atomicUpsertQueues = new Map();
    this.synced = false;
    this.hooks = {};
    this._subs = [];
    this._repStates = [];
    this.pouch = {};
    this._docCache = (0, _docCache.createDocCache)();
    this._queryCache = (0, _queryCache.createQueryCache)();
    this._crypter = {};
    this._changeEventBuffer = {};
    this.database = database;
    this.name = name;
    this.schema = schema;
    this.pouchSettings = pouchSettings;
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
   * set to true if the collection data already exists on this storage adapter
   */
  wasCreatedBefore) {
    var _this = this;

    this.pouch = this.database._spawnPouchDB(this.name, this.schema.version, this.pouchSettings);

    if (this.schema.doKeyCompression()) {
      this._keyCompressor = _overwritable.overwritable.createKeyCompressor(this.schema);
    } // we trigger the non-blocking things first and await them later so we can do stuff in the mean time

    /**
     * Sometimes pouchdb emits before the instance is useable.
     * To prevent random errors, we wait until the .info() call resolved
     */


    var spawnedPouchPromise = wasCreatedBefore ? Promise.resolve() : this.pouch.info();
    /**
     * if wasCreatedBefore we can assume that the indexes already exist
     * because changing them anyway requires a schema-version change
     */

    var createIndexesPromise = wasCreatedBefore ? Promise.resolve() : _prepareCreateIndexes(this.asRxCollection, spawnedPouchPromise);
    this._crypter = (0, _crypter.createCrypter)(this.database.password, this.schema);
    this._observable$ = this.database.$.pipe((0, _operators.filter)(function (event) {
      return event.collectionName === _this.name;
    }));
    this._changeEventBuffer = (0, _changeEventBuffer.createChangeEventBuffer)(this.asRxCollection);

    this._subs.push(this._observable$.pipe((0, _operators.filter)(function (cE) {
      return !cE.isLocal;
    })).subscribe(function (cE) {
      // when data changes, send it to RxDocument in docCache
      var doc = _this._docCache.get(cE.documentId);

      if (doc) doc._handleChangeEvent(cE);
    }));

    return Promise.all([spawnedPouchPromise, createIndexesPromise]);
  } // overwritte by migration-plugin
  ;

  _proto.migrationNeeded = function migrationNeeded() {
    if (this.schema.version === 0) {
      return Promise.resolve(false);
    }

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
   * wrappers for Pouch.put/get to handle keycompression etc
   */
  ;

  _proto._handleToPouch = function _handleToPouch(docData) {
    return (0, _rxCollectionHelper._handleToPouch)(this, docData);
  };

  _proto._handleFromPouch = function _handleFromPouch(docData) {
    var noDecrypt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    return (0, _rxCollectionHelper._handleFromPouch)(this, docData, noDecrypt);
  }
  /**
   * every write on the pouchdb
   * is tunneld throught this function
   */
  ;

  _proto._pouchPut = function _pouchPut(obj) {
    var _this2 = this;

    var overwrite = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    obj = this._handleToPouch(obj);
    return this.database.lockedRun(function () {
      return _this2.pouch.put(obj);
    })["catch"](function (err) {
      if (overwrite && err.status === 409) {
        return _this2.database.lockedRun(function () {
          return _this2.pouch.get(obj._id);
        }).then(function (exist) {
          obj._rev = exist._rev;
          return _this2.database.lockedRun(function () {
            return _this2.pouch.put(obj);
          });
        });
      } else if (err.status === 409) {
        throw (0, _rxError.newRxError)('COL19', {
          id: obj._id,
          pouchDbError: err,
          data: obj
        });
      } else throw err;
    });
  }
  /**
   * get document from pouchdb by its _id
   */
  ;

  _proto._pouchGet = function _pouchGet(key) {
    var _this3 = this;

    return this.pouch.get(key).then(function (doc) {
      return _this3._handleFromPouch(doc);
    });
  }
  /**
   * wrapps pouch-find
   */
  ;

  _proto._pouchFind = function _pouchFind(rxQuery, limit) {
    var _this4 = this;

    var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var compressedQueryJSON = rxQuery.keyCompress();

    if (limit) {
      compressedQueryJSON['limit'] = limit;
    }

    return this.database.lockedRun(function () {
      return _this4.pouch.find(compressedQueryJSON);
    }).then(function (docsCompressed) {
      var docs = docsCompressed.docs.map(function (doc) {
        return _this4._handleFromPouch(doc, noDecrypt);
      });
      return docs;
    });
  };

  _proto.$emit = function $emit(changeEvent) {
    return this.database.$emit(changeEvent);
  };

  _proto.insert = function insert(json) {
    var _this5 = this;

    // inserting a temporary-document
    var tempDoc = null;

    if ((0, _rxDocument.isInstanceOf)(json)) {
      tempDoc = json;

      if (!tempDoc._isTemporary) {
        throw (0, _rxError.newRxError)('COL1', {
          data: json
        });
      }

      json = tempDoc.toJSON();
    }

    var useJson = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(this, json);
    var newDoc = tempDoc;
    var startTime;
    var endTime;
    return this._runHooks('pre', 'insert', useJson).then(function () {
      _this5.schema.validate(useJson);

      startTime = (0, _util.now)();
      return _this5._pouchPut(useJson);
    }).then(function (insertResult) {
      endTime = (0, _util.now)();
      useJson[_this5.schema.primaryPath] = insertResult.id;
      useJson._rev = insertResult.rev;

      if (tempDoc) {
        tempDoc._dataSync$.next(useJson);
      } else newDoc = (0, _rxDocumentPrototypeMerge.createRxDocument)(_this5, useJson);

      return _this5._runHooks('post', 'insert', useJson, newDoc);
    }).then(function () {
      // event
      var emitEvent = (0, _rxChangeEvent.createInsertEvent)(_this5, useJson, startTime, endTime, newDoc);

      _this5.$emit(emitEvent);

      return newDoc;
    });
  };

  _proto.bulkInsert = function bulkInsert(docsData) {
    var _this6 = this;

    var useDocs = docsData.map(function (docData) {
      var useDocData = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(_this6, docData);
      return useDocData;
    });
    return Promise.all(useDocs.map(function (doc) {
      return _this6._runHooks('pre', 'insert', doc).then(function () {
        _this6.schema.validate(doc);

        return doc;
      });
    })).then(function (docs) {
      var insertDocs = docs.map(function (d) {
        return _this6._handleToPouch(d);
      });
      var docsMap = new Map();
      docs.forEach(function (d) {
        docsMap.set(d[_this6.schema.primaryPath], d);
      });
      return _this6.database.lockedRun(function () {
        var startTime = (0, _util.now)();
        return _this6.pouch.bulkDocs(insertDocs).then(function (results) {
          var okResults = results.filter(function (r) {
            return r.ok;
          }); // create documents

          var rxDocuments = okResults.map(function (r) {
            var docData = docsMap.get(r.id);
            docData._rev = r.rev;
            var doc = (0, _rxDocumentPrototypeMerge.createRxDocument)(_this6, docData);
            return doc;
          });
          return Promise.all(rxDocuments.map(function (doc) {
            return _this6._runHooks('post', 'insert', docsMap.get(doc.primary), doc);
          })).then(function () {
            var errorResults = results.filter(function (r) {
              return !r.ok;
            });
            return {
              rxDocuments: rxDocuments,
              errorResults: errorResults
            };
          });
        }).then(function (_ref) {
          var rxDocuments = _ref.rxDocuments,
              errorResults = _ref.errorResults;
          var endTime = (0, _util.now)(); // emit events

          rxDocuments.forEach(function (doc) {
            var emitEvent = (0, _rxChangeEvent.createInsertEvent)(_this6, doc.toJSON(true), startTime, endTime, doc);

            _this6.$emit(emitEvent);
          });
          return {
            success: rxDocuments,
            error: errorResults
          };
        });
      });
    });
  };

  _proto.bulkRemove = /*#__PURE__*/function () {
    var _bulkRemove = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(ids) {
      var _this7 = this;

      var rxDocumentMap, docsData, docsMap, removeDocs, startTime, results, endTime, okResults, rxDocuments;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return this.findByIds(ids);

            case 2:
              rxDocumentMap = _context2.sent;
              docsData = [];
              docsMap = new Map();
              Array.from(rxDocumentMap.values()).forEach(function (rxDocument) {
                var data = rxDocument.toJSON(true);
                docsData.push(data);
                docsMap.set(rxDocument.primary, data);
              });
              _context2.next = 8;
              return Promise.all(docsData.map(function (doc) {
                var primary = doc[_this7.schema.primaryPath];
                return _this7._runHooks('pre', 'remove', doc, rxDocumentMap.get(primary));
              }));

            case 8:
              docsData.forEach(function (doc) {
                return doc._deleted = true;
              });
              removeDocs = docsData.map(function (doc) {
                return _this7._handleToPouch(doc);
              });
              _context2.next = 12;
              return this.database.lockedRun( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
                var bulkResults;
                return _regenerator["default"].wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        startTime = (0, _util.now)();
                        _context.next = 3;
                        return _this7.pouch.bulkDocs(removeDocs);

                      case 3:
                        bulkResults = _context.sent;
                        return _context.abrupt("return", bulkResults);

                      case 5:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              })));

            case 12:
              results = _context2.sent;
              endTime = (0, _util.now)();
              okResults = results.filter(function (r) {
                return r.ok;
              });
              _context2.next = 17;
              return Promise.all(okResults.map(function (r) {
                return _this7._runHooks('post', 'remove', docsMap.get(r.id), rxDocumentMap.get(r.id));
              }));

            case 17:
              okResults.forEach(function (r) {
                var rxDocument = rxDocumentMap.get(r.id);
                var emitEvent = (0, _rxChangeEvent.createDeleteEvent)(_this7, docsMap.get(r.id), rxDocument._data, startTime, endTime, rxDocument);

                _this7.$emit(emitEvent);
              });
              rxDocuments = okResults.map(function (r) {
                return rxDocumentMap.get(r.id);
              });
              return _context2.abrupt("return", {
                success: rxDocuments,
                error: okResults.filter(function (r) {
                  return !r.ok;
                })
              });

            case 20:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function bulkRemove(_x) {
      return _bulkRemove.apply(this, arguments);
    }

    return bulkRemove;
  }()
  /**
   * same as insert but overwrites existing document with same primary
   */
  ;

  _proto.upsert = function upsert(json) {
    var _this8 = this;

    var useJson = (0, _util.flatClone)(json);
    var primary = useJson[this.schema.primaryPath];

    if (!primary) {
      throw (0, _rxError.newRxError)('COL3', {
        primaryPath: this.schema.primaryPath,
        data: useJson
      });
    }

    return this.findOne(primary).exec().then(function (existing) {
      if (existing) {
        useJson._rev = existing['_rev'];
        return existing.atomicUpdate(function () {
          return useJson;
        }).then(function () {
          return existing;
        });
      } else {
        return _this8.insert(json);
      }
    });
  }
  /**
   * upserts to a RxDocument, uses atomicUpdate if document already exists
   */
  ;

  _proto.atomicUpsert = function atomicUpsert(json) {
    var _this9 = this;

    var primary = json[this.schema.primaryPath];

    if (!primary) {
      throw (0, _rxError.newRxError)('COL4', {
        data: json
      });
    } // ensure that it wont try 2 parallel runs


    var queue;

    if (!this._atomicUpsertQueues.has(primary)) {
      queue = Promise.resolve();
    } else {
      queue = this._atomicUpsertQueues.get(primary);
    }

    queue = queue.then(function () {
      return _atomicUpsertEnsureRxDocumentExists(_this9, primary, json);
    }).then(function (wasInserted) {
      if (!wasInserted.inserted) {
        return _atomicUpsertUpdate(wasInserted.doc, json).then(function () {
          return (0, _util.nextTick)();
        }) // tick here so the event can propagate
        .then(function () {
          return wasInserted.doc;
        });
      } else return wasInserted.doc;
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
      queryObj = (0, _rxQuery._getDefaultQuery)(this);
    }

    var query = (0, _rxQuery.createRxQuery)('find', queryObj, this);
    return query;
  };

  _proto.findOne = function findOne(queryObj) {
    var query;

    if (typeof queryObj === 'string') {
      query = (0, _rxQuery.createRxQuery)('findOne', {
        selector: {
          _id: queryObj
        }
      }, this);
    } else {
      if (!queryObj) {
        queryObj = (0, _rxQuery._getDefaultQuery)(this);
      } // cannot have limit on findOne queries


      if (queryObj.limit) {
        throw (0, _rxError.newRxError)('QU6');
      }

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

  _proto.findByIds =
  /*#__PURE__*/
  function () {
    var _findByIds = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(ids) {
      var _this10 = this;

      var ret, mustBeQueried, result;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              ret = new Map();
              mustBeQueried = []; // first try to fill from docCache

              ids.forEach(function (id) {
                var doc = _this10._docCache.get(id);

                if (doc) {
                  ret.set(id, doc);
                } else {
                  mustBeQueried.push(id);
                }
              }); // find everything which was not in docCache

              if (!(mustBeQueried.length > 0)) {
                _context3.next = 8;
                break;
              }

              _context3.next = 6;
              return this.pouch.allDocs({
                include_docs: true,
                keys: mustBeQueried
              });

            case 6:
              result = _context3.sent;
              result.rows.forEach(function (row) {
                if (!row.doc) {
                  // not found
                  return;
                }

                var plainData = _this10._handleFromPouch(row.doc);

                var doc = (0, _rxDocumentPrototypeMerge.createRxDocument)(_this10, plainData);
                ret.set(doc.primary, doc);
              });

            case 8:
              return _context3.abrupt("return", ret);

            case 9:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function findByIds(_x2) {
      return _findByIds.apply(this, arguments);
    }

    return findByIds;
  }()
  /**
   * like this.findByIds but returns an observable
   * that always emitts the current state
   */
  ;

  _proto.findByIds$ = function findByIds$(ids) {
    var _this11 = this;

    var currentValue = null;
    var initialPromise = this.findByIds(ids).then(function (docsMap) {
      currentValue = docsMap;
    });
    return this.$.pipe((0, _operators.startWith)(null), (0, _operators.mergeMap)(function (ev) {
      return initialPromise.then(function () {
        return ev;
      });
    }), (0, _operators.map)(function (ev) {
      if (!currentValue) {
        throw new Error('should not happen');
      }

      if (!ev) {
        return currentValue;
      }

      if (!ids.includes(ev.documentId)) {
        return null;
      }

      var op = ev.operation;

      if (op === 'INSERT' || op === 'UPDATE') {
        currentValue.set(ev.documentId, _this11._docCache.get(ev.documentId));
      } else {
        currentValue["delete"](ev.documentId);
      }

      return currentValue;
    }), (0, _operators.filter)(function (x) {
      return !!x;
    }), (0, _operators.shareReplay)(1));
  }
  /**
   * Export collection to a JSON friendly format.
   * @param _decrypted
   * When true, all encrypted values will be decrypted.
   * When false or omitted and an interface or type is loaded in this collection,
   * all base properties of the type are typed as `any` since data could be encrypted.
   */
  ;

  _proto.dump = function dump() {
    var _decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    throw (0, _util.pluginMissing)('json-dump');
  }
  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<collection>.dump()` method.
   */
  ;

  _proto.importDump = function importDump(_exportedJSON) {
    throw (0, _util.pluginMissing)('json-dump');
  }
  /**
   * waits for external changes to the database
   * and ensures they are emitted to the internal RxChangeEvent-Stream
   * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
   */
  ;

  _proto.watchForChanges = function watchForChanges() {
    throw (0, _util.pluginMissing)('watch-for-changes');
  }
  /**
   * sync with another database
   */
  ;

  _proto.sync = function sync(_syncOptions) {
    throw (0, _util.pluginMissing)('replication');
  }
  /**
   * sync with a GraphQL endpoint
   */
  ;

  _proto.syncGraphQL = function syncGraphQL(options) {
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
    if (!hooks) return Promise.resolve(); // run parallel: false

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
    if (this.destroyed) return Promise.resolve(false);

    if (this._onDestroyCall) {
      this._onDestroyCall();
    }

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });

    if (this._changeEventBuffer) {
      this._changeEventBuffer.destroy();
    }

    this._repStates.forEach(function (sync) {
      return sync.cancel();
    });

    delete this.database.collections[this.name];
    this.destroyed = true;
    return Promise.resolve(true);
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
      var _this12 = this;

      if (!this._onDestroy) {
        this._onDestroy = new Promise(function (res) {
          return _this12._onDestroyCall = res;
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
 * creates the indexes in the pouchdb
 */


function _prepareCreateIndexes(rxCollection, spawnedPouchPromise) {
  /**
   * pouchdb does no check on already existing indexes
   * which makes collection re-creation really slow on page reloads
   * So we have to manually check if the index already exists
   */
  return spawnedPouchPromise.then(function () {
    return rxCollection.pouch.getIndexes();
  }).then(function (indexResult) {
    var existingIndexes = new Set();
    indexResult.indexes.forEach(function (idx) {
      return existingIndexes.add(idx.name);
    });
    return existingIndexes;
  }).then(function (existingIndexes) {
    return Promise.all(rxCollection.schema.indexes.map(function (indexAr) {
      var compressedIdx = indexAr.map(function (key) {
        var primPath = rxCollection.schema.primaryPath;
        var useKey = key === primPath ? '_id' : key;

        if (!rxCollection.schema.doKeyCompression()) {
          return useKey;
        } else {
          var indexKey = rxCollection._keyCompressor.transformKey(useKey);

          return indexKey;
        }
      });
      var indexName = 'idx-rxdb-index-' + compressedIdx.join(',');

      if (existingIndexes.has(indexName)) {
        // index already exists
        return;
      }
      /**
       * TODO
       * we might have even better performance by doing a bulkDocs
       * on index creation
       */


      return spawnedPouchPromise.then(function () {
        return rxCollection.pouch.createIndex({
          name: indexName,
          ddoc: indexName,
          index: {
            fields: compressedIdx
          }
        });
      });
    }));
  });
}
/**
 * creates and prepares a new collection
 */


function create(_ref3, wasCreatedBefore) {
  var database = _ref3.database,
      name = _ref3.name,
      schema = _ref3.schema,
      _ref3$pouchSettings = _ref3.pouchSettings,
      pouchSettings = _ref3$pouchSettings === void 0 ? {} : _ref3$pouchSettings,
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
  (0, _pouchDb.validateCouchDBString)(name); // ensure it is a schema-object

  if (!(0, _rxSchema.isInstanceOf)(schema)) {
    schema = (0, _rxSchema.createRxSchema)(schema);
  }

  Object.keys(methods).filter(function (funName) {
    return schema.topLevelFields.includes(funName);
  }).forEach(function (funName) {
    throw (0, _rxError.newRxError)('COL18', {
      funName: funName
    });
  });
  var collection = new RxCollectionBase(database, name, schema, pouchSettings, migrationStrategies, methods, attachments, options, cacheReplacementPolicy, statics);
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
    var ret = Promise.resolve();

    if (autoMigrate && collection.schema.version !== 0) {
      ret = collection.migratePromise();
    }

    return ret;
  }).then(function () {
    (0, _hooks.runPluginHooks)('createRxCollection', collection);
    return collection;
  });
}

function isInstanceOf(obj) {
  return obj instanceof RxCollectionBase;
}

var _default = {
  create: create,
  isInstanceOf: isInstanceOf,
  RxCollectionBase: RxCollectionBase
};
exports["default"] = _default;

//# sourceMappingURL=rx-collection.js.map