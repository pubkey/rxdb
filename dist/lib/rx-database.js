"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDatabaseBase = void 0;
exports._collectionNamePrimary = _collectionNamePrimary;
exports._removeAllOfCollection = void 0;
exports.createRxDatabase = createRxDatabase;
exports.createRxDatabaseStorageInstance = void 0;
exports.dbCount = dbCount;
exports.isRxDatabase = isRxDatabase;
exports.removeRxDatabase = exports.isRxDatabaseFirstTimeInstantiated = void 0;

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _customIdleQueue = require("custom-idle-queue");

var _util = require("./util");

var _rxError = require("./rx-error");

var _rxSchema = require("./rx-schema");

var _overwritable = require("./overwritable");

var _hooks = require("./hooks");

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _rxCollection = require("./rx-collection");

var _rxStorageHelper = require("./rx-storage-helper");

var _rxCollectionHelper = require("./rx-collection-helper");

var _obliviousSet = require("oblivious-set");

var _rxDatabaseInternalStore = require("./rx-database-internal-store");

var _rxStorageMultiinstance = require("./rx-storage-multiinstance");

/**
 * Returns true if the given RxDatabase was the first
 * instance that was created on the storage with this name.
 * 
 * Can be used for some optimizations because on the first instantiation,
 * we can assume that no data was written before.
 */
