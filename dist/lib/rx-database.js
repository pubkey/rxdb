"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDatabaseBase = void 0;
exports.createRxDatabase = createRxDatabase;
exports.createRxDatabaseStorageInstance = createRxDatabaseStorageInstance;
exports.dbCount = dbCount;
exports.ensureNoStartupErrors = ensureNoStartupErrors;
exports.isRxDatabase = isRxDatabase;
exports.isRxDatabaseFirstTimeInstantiated = isRxDatabaseFirstTimeInstantiated;
exports.removeRxDatabase = removeRxDatabase;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _customIdleQueue = require("custom-idle-queue");
var _utils = require("./plugins/utils");
var _rxError = require("./rx-error");
var _rxSchema = require("./rx-schema");
var _hooks = require("./hooks");
var _rxjs = require("rxjs");
var _operators = require("rxjs/operators");
var _rxCollection = require("./rx-collection");
var _rxStorageHelper = require("./rx-storage-helper");
var _obliviousSet = require("oblivious-set");
var _rxDatabaseInternalStore = require("./rx-database-internal-store");
var _rxCollectionHelper = require("./rx-collection-helper");
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
  token, storage, instanceCreationOptions, password, multiInstance, eventReduce = false, options = {},
  /**
   * Stores information documents about the collections of the database
   */
  internalStore, hashFunction, cleanupPolicy, allowSlowCount) {
    this.idleQueue = new _customIdleQueue.IdleQueue();
    this._subs = [];
    this.startupErrors = [];
    this.onDestroy = [];
    this.destroyed = false;
    this.collections = {};
    this.eventBulks$ = new _rxjs.Subject();
    this.observable$ = this.eventBulks$.pipe((0, _operators.mergeMap)(changeEventBulk => changeEventBulk.events));
    this.storageToken = _utils.PROMISE_RESOLVE_FALSE;
    this.storageTokenDocument = _utils.PROMISE_RESOLVE_FALSE;
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
      this.internalStore = (0, _rxStorageHelper.getWrappedStorageInstance)(this.asRxDatabase, internalStore, _rxDatabaseInternalStore.INTERNAL_STORE_SCHEMA);

      /**
       * Start writing the storage token.
       * Do not await the creation because it would run
       * in a critical path that increases startup time.
       *
       * Writing the token takes about 20 milliseconds
       * even on a fast adapter, so this is worth it.
       */
      this.storageTokenDocument = (0, _rxDatabaseInternalStore.ensureStorageTokenDocumentExists)(this.asRxDatabase).catch(err => this.startupErrors.push(err));
      this.storageToken = this.storageTokenDocument.then(doc => doc.data.token).catch(err => this.startupErrors.push(err));
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
  _proto.removeCollectionDoc = async function removeCollectionDoc(name, schema) {
    var doc = await (0, _rxStorageHelper.getSingleDocument)(this.internalStore, (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)((0, _rxDatabaseInternalStore._collectionNamePrimary)(name, schema), _rxDatabaseInternalStore.INTERNAL_CONTEXT_COLLECTION));
    if (!doc) {
      throw (0, _rxError.newRxError)('SNH', {
        name,
        schema
      });
    }
    var writeDoc = (0, _rxStorageHelper.flatCloneDocWithMeta)(doc);
    writeDoc._deleted = true;
    await this.internalStore.bulkWrite([{
      document: writeDoc,
      previous: doc
    }], 'rx-database-remove-collection');
  }

  /**
   * creates multiple RxCollections at once
   * to be much faster by saving db txs and doing stuff in bulk-operations
   * This function is not called often, but mostly in the critical path at the initial page load
   * So it must be as fast as possible.
   */;
  _proto.addCollections = async function addCollections(collectionCreators) {
    var jsonSchemas = {};
    var schemas = {};
    var bulkPutDocs = [];
    var useArgsByCollectionName = {};
    Object.entries(collectionCreators).forEach(([name, args]) => {
      var collectionName = name;
      var rxJsonSchema = args.schema;
      jsonSchemas[collectionName] = rxJsonSchema;
      var schema = (0, _rxSchema.createRxSchema)(rxJsonSchema);
      schemas[collectionName] = schema;

      // collection already exists
      if (this.collections[name]) {
        throw (0, _rxError.newRxError)('DB3', {
          name
        });
      }
      var collectionNameWithVersion = (0, _rxDatabaseInternalStore._collectionNamePrimary)(name, rxJsonSchema);
      var collectionDocData = {
        id: (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(collectionNameWithVersion, _rxDatabaseInternalStore.INTERNAL_CONTEXT_COLLECTION),
        key: collectionNameWithVersion,
        context: _rxDatabaseInternalStore.INTERNAL_CONTEXT_COLLECTION,
        data: {
          name: collectionName,
          schemaHash: schema.hash,
          schema: schema.jsonSchema,
          version: schema.version,
          connectedStorages: []
        },
        _deleted: false,
        _meta: (0, _utils.getDefaultRxDocumentMeta)(),
        _rev: (0, _utils.getDefaultRevision)(),
        _attachments: {}
      };
      bulkPutDocs.push({
        document: collectionDocData
      });
      var useArgs = Object.assign({}, args, {
        name: collectionName,
        schema,
        database: this
      });

      // run hooks
      var hookData = (0, _utils.flatClone)(args);
      hookData.database = this;
      hookData.name = name;
      (0, _hooks.runPluginHooks)('preCreateRxCollection', hookData);
      useArgs.conflictHandler = hookData.conflictHandler;
      useArgsByCollectionName[collectionName] = useArgs;
    });
    var putDocsResult = await this.internalStore.bulkWrite(bulkPutDocs, 'rx-database-add-collection');
    await ensureNoStartupErrors(this);
    Object.entries(putDocsResult.error).forEach(([_id, error]) => {
      if (error.status !== 409) {
        throw (0, _rxError.newRxError)('DB12', {
          database: this.name,
          writeError: error
        });
      }
      var docInDb = (0, _utils.ensureNotFalsy)(error.documentInDb);
      var collectionName = docInDb.data.name;
      var schema = schemas[collectionName];
      // collection already exists but has different schema
      if (docInDb.data.schemaHash !== schema.hash) {
        throw (0, _rxError.newRxError)('DB6', {
          database: this.name,
          collection: collectionName,
          previousSchemaHash: docInDb.data.schemaHash,
          schemaHash: schema.hash,
          previousSchema: docInDb.data.schema,
          schema: (0, _utils.ensureNotFalsy)(jsonSchemas[collectionName])
        });
      }
    });
    var ret = {};
    await Promise.all(Object.keys(collectionCreators).map(async collectionName => {
      var useArgs = useArgsByCollectionName[collectionName];
      var collection = await (0, _rxCollection.createRxCollection)(useArgs);
      ret[collectionName] = collection;

      // set as getter to the database
      this.collections[collectionName] = collection;
      if (!this[collectionName]) {
        Object.defineProperty(this, collectionName, {
          get: () => this.collections[collectionName]
        });
      }
    }));
    return ret;
  }

  /**
   * runs the given function between idleQueue-locking
   */;
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
    throw (0, _utils.pluginMissing)('json-dump');
  }

  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<db>.exportJSON()` method.
   * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
   * since data could be encrypted.
   */;
  _proto.importJSON = function importJSON(_exportedJSON) {
    throw (0, _utils.pluginMissing)('json-dump');
  };
  _proto.backup = function backup(_options) {
    throw (0, _utils.pluginMissing)('backup');
  };
  _proto.leaderElector = function leaderElector() {
    throw (0, _utils.pluginMissing)('leader-election');
  };
  _proto.isLeader = function isLeader() {
    throw (0, _utils.pluginMissing)('leader-election');
  }
  /**
   * returns a promise which resolves when the instance becomes leader
   */;
  _proto.waitForLeadership = function waitForLeadership() {
    throw (0, _utils.pluginMissing)('leader-election');
  };
  _proto.migrationStates = function migrationStates() {
    throw (0, _utils.pluginMissing)('migration');
  }

  /**
   * destroys the database-instance and all collections
   */;
  _proto.destroy = async function destroy() {
    if (this.destroyed) {
      return _utils.PROMISE_RESOLVE_FALSE;
    }

    // settings destroyed = true must be the first thing to do.
    this.destroyed = true;
    await (0, _hooks.runAsyncPluginHooks)('preDestroyRxDatabase', this);
    /**
     * Complete the event stream
     * to stop all subscribers who forgot to unsubscribe.
     */
    this.eventBulks$.complete();
    DB_COUNT--;
    this._subs.map(sub => sub.unsubscribe());

    /**
     * Destroying the pseudo instance will throw
     * because stulff is missing
     * TODO we should not need the pseudo instance on runtime.
     * we should generate the property list on build time.
     */
    if (this.name === 'pseudoInstance') {
      return _utils.PROMISE_RESOLVE_FALSE;
    }

    /**
     * First wait until the database is idle
     */
    return this.requestIdlePromise().then(() => Promise.all(this.onDestroy.map(fn => fn())))
    // destroy all collections
    .then(() => Promise.all(Object.keys(this.collections).map(key => this.collections[key]).map(col => col.destroy())))
    // destroy internal storage instances
    .then(() => this.internalStore.close())
    // remove combination from USED_COMBINATIONS-map
    .then(() => USED_DATABASE_NAMES.delete(this.name)).then(() => true);
  }

  /**
   * deletes the database and its stored data.
   * Returns the names of all removed collections.
   */;
  _proto.remove = function remove() {
    return this.destroy().then(() => removeRxDatabase(this.name, this.storage));
  };
  (0, _createClass2.default)(RxDatabaseBase, [{
    key: "$",
    get: function () {
      return this.observable$;
    }
  }, {
    key: "asRxDatabase",
    get: function () {
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
      name,
      link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
    });
  }
}

/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
async function createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, options, multiInstance, password) {
  var internalStore = await storage.createStorageInstance({
    databaseInstanceToken,
    databaseName,
    collectionName: _rxStorageHelper.INTERNAL_STORAGE_NAME,
    schema: _rxDatabaseInternalStore.INTERNAL_STORE_SCHEMA,
    options,
    multiInstance,
    password
  });
  return internalStore;
}
function createRxDatabase({
  storage,
  instanceCreationOptions,
  name,
  password,
  multiInstance = true,
  eventReduce = false,
  ignoreDuplicate = false,
  options = {},
  cleanupPolicy,
  allowSlowCount = false,
  localDocuments = false,
  hashFunction = _utils.defaultHashFunction
}) {
  (0, _hooks.runPluginHooks)('preCreateRxDatabase', {
    storage,
    instanceCreationOptions,
    name,
    password,
    multiInstance,
    eventReduce,
    ignoreDuplicate,
    options,
    localDocuments
  });
  // check if combination already used
  if (!ignoreDuplicate) {
    throwIfDatabaseNameUsed(name);
  }
  USED_DATABASE_NAMES.add(name);
  var databaseInstanceToken = (0, _utils.randomCouchString)(10);
  return createRxDatabaseStorageInstance(databaseInstanceToken, storage, name, instanceCreationOptions, multiInstance, password)
  /**
   * Creating the internal store might fail
   * if some RxStorage wrapper is used that does some checks
   * and then throw.
   * In that case we have to properly clean up the database.
   */.catch(err => {
    USED_DATABASE_NAMES.delete(name);
    throw err;
  }).then(storageInstance => {
    var rxDatabase = new RxDatabaseBase(name, databaseInstanceToken, storage, instanceCreationOptions, password, multiInstance, eventReduce, options, storageInstance, hashFunction, cleanupPolicy, allowSlowCount);
    return (0, _hooks.runAsyncPluginHooks)('createRxDatabase', {
      database: rxDatabase,
      creator: {
        storage,
        instanceCreationOptions,
        name,
        password,
        multiInstance,
        eventReduce,
        ignoreDuplicate,
        options,
        localDocuments
      }
    }).then(() => rxDatabase);
  });
}

/**
 * Removes the database and all its known data
 * with all known collections and all internal meta data.
 *
 * Returns the names of the removed collections.
 */
async function removeRxDatabase(databaseName, storage) {
  var databaseInstanceToken = (0, _utils.randomCouchString)(10);
  var dbInternalsStorageInstance = await createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, {}, false);
  var collectionDocs = await (0, _rxDatabaseInternalStore.getAllCollectionDocuments)(storage.statics, dbInternalsStorageInstance);
  var collectionNames = new Set();
  collectionDocs.forEach(doc => collectionNames.add(doc.data.name));
  var removedCollectionNames = Array.from(collectionNames);
  await Promise.all(removedCollectionNames.map(collectionName => (0, _rxCollectionHelper.removeCollectionStorages)(storage, dbInternalsStorageInstance, databaseInstanceToken, databaseName, collectionName)));
  await (0, _hooks.runAsyncPluginHooks)('postRemoveRxDatabase', {
    databaseName,
    storage
  });
  await dbInternalsStorageInstance.remove();
  return removedCollectionNames;
}
function isRxDatabase(obj) {
  return obj instanceof RxDatabaseBase;
}
function dbCount() {
  return DB_COUNT;
}

/**
 * Returns true if the given RxDatabase was the first
 * instance that was created on the storage with this name.
 *
 * Can be used for some optimizations because on the first instantiation,
 * we can assume that no data was written before.
 */
async function isRxDatabaseFirstTimeInstantiated(database) {
  var tokenDoc = await database.storageTokenDocument;
  return tokenDoc.data.instanceToken === database.token;
}

/**
 * For better performance some tasks run async
 * and are awaited later.
 * But we still have to ensure that there have been no errors
 * on database creation.
 */
async function ensureNoStartupErrors(rxDatabase) {
  await rxDatabase.storageToken;
  if (rxDatabase.startupErrors[0]) {
    throw rxDatabase.startupErrors[0];
  }
}
//# sourceMappingURL=rx-database.js.map