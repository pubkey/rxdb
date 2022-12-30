import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _createClass from "@babel/runtime/helpers/createClass";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { IdleQueue } from 'custom-idle-queue';
import { pluginMissing, flatClone, PROMISE_RESOLVE_FALSE, randomCouchString, ensureNotFalsy, getDefaultRevision, getDefaultRxDocumentMeta, defaultHashFunction } from './plugins/utils';
import { newRxError } from './rx-error';
import { createRxSchema } from './rx-schema';
import { runPluginHooks, runAsyncPluginHooks } from './hooks';
import { Subject } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { createRxCollection } from './rx-collection';
import { flatCloneDocWithMeta, getSingleDocument, getWrappedStorageInstance, INTERNAL_STORAGE_NAME } from './rx-storage-helper';
import { ObliviousSet } from 'oblivious-set';
import { ensureStorageTokenDocumentExists, getAllCollectionDocuments, getPrimaryKeyOfInternalDocument, INTERNAL_CONTEXT_COLLECTION, INTERNAL_STORE_SCHEMA, _collectionNamePrimary } from './rx-database-internal-store';
import { removeCollectionStorages } from './rx-collection-helper';

/**
 * stores the used database names
 * so we can throw when the same database is created more then once.
 */
var USED_DATABASE_NAMES = new Set();
var DB_COUNT = 0;
export var RxDatabaseBase = /*#__PURE__*/function () {
  function RxDatabaseBase(name,
  /**
   * Uniquely identifies the instance
   * of this RxDatabase.
   */
  token, storage, instanceCreationOptions, password, multiInstance) {
    var _this = this;
    var eventReduce = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;
    var options = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
    var
    /**
     * Stores information documents about the collections of the database
     */
    internalStore = arguments.length > 8 ? arguments[8] : undefined;
    var hashFunction = arguments.length > 9 ? arguments[9] : undefined;
    var cleanupPolicy = arguments.length > 10 ? arguments[10] : undefined;
    var allowSlowCount = arguments.length > 11 ? arguments[11] : undefined;
    this.idleQueue = new IdleQueue();
    this._subs = [];
    this.startupErrors = [];
    this.onDestroy = [];
    this.destroyed = false;
    this.collections = {};
    this.eventBulks$ = new Subject();
    this.observable$ = this.eventBulks$.pipe(mergeMap(function (changeEventBulk) {
      return changeEventBulk.events;
    }));
    this.storageToken = PROMISE_RESOLVE_FALSE;
    this.storageTokenDocument = PROMISE_RESOLVE_FALSE;
    this.emittedEventBulkIds = new ObliviousSet(60 * 1000);
    this.name = name;
    this.token = token;
    this.storage = storage;
    this.instanceCreationOptions = instanceCreationOptions;
    this.password = password;
    this.multiInstance = multiInstance;
    this.eventReduce = eventReduce;
    this.options = options;
    this.internalStore = internalStore;
    this.hashFunction = hashFunction;
    this.cleanupPolicy = cleanupPolicy;
    this.allowSlowCount = allowSlowCount;
    DB_COUNT++;

    /**
     * In the dev-mode, we create a pseudoInstance
     * to get all properties of RxDatabase and ensure they do not
     * conflict with the collection names etc.
     * So only if it is not pseudoInstance,
     * we have all values to prepare a real RxDatabase.
     *
     * TODO this is ugly, we should use a different way in the dev-mode
     * so that all non-dev-mode code can be cleaner.
     */
    if (this.name !== 'pseudoInstance') {
      /**
       * Wrap the internal store
       * to ensure that calls to it also end up in
       * calculation of the idle state and the hooks.
       */
      this.internalStore = getWrappedStorageInstance(this.asRxDatabase, internalStore, INTERNAL_STORE_SCHEMA);

      /**
       * Start writing the storage token.
       * Do not await the creation because it would run
       * in a critical path that increases startup time.
       *
       * Writing the token takes about 20 milliseconds
       * even on a fast adapter, so this is worth it.
       */
      this.storageTokenDocument = ensureStorageTokenDocumentExists(this.asRxDatabase)["catch"](function (err) {
        return _this.startupErrors.push(err);
      });
      this.storageToken = this.storageTokenDocument.then(function (doc) {
        return doc.data.token;
      })["catch"](function (err) {
        return _this.startupErrors.push(err);
      });
    }
  }
  var _proto = RxDatabaseBase.prototype;
  /**
   * This is the main handle-point for all change events
   * ChangeEvents created by this instance go:
   * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
   * ChangeEvents created by other instances go:
   * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
   */
  _proto.$emit = function $emit(changeEventBulk) {
    if (this.emittedEventBulkIds.has(changeEventBulk.id)) {
      return;
    }
    this.emittedEventBulkIds.add(changeEventBulk.id);

    // emit into own stream
    this.eventBulks$.next(changeEventBulk);
  }

  /**
   * removes the collection-doc from the internalStore
   */;
  _proto.removeCollectionDoc =
  /*#__PURE__*/
  function () {
    var _removeCollectionDoc = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(name, schema) {
      var doc, writeDoc;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return getSingleDocument(this.internalStore, getPrimaryKeyOfInternalDocument(_collectionNamePrimary(name, schema), INTERNAL_CONTEXT_COLLECTION));
          case 2:
            doc = _context.sent;
            if (doc) {
              _context.next = 5;
              break;
            }
            throw newRxError('SNH', {
              name: name,
              schema: schema
            });
          case 5:
            writeDoc = flatCloneDocWithMeta(doc);
            writeDoc._deleted = true;
            _context.next = 9;
            return this.internalStore.bulkWrite([{
              document: writeDoc,
              previous: doc
            }], 'rx-database-remove-collection');
          case 9:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function removeCollectionDoc(_x, _x2) {
      return _removeCollectionDoc.apply(this, arguments);
    }
    return removeCollectionDoc;
  }()
  /**
   * creates multiple RxCollections at once
   * to be much faster by saving db txs and doing stuff in bulk-operations
   * This function is not called often, but mostly in the critical path at the initial page load
   * So it must be as fast as possible.
   */
  ;
  _proto.addCollections =
  /*#__PURE__*/
  function () {
    var _addCollections = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(collectionCreators) {
      var _this2 = this;
      var jsonSchemas, schemas, bulkPutDocs, useArgsByCollectionName, putDocsResult, ret;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            jsonSchemas = {};
            schemas = {};
            bulkPutDocs = [];
            useArgsByCollectionName = {};
            Object.entries(collectionCreators).forEach(function (_ref) {
              var name = _ref[0],
                args = _ref[1];
              var collectionName = name;
              var rxJsonSchema = args.schema;
              jsonSchemas[collectionName] = rxJsonSchema;
              var schema = createRxSchema(rxJsonSchema);
              schemas[collectionName] = schema;

              // collection already exists
              if (_this2.collections[name]) {
                throw newRxError('DB3', {
                  name: name
                });
              }
              var collectionNameWithVersion = _collectionNamePrimary(name, rxJsonSchema);
              var collectionDocData = {
                id: getPrimaryKeyOfInternalDocument(collectionNameWithVersion, INTERNAL_CONTEXT_COLLECTION),
                key: collectionNameWithVersion,
                context: INTERNAL_CONTEXT_COLLECTION,
                data: {
                  name: collectionName,
                  schemaHash: schema.hash,
                  schema: schema.jsonSchema,
                  version: schema.version,
                  connectedStorages: []
                },
                _deleted: false,
                _meta: getDefaultRxDocumentMeta(),
                _rev: getDefaultRevision(),
                _attachments: {}
              };
              bulkPutDocs.push({
                document: collectionDocData
              });
              var useArgs = Object.assign({}, args, {
                name: collectionName,
                schema: schema,
                database: _this2
              });

              // run hooks
              var hookData = flatClone(args);
              hookData.database = _this2;
              hookData.name = name;
              runPluginHooks('preCreateRxCollection', hookData);
              useArgs.conflictHandler = hookData.conflictHandler;
              useArgsByCollectionName[collectionName] = useArgs;
            });
            _context3.next = 7;
            return this.internalStore.bulkWrite(bulkPutDocs, 'rx-database-add-collection');
          case 7:
            putDocsResult = _context3.sent;
            _context3.next = 10;
            return ensureNoStartupErrors(this);
          case 10:
            Object.entries(putDocsResult.error).forEach(function (_ref2) {
              var _id = _ref2[0],
                error = _ref2[1];
              if (error.status !== 409) {
                throw newRxError('DB12', {
                  database: _this2.name,
                  writeError: error
                });
              }
              var docInDb = ensureNotFalsy(error.documentInDb);
              var collectionName = docInDb.data.name;
              var schema = schemas[collectionName];
              // collection already exists but has different schema
              if (docInDb.data.schemaHash !== schema.hash) {
                throw newRxError('DB6', {
                  database: _this2.name,
                  collection: collectionName,
                  previousSchemaHash: docInDb.data.schemaHash,
                  schemaHash: schema.hash,
                  previousSchema: docInDb.data.schema,
                  schema: ensureNotFalsy(jsonSchemas[collectionName])
                });
              }
            });
            ret = {};
            _context3.next = 14;
            return Promise.all(Object.keys(collectionCreators).map( /*#__PURE__*/function () {
              var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(collectionName) {
                var useArgs, collection;
                return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) switch (_context2.prev = _context2.next) {
                    case 0:
                      useArgs = useArgsByCollectionName[collectionName];
                      _context2.next = 3;
                      return createRxCollection(useArgs);
                    case 3:
                      collection = _context2.sent;
                      ret[collectionName] = collection;

                      // set as getter to the database
                      _this2.collections[collectionName] = collection;
                      if (!_this2[collectionName]) {
                        Object.defineProperty(_this2, collectionName, {
                          get: function get() {
                            return _this2.collections[collectionName];
                          }
                        });
                      }
                    case 7:
                    case "end":
                      return _context2.stop();
                  }
                }, _callee2);
              }));
              return function (_x4) {
                return _ref3.apply(this, arguments);
              };
            }()));
          case 14:
            return _context3.abrupt("return", ret);
          case 15:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function addCollections(_x3) {
      return _addCollections.apply(this, arguments);
    }
    return addCollections;
  }()
  /**
   * runs the given function between idleQueue-locking
   */
  ;
  _proto.lockedRun = function lockedRun(fn) {
    return this.idleQueue.wrapCall(fn);
  };
  _proto.requestIdlePromise = function requestIdlePromise() {
    return this.idleQueue.requestIdlePromise();
  }

  /**
   * Export database to a JSON friendly format.
   */;
  _proto.exportJSON = function exportJSON(_collections) {
    throw pluginMissing('json-dump');
  }

  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<db>.exportJSON()` method.
   * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
   * since data could be encrypted.
   */;
  _proto.importJSON = function importJSON(_exportedJSON) {
    throw pluginMissing('json-dump');
  };
  _proto.backup = function backup(_options) {
    throw pluginMissing('backup');
  };
  _proto.leaderElector = function leaderElector() {
    throw pluginMissing('leader-election');
  };
  _proto.isLeader = function isLeader() {
    throw pluginMissing('leader-election');
  }
  /**
   * returns a promise which resolves when the instance becomes leader
   */;
  _proto.waitForLeadership = function waitForLeadership() {
    throw pluginMissing('leader-election');
  };
  _proto.migrationStates = function migrationStates() {
    throw pluginMissing('migration');
  }

  /**
   * destroys the database-instance and all collections
   */;
  _proto.destroy =
  /*#__PURE__*/
  function () {
    var _destroy = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
      var _this3 = this;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            if (!this.destroyed) {
              _context4.next = 2;
              break;
            }
            return _context4.abrupt("return", PROMISE_RESOLVE_FALSE);
          case 2:
            // settings destroyed = true must be the first thing to do.
            this.destroyed = true;
            _context4.next = 5;
            return runAsyncPluginHooks('preDestroyRxDatabase', this);
          case 5:
            /**
             * Complete the event stream
             * to stop all subscribers who forgot to unsubscribe.
             */
            this.eventBulks$.complete();
            DB_COUNT--;
            this._subs.map(function (sub) {
              return sub.unsubscribe();
            });

            /**
             * Destroying the pseudo instance will throw
             * because stulff is missing
             * TODO we should not need the pseudo instance on runtime.
             * we should generate the property list on build time.
             */
            if (!(this.name === 'pseudoInstance')) {
              _context4.next = 10;
              break;
            }
            return _context4.abrupt("return", PROMISE_RESOLVE_FALSE);
          case 10:
            return _context4.abrupt("return", this.requestIdlePromise().then(function () {
              return Promise.all(_this3.onDestroy.map(function (fn) {
                return fn();
              }));
            })
            // destroy all collections
            .then(function () {
              return Promise.all(Object.keys(_this3.collections).map(function (key) {
                return _this3.collections[key];
              }).map(function (col) {
                return col.destroy();
              }));
            })
            // destroy internal storage instances
            .then(function () {
              return _this3.internalStore.close();
            })
            // remove combination from USED_COMBINATIONS-map
            .then(function () {
              return USED_DATABASE_NAMES["delete"](_this3.name);
            }).then(function () {
              return true;
            }));
          case 11:
          case "end":
            return _context4.stop();
        }
      }, _callee4, this);
    }));
    function destroy() {
      return _destroy.apply(this, arguments);
    }
    return destroy;
  }()
  /**
   * deletes the database and its stored data.
   * Returns the names of all removed collections.
   */
  ;
  _proto.remove = function remove() {
    var _this4 = this;
    return this.destroy().then(function () {
      return removeRxDatabase(_this4.name, _this4.storage);
    });
  };
  _createClass(RxDatabaseBase, [{
    key: "$",
    get: function get() {
      return this.observable$;
    }
  }, {
    key: "asRxDatabase",
    get: function get() {
      return this;
    }
  }]);
  return RxDatabaseBase;
}();

/**
 * checks if an instance with same name and adapter already exists
 * @throws {RxError} if used
 */
function throwIfDatabaseNameUsed(name) {
  if (!USED_DATABASE_NAMES.has(name)) {
    return;
  } else {
    throw newRxError('DB8', {
      name: name,
      link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
    });
  }
}

/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
export function createRxDatabaseStorageInstance(_x5, _x6, _x7, _x8, _x9, _x10) {
  return _createRxDatabaseStorageInstance.apply(this, arguments);
}
function _createRxDatabaseStorageInstance() {
  _createRxDatabaseStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(databaseInstanceToken, storage, databaseName, options, multiInstance, password) {
    var internalStore;
    return _regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return storage.createStorageInstance({
            databaseInstanceToken: databaseInstanceToken,
            databaseName: databaseName,
            collectionName: INTERNAL_STORAGE_NAME,
            schema: INTERNAL_STORE_SCHEMA,
            options: options,
            multiInstance: multiInstance,
            password: password
          });
        case 2:
          internalStore = _context5.sent;
          return _context5.abrupt("return", internalStore);
        case 4:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
  return _createRxDatabaseStorageInstance.apply(this, arguments);
}
export function createRxDatabase(_ref4) {
  var storage = _ref4.storage,
    instanceCreationOptions = _ref4.instanceCreationOptions,
    name = _ref4.name,
    password = _ref4.password,
    _ref4$multiInstance = _ref4.multiInstance,
    multiInstance = _ref4$multiInstance === void 0 ? true : _ref4$multiInstance,
    _ref4$eventReduce = _ref4.eventReduce,
    eventReduce = _ref4$eventReduce === void 0 ? false : _ref4$eventReduce,
    _ref4$ignoreDuplicate = _ref4.ignoreDuplicate,
    ignoreDuplicate = _ref4$ignoreDuplicate === void 0 ? false : _ref4$ignoreDuplicate,
    _ref4$options = _ref4.options,
    options = _ref4$options === void 0 ? {} : _ref4$options,
    cleanupPolicy = _ref4.cleanupPolicy,
    _ref4$allowSlowCount = _ref4.allowSlowCount,
    allowSlowCount = _ref4$allowSlowCount === void 0 ? false : _ref4$allowSlowCount,
    _ref4$localDocuments = _ref4.localDocuments,
    localDocuments = _ref4$localDocuments === void 0 ? false : _ref4$localDocuments,
    _ref4$hashFunction = _ref4.hashFunction,
    hashFunction = _ref4$hashFunction === void 0 ? defaultHashFunction : _ref4$hashFunction;
  runPluginHooks('preCreateRxDatabase', {
    storage: storage,
    instanceCreationOptions: instanceCreationOptions,
    name: name,
    password: password,
    multiInstance: multiInstance,
    eventReduce: eventReduce,
    ignoreDuplicate: ignoreDuplicate,
    options: options,
    localDocuments: localDocuments
  });
  // check if combination already used
  if (!ignoreDuplicate) {
    throwIfDatabaseNameUsed(name);
  }
  USED_DATABASE_NAMES.add(name);
  var databaseInstanceToken = randomCouchString(10);
  return createRxDatabaseStorageInstance(databaseInstanceToken, storage, name, instanceCreationOptions, multiInstance, password)
  /**
   * Creating the internal store might fail
   * if some RxStorage wrapper is used that does some checks
   * and then throw.
   * In that case we have to properly clean up the database.
   */["catch"](function (err) {
    USED_DATABASE_NAMES["delete"](name);
    throw err;
  }).then(function (storageInstance) {
    var rxDatabase = new RxDatabaseBase(name, databaseInstanceToken, storage, instanceCreationOptions, password, multiInstance, eventReduce, options, storageInstance, hashFunction, cleanupPolicy, allowSlowCount);
    return runAsyncPluginHooks('createRxDatabase', {
      database: rxDatabase,
      creator: {
        storage: storage,
        instanceCreationOptions: instanceCreationOptions,
        name: name,
        password: password,
        multiInstance: multiInstance,
        eventReduce: eventReduce,
        ignoreDuplicate: ignoreDuplicate,
        options: options,
        localDocuments: localDocuments
      }
    }).then(function () {
      return rxDatabase;
    });
  });
}

/**
 * Removes the database and all its known data
 * with all known collections and all internal meta data.
 *
 * Returns the names of the removed collections.
 */
export function removeRxDatabase(_x11, _x12) {
  return _removeRxDatabase.apply(this, arguments);
}
function _removeRxDatabase() {
  _removeRxDatabase = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(databaseName, storage) {
    var databaseInstanceToken, dbInternalsStorageInstance, collectionDocs, collectionNames, removedCollectionNames;
    return _regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          databaseInstanceToken = randomCouchString(10);
          _context6.next = 3;
          return createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, {}, false);
        case 3:
          dbInternalsStorageInstance = _context6.sent;
          _context6.next = 6;
          return getAllCollectionDocuments(storage.statics, dbInternalsStorageInstance);
        case 6:
          collectionDocs = _context6.sent;
          collectionNames = new Set();
          collectionDocs.forEach(function (doc) {
            return collectionNames.add(doc.data.name);
          });
          removedCollectionNames = Array.from(collectionNames);
          _context6.next = 12;
          return Promise.all(removedCollectionNames.map(function (collectionName) {
            return removeCollectionStorages(storage, dbInternalsStorageInstance, databaseInstanceToken, databaseName, collectionName);
          }));
        case 12:
          _context6.next = 14;
          return runAsyncPluginHooks('postRemoveRxDatabase', {
            databaseName: databaseName,
            storage: storage
          });
        case 14:
          _context6.next = 16;
          return dbInternalsStorageInstance.remove();
        case 16:
          return _context6.abrupt("return", removedCollectionNames);
        case 17:
        case "end":
          return _context6.stop();
      }
    }, _callee6);
  }));
  return _removeRxDatabase.apply(this, arguments);
}
export function isRxDatabase(obj) {
  return obj instanceof RxDatabaseBase;
}
export function dbCount() {
  return DB_COUNT;
}

/**
 * Returns true if the given RxDatabase was the first
 * instance that was created on the storage with this name.
 *
 * Can be used for some optimizations because on the first instantiation,
 * we can assume that no data was written before.
 */
export function isRxDatabaseFirstTimeInstantiated(_x13) {
  return _isRxDatabaseFirstTimeInstantiated.apply(this, arguments);
}

/**
 * For better performance some tasks run async
 * and are awaited later.
 * But we still have to ensure that there have been no errors
 * on database creation.
 */
function _isRxDatabaseFirstTimeInstantiated() {
  _isRxDatabaseFirstTimeInstantiated = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(database) {
    var tokenDoc;
    return _regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          _context7.next = 2;
          return database.storageTokenDocument;
        case 2:
          tokenDoc = _context7.sent;
          return _context7.abrupt("return", tokenDoc.data.instanceToken === database.token);
        case 4:
        case "end":
          return _context7.stop();
      }
    }, _callee7);
  }));
  return _isRxDatabaseFirstTimeInstantiated.apply(this, arguments);
}
export function ensureNoStartupErrors(_x14) {
  return _ensureNoStartupErrors.apply(this, arguments);
}
function _ensureNoStartupErrors() {
  _ensureNoStartupErrors = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(rxDatabase) {
    return _regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          _context8.next = 2;
          return rxDatabase.storageToken;
        case 2:
          if (!rxDatabase.startupErrors[0]) {
            _context8.next = 4;
            break;
          }
          throw rxDatabase.startupErrors[0];
        case 4:
        case "end":
          return _context8.stop();
      }
    }, _callee8);
  }));
  return _ensureNoStartupErrors.apply(this, arguments);
}
//# sourceMappingURL=rx-database.js.map