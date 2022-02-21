"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDatabaseBase = void 0;
exports._collectionNamePrimary = _collectionNamePrimary;
exports._removeAllOfCollection = exports._ensureStorageTokenExists = void 0;
exports.createRxDatabase = createRxDatabase;
exports.dbCount = dbCount;
exports.isRxDatabase = isRxDatabase;
exports.removeRxDatabase = void 0;
exports.writeToSocket = writeToSocket;

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _customIdleQueue = require("custom-idle-queue");

var _broadcastChannel = require("broadcast-channel");

var _util = require("./util");

var _rxError = require("./rx-error");

var _rxSchema = require("./rx-schema");

var _overwritable = require("./overwritable");

var _hooks = require("./hooks");

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _rxCollection = require("./rx-collection");

var _rxStorageHelper = require("./rx-storage-helper");

var _rxSchemaHelper = require("./rx-schema-helper");

var _rxCollectionHelper = require("./rx-collection-helper");

var _obliviousSet = require("oblivious-set");

/**
 * removes the database and all its known data
 */
var removeRxDatabase = function removeRxDatabase(databaseName, storage) {
  return Promise.resolve(createRxDatabaseStorageInstances(storage, databaseName, {}, false)).then(function (storageInstance) {
    return Promise.resolve((0, _rxStorageHelper.getAllDocuments)('collectionName', storage, storageInstance.internalStore)).then(function (docs) {
      return Promise.resolve(Promise.all(docs.map(function (colDoc) {
        try {
          var id = colDoc.collectionName;
          var schema = colDoc.schema;
          var split = id.split('-');
          var collectionName = split[0];
          var version = parseInt(split[1], 10);
          var primaryPath = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
          return Promise.resolve(Promise.all([storage.createStorageInstance({
            databaseName: databaseName,
            collectionName: collectionName,
            schema: (0, _rxSchemaHelper.getPseudoSchemaForVersion)(version, primaryPath),
            options: {},
            multiInstance: false
          }), storage.createKeyObjectStorageInstance({
            databaseName: databaseName,
            collectionName: (0, _rxCollectionHelper.getCollectionLocalInstanceName)(collectionName),
            options: {},
            multiInstance: false
          })])).then(function (_ref4) {
            var instance = _ref4[0],
                localInstance = _ref4[1];
            return Promise.resolve(Promise.all([instance.remove(), localInstance.remove()])).then(function () {});
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }))).then(function () {
        return Promise.all([storageInstance.internalStore.remove(), storageInstance.localDocumentsStore.remove()]);
      });
    });
  });
};

exports.removeRxDatabase = removeRxDatabase;

/**
 * do the async things for this database
 */
var prepare = function prepare(rxDatabase) {
  try {
    rxDatabase.localDocumentsStore = (0, _rxStorageHelper.getWrappedKeyObjectInstance)(rxDatabase, rxDatabase.internalLocalDocumentsStore);
    return Promise.resolve(_ensureStorageTokenExists(rxDatabase)).then(function (_ensureStorageTokenEx) {
      rxDatabase.storageToken = _ensureStorageTokenEx;
      var localDocsSub = rxDatabase.localDocumentsStore.changeStream().subscribe(function (eventBulk) {
        var changeEventBulk = {
          id: eventBulk.id,
          internal: false,
          storageToken: (0, _util.ensureNotFalsy)(rxDatabase.storageToken),
          events: eventBulk.events.map(function (ev) {
            return (0, _rxStorageHelper.storageChangeEventToRxChangeEvent)(true, ev);
          }),
          databaseToken: rxDatabase.token
        };
        rxDatabase.$emit(changeEventBulk);
      });

      rxDatabase._subs.push(localDocsSub);

      if (rxDatabase.multiInstance) {
        _prepareBroadcastChannel(rxDatabase);
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
var createRxDatabaseStorageInstances = function createRxDatabaseStorageInstances(storage, databaseName, options, multiInstance) {
  try {
    return Promise.resolve(storage.createStorageInstance({
      databaseName: databaseName,
      collectionName: _rxStorageHelper.INTERNAL_STORAGE_NAME,
      schema: (0, _rxSchemaHelper.getPseudoSchemaForVersion)(0, 'collectionName'),
      options: options,
      multiInstance: multiInstance
    })).then(function (internalStore) {
      return Promise.resolve(storage.createKeyObjectStorageInstance({
        databaseName: databaseName,
        collectionName: '',
        options: options,
        multiInstance: multiInstance
      })).then(function (localDocumentsStore) {
        return {
          internalStore: internalStore,
          localDocumentsStore: localDocumentsStore
        };
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * removes all internal docs of a given collection
 * @return resolves all known collection-versions
 */
var _removeAllOfCollection = function _removeAllOfCollection(rxDatabase, collectionName) {
  try {
    return Promise.resolve(rxDatabase.lockedRun(function () {
      return (0, _rxStorageHelper.getAllDocuments)('collectionName', rxDatabase.storage, rxDatabase.internalStore);
    })).then(function (docs) {
      var relevantDocs = docs.filter(function (doc) {
        var name = doc.collectionName.split('-')[0];
        return name === collectionName;
      });
      return Promise.all(relevantDocs.map(function (doc) {
        var writeDoc = (0, _util.flatClone)(doc);
        writeDoc._deleted = true;
        return rxDatabase.lockedRun(function () {
          return (0, _rxStorageHelper.writeSingle)(rxDatabase.internalStore, {
            previous: doc,
            document: writeDoc
          });
        });
      })).then(function () {
        return relevantDocs.map(function (doc) {
          return doc.version;
        });
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports._removeAllOfCollection = _removeAllOfCollection;

/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
var _ensureStorageTokenExists = function _ensureStorageTokenExists(rxDatabase) {
  try {
    var storageTokenDocumentId = 'storageToken';
    return Promise.resolve((0, _rxStorageHelper.findLocalDocument)(rxDatabase.localDocumentsStore, storageTokenDocumentId, false)).then(function (storageTokenDoc) {
      if (!storageTokenDoc) {
        var storageToken = (0, _util.randomCouchString)(10);
        return Promise.resolve(rxDatabase.localDocumentsStore.bulkWrite([{
          document: {
            _id: storageTokenDocumentId,
            value: storageToken,
            _deleted: false,
            _meta: (0, _util.getDefaultRxDocumentMeta)(),
            _attachments: {}
          }
        }])).then(function () {
          return storageToken;
        });
      } else {
        return storageTokenDoc.value;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * writes the changeEvent to the broadcastChannel
 */


exports._ensureStorageTokenExists = _ensureStorageTokenExists;

/**
 * stores the used database names
 * so we can throw when the same database is created more then once.
 */
var USED_DATABASE_NAMES = new Set();
var DB_COUNT = 0; // stores information about the collections

var RxDatabaseBase = /*#__PURE__*/function () {
  /**
   * Stores the local documents which are attached to this database.
   */
  function RxDatabaseBase(name, storage, instanceCreationOptions, password, multiInstance) {
    var eventReduce = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;
    var options = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
    var idleQueue = arguments.length > 7 ? arguments[7] : undefined;
    var
    /**
     * Stores information documents about the collections of the database
     */
    internalStore = arguments.length > 8 ? arguments[8] : undefined;
    var internalLocalDocumentsStore = arguments.length > 9 ? arguments[9] : undefined;
    var
    /**
     * Set if multiInstance: true
     * This broadcast channel is used to send events to other instances like
     * other browser tabs or nodejs processes.
     * We transfer everything in EventBulks because sending many small events has been shown
     * to be performance expensive.
     */
    broadcastChannel = arguments.length > 10 ? arguments[10] : undefined;
    this.localDocumentsStore = {};
    this.token = (0, _util.randomCouchString)(10);
    this._subs = [];
    this.destroyed = false;
    this.eventBulks$ = new _rxjs.Subject();
    this.observable$ = this.eventBulks$.pipe((0, _operators.mergeMap)(function (changeEventBulk) {
      return changeEventBulk.events;
    }));
    this.emittedEventBulkIds = new _obliviousSet.ObliviousSet(60 * 1000);
    this.name = name;
    this.storage = storage;
    this.instanceCreationOptions = instanceCreationOptions;
    this.password = password;
    this.multiInstance = multiInstance;
    this.eventReduce = eventReduce;
    this.options = options;
    this.idleQueue = idleQueue;
    this.internalStore = internalStore;
    this.internalLocalDocumentsStore = internalLocalDocumentsStore;
    this.broadcastChannel = broadcastChannel;
    this.collections = {};
    DB_COUNT++;
  }

  var _proto = RxDatabaseBase.prototype;

  /**
   * removes all internal collection-info
   * only use this if you have to upgrade from a major rxdb-version
   * do NEVER use this to change the schema of a collection
   */
  _proto.dangerousRemoveCollectionInfo = function dangerousRemoveCollectionInfo() {
    try {
      var _this2 = this;

      return Promise.resolve((0, _rxStorageHelper.getAllDocuments)('collectionName', _this2.storage, _this2.internalStore)).then(function (allDocs) {
        var writeData = allDocs.map(function (doc) {
          var deletedDoc = (0, _util.flatClone)(doc);
          deletedDoc._deleted = true;
          return {
            previous: doc,
            document: deletedDoc
          };
        });
        return Promise.resolve(_this2.internalStore.bulkWrite(writeData)).then(function () {});
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * This is the main handle-point for all change events
   * ChangeEvents created by this instance go:
   * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
   * ChangeEvents created by other instances go:
   * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
   */
  ;

  _proto.$emit = function $emit(changeEventBulk) {
    if (this.emittedEventBulkIds.has(changeEventBulk.id)) {
      return;
    }

    this.emittedEventBulkIds.add(changeEventBulk.id); // emit into own stream

    this.eventBulks$.next(changeEventBulk); // write to socket to inform other instances about the change

    writeToSocket(this, changeEventBulk);
  }
  /**
   * removes the collection-doc from the internalStore
   */
  ;

  _proto.removeCollectionDoc = function removeCollectionDoc(name, schema) {
    try {
      var _this4 = this;

      var docId = _collectionNamePrimary(name, schema);

      return Promise.resolve((0, _rxStorageHelper.getSingleDocument)(_this4.internalStore, docId)).then(function (doc) {
        if (!doc) {
          throw (0, _rxError.newRxError)('SNH', {
            name: name,
            schema: schema
          });
        }

        var writeDoc = (0, _util.flatClone)(doc);
        writeDoc._deleted = true;
        return Promise.resolve(_this4.lockedRun(function () {
          return _this4.internalStore.bulkWrite([{
            document: writeDoc,
            previous: doc
          }]);
        })).then(function () {});
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
      var _this6 = this;

      // get local management docs in bulk request
      return Promise.resolve(_this6.lockedRun(function () {
        return _this6.internalStore.findDocumentsById(Object.keys(collectionCreators).map(function (name) {
          var schema = collectionCreators[name].schema;
          return _collectionNamePrimary(name, schema);
        }), false);
      })).then(function (collectionDocs) {
        var internalDocByCollectionName = {};
        Object.entries(collectionDocs).forEach(function (_ref) {
          var key = _ref[0],
              doc = _ref[1];
          internalDocByCollectionName[key] = doc;
        });
        var schemaHashByName = {};
        return Promise.resolve(Promise.all(Object.entries(collectionCreators).map(function (_ref2) {
          var name = _ref2[0],
              args = _ref2[1];
          var useName = name;

          var internalDoc = internalDocByCollectionName[_collectionNamePrimary(name, collectionCreators[useName].schema)];

          var useArgs = (0, _util.flatClone)(args);
          useArgs.name = useName;
          var schema = (0, _rxSchema.createRxSchema)(args.schema);
          schemaHashByName[useName] = schema.hash;
          useArgs.schema = schema;
          useArgs.database = _this6; // TODO check if already exists and schema hash has changed
          // crypt=true but no password given

          if (schema.crypt && !_this6.password) {
            throw (0, _rxError.newRxError)('DB7', {
              name: name
            });
          } // collection already exists


          if (_this6.collections[name]) {
            throw (0, _rxError.newRxError)('DB3', {
              name: name
            });
          } // collection already exists but has different schema


          if (internalDoc && internalDoc.schemaHash !== schemaHashByName[useName]) {
            throw (0, _rxError.newRxError)('DB6', {
              name: name,
              previousSchemaHash: internalDoc.schemaHash,
              schemaHash: schemaHashByName[useName],
              previousSchema: internalDoc.schema,
              schema: args.schema
            });
          } // run hooks


          var hookData = (0, _util.flatClone)(args);
          hookData.database = _this6;
          hookData.name = name;
          (0, _hooks.runPluginHooks)('preCreateRxCollection', hookData);
          return (0, _rxCollection.createRxCollection)(useArgs);
        }))).then(function (collections) {
          var bulkPutDocs = [];
          var ret = {};
          collections.forEach(function (collection) {
            var name = collection.name;
            ret[name] = collection; // add to bulk-docs list

            var collectionName = _collectionNamePrimary(name, collectionCreators[name].schema);

            if (!internalDocByCollectionName[collectionName]) {
              bulkPutDocs.push({
                document: {
                  collectionName: collectionName,
                  schemaHash: schemaHashByName[name],
                  schema: collection.schema.normalized,
                  version: collection.schema.version,
                  _deleted: false,
                  _meta: (0, _util.getDefaultRxDocumentMeta)(),
                  _attachments: {}
                }
              });
            } // set as getter to the database


            _this6.collections[name] = collection;

            if (!_this6[name]) {
              Object.defineProperty(_this6, name, {
                get: function get() {
                  return _this6.collections[name];
                }
              });
            }
          }); // make a single write call to the storage instance

          var _temp = function () {
            if (bulkPutDocs.length > 0) {
              return Promise.resolve(_this6.lockedRun(function () {
                return _this6.internalStore.bulkWrite(bulkPutDocs);
              })).then(function () {});
            }
          }();

          return _temp && _temp.then ? _temp.then(function () {
            return ret;
          }) : ret;
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
    var _this7 = this;

    var destroyPromise = _util.PROMISE_RESOLVE_VOID;

    if (this.collections[collectionName]) {
      destroyPromise = this.collections[collectionName].destroy();
    } // remove schemas from internal db


    return destroyPromise.then(function () {
      return _removeAllOfCollection(_this7, collectionName);
    }) // get all relevant pouchdb-instances
    .then(function (knownVersions) {
      return Promise.all(knownVersions.map(function (v) {
        return (0, _rxCollectionHelper.createRxCollectionStorageInstances)(collectionName, _this7, {
          databaseName: _this7.name,
          collectionName: collectionName,
          schema: (0, _rxSchemaHelper.getPseudoSchemaForVersion)(v, 'collectionName'),
          options: _this7.instanceCreationOptions,
          multiInstance: _this7.multiInstance
        }, {});
      }));
    }) // remove normal and local documents
    .then(function (storageInstances) {
      return Promise.all(storageInstances.map(function (instance) {
        return Promise.all([instance.storageInstance.remove(), instance.localDocumentsStore.remove()]);
      }));
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

  _proto.exportJSON = function exportJSON() {
    var _decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    var _collections = arguments.length > 1 ? arguments[1] : undefined;

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
    var _this8 = this;

    if (this.destroyed) {
      return _util.PROMISE_RESOLVE_FALSE;
    } // settings destroyed = true must be the first thing to do.


    this.destroyed = true;
    (0, _hooks.runPluginHooks)('preDestroyRxDatabase', this);
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


    if (this.name === 'pseudoInstance') {
      return _util.PROMISE_RESOLVE_FALSE;
    } // first wait until db is idle


    return this.requestIdlePromise() // destroy all collections
    .then(function () {
      return Promise.all(Object.keys(_this8.collections).map(function (key) {
        return _this8.collections[key];
      }).map(function (col) {
        return col.destroy();
      }));
    }) // destroy internal storage instances
    .then(function () {
      return _this8.internalStore.close();
    }).then(function () {
      return _this8.localDocumentsStore.close();
    }) // close broadcastChannel if exists
    .then(function () {
      return _this8.broadcastChannel ? _this8.broadcastChannel.close() : null;
    }) // remove combination from USED_COMBINATIONS-map
    .then(function () {
      return USED_DATABASE_NAMES["delete"](_this8.name);
    }).then(function () {
      return true;
    });
  }
  /**
   * deletes the database and its stored data
   */
  ;

  _proto.remove = function remove() {
    var _this9 = this;

    return this.destroy().then(function () {
      return removeRxDatabase(_this9.name, _this9.storage);
    });
  };

  (0, _createClass2["default"])(RxDatabaseBase, [{
    key: "$",
    get: function get() {
      return this.observable$;
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

function writeToSocket(rxDatabase, changeEventBulk) {
  if (rxDatabase.destroyed) {
    return _util.PROMISE_RESOLVE_FALSE;
  }

  if (!rxDatabase.storage.statics.doesBroadcastChangestream() && rxDatabase.multiInstance && rxDatabase.broadcastChannel && !changeEventBulk.internal && rxDatabase.token === changeEventBulk.databaseToken && rxDatabase.storageToken === changeEventBulk.storageToken) {
    return rxDatabase.broadcastChannel.postMessage(changeEventBulk).then(function () {
      return true;
    });
  } else {
    return _util.PROMISE_RESOLVE_FALSE;
  }
}
/**
 * returns the primary for a given collection-data
 * used in the internal pouchdb-instances
 */


function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}

function _prepareBroadcastChannel(rxDatabase) {
  // listen to changes from other instances that come over the BroadcastChannel
  (0, _util.ensureNotFalsy)(rxDatabase.broadcastChannel).addEventListener('message', function (changeEventBulk) {
    if ( // not same storage-state
    changeEventBulk.storageToken !== rxDatabase.storageToken || // this db instance was sender
    changeEventBulk.databaseToken === rxDatabase.token) {
      return;
    }

    rxDatabase.$emit(changeEventBulk);
  });
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
      options = _ref3$options === void 0 ? {} : _ref3$options;
  (0, _hooks.runPluginHooks)('preCreateRxDatabase', {
    storage: storage,
    instanceCreationOptions: instanceCreationOptions,
    name: name,
    password: password,
    multiInstance: multiInstance,
    eventReduce: eventReduce,
    ignoreDuplicate: ignoreDuplicate,
    options: options
  });

  if (password) {
    _overwritable.overwritable.validatePassword(password);
  } // check if combination already used


  if (!ignoreDuplicate) {
    throwIfDatabaseNameUsed(name);
  }

  USED_DATABASE_NAMES.add(name);
  var broadcastChannel;

  if (multiInstance) {
    broadcastChannel = new _broadcastChannel.BroadcastChannel('RxDB:' + name + ':' + 'socket');
  }

  var idleQueue = new _customIdleQueue.IdleQueue();
  return createRxDatabaseStorageInstances(storage, name, instanceCreationOptions, multiInstance).then(function (storageInstances) {
    var rxDatabase = new RxDatabaseBase(name, storage, instanceCreationOptions, password, multiInstance, eventReduce, options, idleQueue, storageInstances.internalStore, storageInstances.localDocumentsStore, broadcastChannel);
    return prepare(rxDatabase).then(function () {
      return (0, _hooks.runAsyncPluginHooks)('createRxDatabase', rxDatabase);
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