var isRxDatabaseFirstTimeInstantiated = function isRxDatabaseFirstTimeInstantiated(database) {
  try {
    return Promise.resolve(database.storageTokenDocument).then(function (tokenDoc) {
      return tokenDoc.data.instanceToken === database.token;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.isRxDatabaseFirstTimeInstantiated = isRxDatabaseFirstTimeInstantiated;

/**
 * Removes the database and all its known data
 * with all known collections and all internal meta data.
 * 
 * Returns the names of the removed collections.
 */
var removeRxDatabase = function removeRxDatabase(databaseName, storage) {
  try {
    var databaseInstanceToken = (0, _util.randomCouchString)(10);
    return Promise.resolve(createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, {}, false)).then(function (dbInternalsStorageInstance) {
      return Promise.resolve((0, _rxDatabaseInternalStore.getAllCollectionDocuments)(dbInternalsStorageInstance)).then(function (collectionDocs) {
        var removedCollectionNames = [];
        return Promise.resolve(Promise.all(collectionDocs.map(function (colDoc) {
          try {
            var schema = colDoc.data.schema;
            var collectionName = colDoc.data.name;
            removedCollectionNames.push(collectionName);
            return Promise.resolve(storage.createStorageInstance({
              databaseInstanceToken: databaseInstanceToken,
              databaseName: databaseName,
              collectionName: collectionName,
              schema: schema,
              options: {},
              multiInstance: false
            })).then(function (storageInstance) {
              return Promise.resolve(storageInstance.remove()).then(function () {});
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function () {
          return Promise.resolve((0, _hooks.runAsyncPluginHooks)('postRemoveRxDatabase', {
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

exports.removeRxDatabase = removeRxDatabase;

/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
var createRxDatabaseStorageInstance = function createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, options, multiInstance) {
  try {
    return Promise.resolve(storage.createStorageInstance({
      databaseInstanceToken: databaseInstanceToken,
      databaseName: databaseName,
      collectionName: _rxStorageHelper.INTERNAL_STORAGE_NAME,
      schema: _rxDatabaseInternalStore.INTERNAL_STORE_SCHEMA,
      options: options,
      multiInstance: multiInstance
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.createRxDatabaseStorageInstance = createRxDatabaseStorageInstance;

/**
 * removes all internal docs of a given collection
 * @return resolves all known collection-versions
 */
var _removeAllOfCollection = function _removeAllOfCollection(rxDatabase, collectionName) {
  try {
    return Promise.resolve((0, _rxDatabaseInternalStore.getAllCollectionDocuments)(rxDatabase.internalStore)).then(function (docs) {
      var relevantDocs = docs.filter(function (colDoc) {
        return colDoc.data.name === collectionName;
      });
      var writeRows = relevantDocs.map(function (doc) {
        var writeDoc = (0, _rxStorageHelper.flatCloneDocWithMeta)(doc);
        writeDoc._deleted = true;
        writeDoc._rev = (0, _util.createRevision)(writeDoc, doc);
        return {
          previous: doc,
          document: writeDoc
        };
      });
      return rxDatabase.internalStore.bulkWrite(writeRows, 'rx-database-remove-collection-all').then(function () {
        return relevantDocs;
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports._removeAllOfCollection = _removeAllOfCollection;

/**
 * stores the used database names
 * so we can throw when the same database is created more then once.
 */
var USED_DATABASE_NAMES = new Set();
var DB_COUNT = 0;

var RxDatabaseBase = /*#__PURE__*/function () {
  function RxDatabaseBase(name,
  /**
   * Uniquely identifies the instance
   * of this RxDatabase.
   */
  token, storage, instanceCreationOptions, password, multiInstance) {
    var eventReduce = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;
    var options = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
    var
    /**
     * Stores information documents about the collections of the database
     */
    internalStore = arguments.length > 8 ? arguments[8] : undefined;
    var cleanupPolicy = arguments.length > 9 ? arguments[9] : undefined;
    this.idleQueue = new _customIdleQueue.IdleQueue();
    this._subs = [];
    this.destroyed = false;
    this.collections = {};
    this.eventBulks$ = new _rxjs.Subject();
    this.observable$ = this.eventBulks$.pipe((0, _operators.mergeMap)(function (changeEventBulk) {
      return changeEventBulk.events;
    }));
    this.storageToken = _util.PROMISE_RESOLVE_FALSE;
    this.storageTokenDocument = _util.PROMISE_RESOLVE_FALSE;
    this.emittedEventBulkIds = new _obliviousSet.ObliviousSet(60 * 1000);
    this.name = name;
    this.token = token;
    this.storage = storage;
    this.instanceCreationOptions = instanceCreationOptions;
    this.password = password;
    this.multiInstance = multiInstance;
    this.eventReduce = eventReduce;
    this.options = options;
    this.internalStore = internalStore;
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
      this.internalStore = (0, _rxStorageHelper.getWrappedStorageInstance)(this.asRxDatabase, internalStore, _rxDatabaseInternalStore.INTERNAL_STORE_SCHEMA);
      /**
       * Start writing the storage token.
       * Do not await the creation because it would run
       * in a critical path that increases startup time.
       */

      this.storageTokenDocument = (0, _rxDatabaseInternalStore.ensureStorageTokenDocumentExists)(this.asRxDatabase);
      this.storageToken = this.storageTokenDocument.then(function (doc) {
        return doc.data.token;
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

    this.emittedEventBulkIds.add(changeEventBulk.id); // emit into own stream

    this.eventBulks$.next(changeEventBulk);
  }
  /**
   * removes the collection-doc from the internalStore
   */
  ;

  _proto.removeCollectionDoc = function removeCollectionDoc(name, schema) {
    try {
      var _this2 = this;

      return Promise.resolve((0, _rxStorageHelper.getSingleDocument)(_this2.internalStore, (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(_collectionNamePrimary(name, schema), _rxDatabaseInternalStore.INTERNAL_CONTEXT_COLLECTION))).then(function (doc) {
        if (!doc) {
          throw (0, _rxError.newRxError)('SNH', {
            name: name,
            schema: schema
          });
        }

        var writeDoc = (0, _rxStorageHelper.flatCloneDocWithMeta)(doc);
        writeDoc._deleted = true;
        writeDoc._rev = (0, _util.createRevision)(writeDoc, doc);
        return Promise.resolve(_this2.internalStore.bulkWrite([{
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
      var _this4 = this;

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
        var schema = (0, _rxSchema.createRxSchema)(rxJsonSchema);
        schemas[collectionName] = schema; // crypt=true but no password given

        if (schema.crypt && !_this4.password) {
          throw (0, _rxError.newRxError)('DB7', {
            name: name
          });
        } // collection already exists


        if (_this4.collections[name]) {
          throw (0, _rxError.newRxError)('DB3', {
            name: name
          });
        }

        var collectionNameWithVersion = _collectionNamePrimary(name, rxJsonSchema);

        var collectionDocData = {
          id: (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(collectionNameWithVersion, _rxDatabaseInternalStore.INTERNAL_CONTEXT_COLLECTION),
          key: collectionNameWithVersion,
          context: _rxDatabaseInternalStore.INTERNAL_CONTEXT_COLLECTION,
          data: {
            name: collectionName,
            schemaHash: schema.hash,
            schema: schema.jsonSchema,
            version: schema.version
          },
          _deleted: false,
          _meta: (0, _util.getDefaultRxDocumentMeta)(),
          _rev: (0, _util.getDefaultRevision)(),
          _attachments: {}
        };
        collectionDocData._rev = (0, _util.createRevision)(collectionDocData);
        bulkPutDocs.push({
          document: collectionDocData
        });
        var useArgs = Object.assign({}, args, {
          name: collectionName,
          schema: schema,
          database: _this4
        }); // run hooks

        var hookData = (0, _util.flatClone)(args);
        hookData.database = _this4;
        hookData.name = name;
        (0, _hooks.runPluginHooks)('preCreateRxCollection', hookData);
        useArgsByCollectionName[collectionName] = useArgs;
      });
      return Promise.resolve(_this4.internalStore.bulkWrite(bulkPutDocs, 'rx-database-add-collection')).then(function (putDocsResult) {
        Object.entries(putDocsResult.error).forEach(function (_ref2) {
          var _id = _ref2[0],
              error = _ref2[1];
          var docInDb = (0, _util.ensureNotFalsy)(error.documentInDb);
          var collectionName = docInDb.data.name;
          var schema = schemas[collectionName]; // collection already exists but has different schema

          if (docInDb.data.schemaHash !== schema.hash) {
            throw (0, _rxError.newRxError)('DB6', {
              database: _this4.name,
              collection: collectionName,
              previousSchemaHash: docInDb.data.schemaHash,
              schemaHash: schema.hash,
              previousSchema: docInDb.data.schema,
              schema: (0, _util.ensureNotFalsy)(jsonSchemas[collectionName])
            });
          }
        });
        var ret = {};
        return Promise.resolve(Promise.all(Object.keys(collectionCreators).map(function (collectionName) {
          try {
            var useArgs = useArgsByCollectionName[collectionName];
            return Promise.resolve((0, _rxCollection.createRxCollection)(useArgs)).then(function (collection) {
              ret[collectionName] = collection; // set as getter to the database

              _this4.collections[collectionName] = collection;

              if (!_this4[collectionName]) {
                Object.defineProperty(_this4, collectionName, {
                  get: function get() {
                    return _this4.collections[collectionName];
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
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * delete all data of the collection and its previous versions
   */
  ;

  _proto.removeCollection = function removeCollection(collectionName) {
    var _this5 = this;

    var destroyPromise = _util.PROMISE_RESOLVE_VOID;

    if (this.collections[collectionName]) {
      destroyPromise = this.collections[collectionName].destroy();
    } // remove schemas from internal db


    return destroyPromise.then(function () {
      return _removeAllOfCollection(_this5, collectionName);
    }) // get all relevant pouchdb-instances
    .then(function (knownVersions) {
      return Promise.all(knownVersions.map(function (knownVersionDoc) {
        return (0, _rxCollectionHelper.createRxCollectionStorageInstance)(_this5.asRxDatabase, {
          databaseInstanceToken: _this5.token,
          databaseName: _this5.name,
          collectionName: collectionName,
          schema: knownVersionDoc.data.schema,
          options: _this5.instanceCreationOptions,
          multiInstance: _this5.multiInstance
        });
      }));
    }) // remove the storage instance
    .then(function (storageInstances) {
      return Promise.all(storageInstances.map(function (instance) {
        return instance.remove();
      }));
    }).then(function () {
      return (0, _hooks.runAsyncPluginHooks)('postRemoveRxCollection', {
        storage: _this5.storage,
        databaseName: _this5.name,
        collectionName: collectionName
      });
    }).then(function () {});
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
   * @param _decrypted
   * When true, all encrypted values will be decrypted.
   */
  ;

  _proto.exportJSON = function exportJSON(_collections) {
    throw (0, _util.pluginMissing)('json-dump');
  }
  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<db>.exportJSON()` method.
   * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
   * since data could be encrypted.
   */
  ;

  _proto.importJSON = function importJSON(_exportedJSON) {
    throw (0, _util.pluginMissing)('json-dump');
  }
  /**
   * spawn server
   */
  ;

  _proto.server = function server(_options) {
    throw (0, _util.pluginMissing)('server');
  };

  _proto.backup = function backup(_options) {
    throw (0, _util.pluginMissing)('backup');
  };

  _proto.leaderElector = function leaderElector() {
    throw (0, _util.pluginMissing)('leader-election');
  };

  _proto.isLeader = function isLeader() {
    throw (0, _util.pluginMissing)('leader-election');
  }
  /**
   * returns a promise which resolves when the instance becomes leader
   */
  ;

  _proto.waitForLeadership = function waitForLeadership() {
    throw (0, _util.pluginMissing)('leader-election');
  };

  _proto.migrationStates = function migrationStates() {
    throw (0, _util.pluginMissing)('migration');
  }
  /**
   * destroys the database-instance and all collections
   */
  ;

  _proto.destroy = function destroy() {
    try {
      var _this7 = this;

      if (_this7.destroyed) {
        return Promise.resolve(_util.PROMISE_RESOLVE_FALSE);
      } // settings destroyed = true must be the first thing to do.


      _this7.destroyed = true;
      return Promise.resolve((0, _hooks.runAsyncPluginHooks)('preDestroyRxDatabase', _this7)).then(function () {
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


        return _this7.name === 'pseudoInstance' ? _util.PROMISE_RESOLVE_FALSE : _this7.requestIdlePromise() // destroy all collections
        .then(function () {
          return Promise.all(Object.keys(_this7.collections).map(function (key) {
            return _this7.collections[key];
          }).map(function (col) {
            return col.destroy();
          }));
        }) // destroy internal storage instances
        .then(function () {
          return _this7.internalStore.close();
        }) // close broadcastChannel if exists
        .then(function () {
          return _this7.broadcastChannel ? _this7.broadcastChannel.close() : null;
        }) // remove combination from USED_COMBINATIONS-map
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

  (0, _createClass2["default"])(RxDatabaseBase, [{
    key: "$",
    get: function get() {
      return this.observable$;
    }
    /**
     * Set if multiInstance: true
     * This broadcast channel is used to send events to other instances like
     * other browser tabs or nodejs processes.
     * We transfer everything in EventBulks because sending many small events has been shown
     * to be performance expensive.
     * 
     * @deprecated The broadcast channel has been moved out of the RxDatabase and is part of the
     * RxStorage but only if it is needed there.
     * @see ./rx-storage-multiinstance.ts
     * 
     */

  }, {
    key: "broadcastChannel",
    get: function get() {
      var bcState = _rxStorageMultiinstance.BROADCAST_CHANNEL_BY_TOKEN.get(this.token);

      if (bcState) {
        return bcState.bc;
      }
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


exports.RxDatabaseBase = RxDatabaseBase;

function throwIfDatabaseNameUsed(name) {
  if (!USED_DATABASE_NAMES.has(name)) {
    return;
  } else {
    throw (0, _rxError.newRxError)('DB8', {
      name: name,
      link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
    });
  }
}
/**
 * returns the primary for a given collection-data
 * used in the internal pouchdb-instances
 */


function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}

function createRxDatabase(_ref3) {
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
      localDocuments = _ref3$localDocuments === void 0 ? false : _ref3$localDocuments;
  (0, _hooks.runPluginHooks)('preCreateRxDatabase', {
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

  if (password) {
    _overwritable.overwritable.validatePassword(password);
  } // check if combination already used


  if (!ignoreDuplicate) {
    throwIfDatabaseNameUsed(name);
  }

  USED_DATABASE_NAMES.add(name);
  var databaseInstanceToken = (0, _util.randomCouchString)(10);
  return createRxDatabaseStorageInstance(databaseInstanceToken, storage, name, instanceCreationOptions, multiInstance).then(function (storageInstance) {
    var rxDatabase = new RxDatabaseBase(name, databaseInstanceToken, storage, instanceCreationOptions, password, multiInstance, eventReduce, options, storageInstance, cleanupPolicy);
    return (0, _hooks.runAsyncPluginHooks)('createRxDatabase', {
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

function isRxDatabase(obj) {
  return obj instanceof RxDatabaseBase;
}

function dbCount() {
  return DB_COUNT;
}
//# sourceMappingURL=rx-database.js.map