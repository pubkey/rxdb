import _createClass from "@babel/runtime/helpers/createClass";
import { IdleQueue } from 'custom-idle-queue';
import { pluginMissing, flatClone, PROMISE_RESOLVE_FALSE, randomCouchString, ensureNotFalsy, getDefaultRevision, getDefaultRxDocumentMeta, defaultHashFunction } from './util';
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

/**
 * For better performance some tasks run async
 * and are awaited later.
 * But we still have to ensure that there have been no errors
 * on database creation.
 */
export var ensureNoStartupErrors = function ensureNoStartupErrors(rxDatabase) {
  try {
    return Promise.resolve(rxDatabase.storageToken).then(function () {
      if (rxDatabase.startupErrors[0]) {
        throw rxDatabase.startupErrors[0];
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Returns true if the given RxDatabase was the first
 * instance that was created on the storage with this name.
 * 
 * Can be used for some optimizations because on the first instantiation,
 * we can assume that no data was written before.
 */
export var isRxDatabaseFirstTimeInstantiated = function isRxDatabaseFirstTimeInstantiated(database) {
  try {
    return Promise.resolve(database.storageTokenDocument).then(function (tokenDoc) {
      return tokenDoc.data.instanceToken === database.token;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Removes the database and all its known data
 * with all known collections and all internal meta data.
 * 
 * Returns the names of the removed collections.
 */
export var removeRxDatabase = function removeRxDatabase(databaseName, storage) {
  try {
    var databaseInstanceToken = randomCouchString(10);
    return Promise.resolve(createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, {}, false)).then(function (dbInternalsStorageInstance) {
      return Promise.resolve(getAllCollectionDocuments(storage.statics, dbInternalsStorageInstance)).then(function (collectionDocs) {
        var collectionNames = new Set();
        collectionDocs.forEach(function (doc) {
          return collectionNames.add(doc.data.name);
        });
        var removedCollectionNames = Array.from(collectionNames);
        return Promise.resolve(Promise.all(removedCollectionNames.map(function (collectionName) {
          return removeCollectionStorages(storage, dbInternalsStorageInstance, databaseInstanceToken, databaseName, collectionName);
        }))).then(function () {
          return Promise.resolve(runAsyncPluginHooks('postRemoveRxDatabase', {
            databaseName: databaseName,
            storage: storage
          })).then(function () {
            return Promise.resolve(dbInternalsStorageInstance.remove()).then(function () {
              return removedCollectionNames;
            });
          });
        });
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
export var createRxDatabaseStorageInstance = function createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, options, multiInstance, password) {
  try {
    return Promise.resolve(storage.createStorageInstance({
      databaseInstanceToken: databaseInstanceToken,
      databaseName: databaseName,
      collectionName: INTERNAL_STORAGE_NAME,
      schema: INTERNAL_STORE_SCHEMA,
      options: options,
      multiInstance: multiInstance,
      password: password
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};
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
  _proto.removeCollectionDoc = function removeCollectionDoc(name, schema) {
    try {
      var _this3 = this;
      return Promise.resolve(getSingleDocument(_this3.internalStore, getPrimaryKeyOfInternalDocument(_collectionNamePrimary(name, schema), INTERNAL_CONTEXT_COLLECTION))).then(function (doc) {
        if (!doc) {
          throw newRxError('SNH', {
            name: name,
            schema: schema
          });
        }
        var writeDoc = flatCloneDocWithMeta(doc);
        writeDoc._deleted = true;
        return Promise.resolve(_this3.internalStore.bulkWrite([{
          document: writeDoc,
          previous: doc
        }], 'rx-database-remove-collection')).then(function () {});
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * creates multiple RxCollections at once
   * to be much faster by saving db txs and doing stuff in bulk-operations
   * This function is not called often, but mostly in the critical path at the initial page load
   * So it must be as fast as possible.
   */
  ;
  _proto.addCollections = function addCollections(collectionCreators) {
    try {
      var _this5 = this;
      var jsonSchemas = {};
      var schemas = {};
      var bulkPutDocs = [];
      var useArgsByCollectionName = {};
      Object.entries(collectionCreators).forEach(function (_ref) {
        var name = _ref[0],
          args = _ref[1];
        var collectionName = name;
        var rxJsonSchema = args.schema;
        jsonSchemas[collectionName] = rxJsonSchema;
        var schema = createRxSchema(rxJsonSchema);
        schemas[collectionName] = schema;

        // collection already exists
        if (_this5.collections[name]) {
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
          database: _this5
        });

        // run hooks
        var hookData = flatClone(args);
        hookData.database = _this5;
        hookData.name = name;
        runPluginHooks('preCreateRxCollection', hookData);
        useArgs.conflictHandler = hookData.conflictHandler;
        useArgsByCollectionName[collectionName] = useArgs;
      });
      return Promise.resolve(_this5.internalStore.bulkWrite(bulkPutDocs, 'rx-database-add-collection')).then(function (putDocsResult) {
        return Promise.resolve(ensureNoStartupErrors(_this5)).then(function () {
          Object.entries(putDocsResult.error).forEach(function (_ref2) {
            var _id = _ref2[0],
              error = _ref2[1];
            var docInDb = ensureNotFalsy(error.documentInDb);
            var collectionName = docInDb.data.name;
            var schema = schemas[collectionName];
            // collection already exists but has different schema
            if (docInDb.data.schemaHash !== schema.hash) {
              throw newRxError('DB6', {
                database: _this5.name,
                collection: collectionName,
                previousSchemaHash: docInDb.data.schemaHash,
                schemaHash: schema.hash,
                previousSchema: docInDb.data.schema,
                schema: ensureNotFalsy(jsonSchemas[collectionName])
              });
            }
          });
          var ret = {};
          return Promise.resolve(Promise.all(Object.keys(collectionCreators).map(function (collectionName) {
            try {
              var useArgs = useArgsByCollectionName[collectionName];
              return Promise.resolve(createRxCollection(useArgs)).then(function (collection) {
                ret[collectionName] = collection;

                // set as getter to the database
                _this5.collections[collectionName] = collection;
                if (!_this5[collectionName]) {
                  Object.defineProperty(_this5, collectionName, {
                    get: function get() {
                      return _this5.collections[collectionName];
                    }
                  });
                }
              });
            } catch (e) {
              return Promise.reject(e);
            }
          }))).then(function () {
            return ret;
          });
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
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
  _proto.serverCouchDB = function serverCouchDB(_options) {
    throw pluginMissing('server-couchdb');
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
  _proto.destroy = function destroy() {
    try {
      var _this7 = this;
      if (_this7.destroyed) {
        return Promise.resolve(PROMISE_RESOLVE_FALSE);
      }

      // settings destroyed = true must be the first thing to do.
      _this7.destroyed = true;
      return Promise.resolve(runAsyncPluginHooks('preDestroyRxDatabase', _this7)).then(function () {
        /**
         * Complete the event stream
         * to stop all subscribers who forgot to unsubscribe.
         */
        _this7.eventBulks$.complete();
        DB_COUNT--;
        _this7._subs.map(function (sub) {
          return sub.unsubscribe();
        });

        /**
         * Destroying the pseudo instance will throw
         * because stulff is missing
         * TODO we should not need the pseudo instance on runtime.
         * we should generate the property list on build time.
         */
        return _this7.name === 'pseudoInstance' ? PROMISE_RESOLVE_FALSE : _this7.requestIdlePromise().then(function () {
          return Promise.all(_this7.onDestroy.map(function (fn) {
            return fn();
          }));
        })
        // destroy all collections
        .then(function () {
          return Promise.all(Object.keys(_this7.collections).map(function (key) {
            return _this7.collections[key];
          }).map(function (col) {
            return col.destroy();
          }));
        })
        // destroy internal storage instances
        .then(function () {
          return _this7.internalStore.close();
        })
        // remove combination from USED_COMBINATIONS-map
        .then(function () {
          return USED_DATABASE_NAMES["delete"](_this7.name);
        }).then(function () {
          return true;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * deletes the database and its stored data.
   * Returns the names of all removed collections.
   */
  ;
  _proto.remove = function remove() {
    var _this8 = this;
    return this.destroy().then(function () {
      return removeRxDatabase(_this8.name, _this8.storage);
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
export function createRxDatabase(_ref3) {
  var storage = _ref3.storage,
    instanceCreationOptions = _ref3.instanceCreationOptions,
    name = _ref3.name,
    password = _ref3.password,
    _ref3$multiInstance = _ref3.multiInstance,
    multiInstance = _ref3$multiInstance === void 0 ? true : _ref3$multiInstance,
    _ref3$eventReduce = _ref3.eventReduce,
    eventReduce = _ref3$eventReduce === void 0 ? false : _ref3$eventReduce,
    _ref3$ignoreDuplicate = _ref3.ignoreDuplicate,
    ignoreDuplicate = _ref3$ignoreDuplicate === void 0 ? false : _ref3$ignoreDuplicate,
    _ref3$options = _ref3.options,
    options = _ref3$options === void 0 ? {} : _ref3$options,
    cleanupPolicy = _ref3.cleanupPolicy,
    _ref3$localDocuments = _ref3.localDocuments,
    localDocuments = _ref3$localDocuments === void 0 ? false : _ref3$localDocuments,
    _ref3$hashFunction = _ref3.hashFunction,
    hashFunction = _ref3$hashFunction === void 0 ? defaultHashFunction : _ref3$hashFunction;
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
    var rxDatabase = new RxDatabaseBase(name, databaseInstanceToken, storage, instanceCreationOptions, password, multiInstance, eventReduce, options, storageInstance, hashFunction, cleanupPolicy);
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
export function isRxDatabase(obj) {
  return obj instanceof RxDatabaseBase;
}
export function dbCount() {
  return DB_COUNT;
}
//# sourceMappingURL=rx-database.js.map