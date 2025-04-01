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
var _obliviousSet = require("oblivious-set");
var _index = require("./plugins/utils/index.js");
var _rxError = require("./rx-error.js");
var _rxSchema = require("./rx-schema.js");
var _hooks = require("./hooks.js");
var _rxjs = require("rxjs");
var _operators = require("rxjs/operators");
var _rxCollection = require("./rx-collection.js");
var _rxStorageHelper = require("./rx-storage-helper.js");
var _rxDatabaseInternalStore = require("./rx-database-internal-store.js");
var _rxCollectionHelper = require("./rx-collection-helper.js");
var _overwritable = require("./overwritable.js");
var _rxChangeEvent = require("./rx-change-event.js");
/**
 * stores the used database names+storage names
 * so we can throw when the same database is created more then once.
 */
var USED_DATABASE_NAMES = new Set();
var DATABASE_UNCLOSED_INSTANCE_PROMISE_MAP = new Map();
var DB_COUNT = 0;
var RxDatabaseBase = exports.RxDatabaseBase = /*#__PURE__*/function () {
  /**
   * Contains all known non-closed storage instances
   * that belong to this database.
   * Used in plugins and unit tests.
   */

  function RxDatabaseBase(name,
  /**
   * Uniquely identifies the instance
   * of this RxDatabase.
   */
  token, storage, instanceCreationOptions, password, multiInstance, eventReduce = false, options = {},
  /**
   * Stores information documents about the collections of the database
   */
  internalStore, hashFunction, cleanupPolicy, allowSlowCount, reactivity, onClosed) {
    this.idleQueue = new _customIdleQueue.IdleQueue();
    this.rxdbVersion = _index.RXDB_VERSION;
    this.storageInstances = new Set();
    this._subs = [];
    this.startupErrors = [];
    this.onClose = [];
    this.closed = false;
    this.collections = {};
    this.states = {};
    this.eventBulks$ = new _rxjs.Subject();
    this.closePromise = null;
    this.observable$ = this.eventBulks$.pipe((0, _operators.mergeMap)(changeEventBulk => (0, _rxChangeEvent.rxChangeEventBulkToRxChangeEvents)(changeEventBulk)));
    this.storageToken = _index.PROMISE_RESOLVE_FALSE;
    this.storageTokenDocument = _index.PROMISE_RESOLVE_FALSE;
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
    this.reactivity = reactivity;
    this.onClosed = onClosed;
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
  _proto.getReactivityFactory = function getReactivityFactory() {
    if (!this.reactivity) {
      throw (0, _rxError.newRxError)('DB14', {
        database: this.name
      });
    }
    return this.reactivity;
  }

  /**
   * Because having unhandled exceptions would fail,
   * we have to store the async errors of the constructor here
   * so we can throw them later.
   */

  /**
   * When the database is closed,
   * these functions will be called an awaited.
   * Used to automatically clean up stuff that
   * belongs to this collection.
   */

  /**
   * Internally only use eventBulks$
   * Do not use .$ or .observable$ because that has to transform
   * the events which decreases performance.
   */

  /**
   * Unique token that is stored with the data.
   * Used to detect if the dataset has been deleted
   * and if two RxDatabase instances work on the same dataset or not.
   *
   * Because reading and writing the storageToken runs in the hot path
   * of database creation, we do not await the storageWrites but instead
   * work with the promise when we need the value.
   */

  /**
   * Stores the whole state of the internal storage token document.
   * We need this in some plugins.
   */

  /**
   * Contains the ids of all event bulks that have been emitted
   * by the database.
   * Used to detect duplicates that come in again via BroadcastChannel
   * or other streams.
   * In the past we tried to remove this and to ensure
   * all storages only emit the same event bulks only once
   * but it turns out this is just not possible for all storages.
   * JavaScript processes, workers and browser tabs can be closed and started at any time
   * which can cause cases where it is not possible to know if an event bulk has been emitted already.
   */;
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
    await Promise.all(Object.entries(collectionCreators).map(async ([name, args]) => {
      var collectionName = name;
      var rxJsonSchema = args.schema;
      jsonSchemas[collectionName] = rxJsonSchema;
      var schema = (0, _rxSchema.createRxSchema)(rxJsonSchema, this.hashFunction);
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
          schemaHash: await schema.hash,
          schema: schema.jsonSchema,
          version: schema.version,
          connectedStorages: []
        },
        _deleted: false,
        _meta: (0, _index.getDefaultRxDocumentMeta)(),
        _rev: (0, _index.getDefaultRevision)(),
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
      var hookData = (0, _index.flatClone)(args);
      hookData.database = this;
      hookData.name = name;
      (0, _hooks.runPluginHooks)('preCreateRxCollection', hookData);
      useArgs.conflictHandler = hookData.conflictHandler;
      useArgsByCollectionName[collectionName] = useArgs;
    }));
    var putDocsResult = await this.internalStore.bulkWrite(bulkPutDocs, 'rx-database-add-collection');
    await ensureNoStartupErrors(this);
    await Promise.all(putDocsResult.error.map(async error => {
      if (error.status !== 409) {
        throw (0, _rxError.newRxError)('DB12', {
          database: this.name,
          writeError: error
        });
      }
      var docInDb = (0, _index.ensureNotFalsy)(error.documentInDb);
      var collectionName = docInDb.data.name;
      var schema = schemas[collectionName];
      // collection already exists but has different schema
      if (docInDb.data.schemaHash !== (await schema.hash)) {
        throw (0, _rxError.newRxError)('DB6', {
          database: this.name,
          collection: collectionName,
          previousSchemaHash: docInDb.data.schemaHash,
          schemaHash: await schema.hash,
          previousSchema: docInDb.data.schema,
          schema: (0, _index.ensureNotFalsy)(jsonSchemas[collectionName])
        });
      }
    }));
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
    throw (0, _index.pluginMissing)('json-dump');
  };
  _proto.addState = function addState(_name) {
    throw (0, _index.pluginMissing)('state');
  }

  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<db>.exportJSON()` method.
   * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
   * since data could be encrypted.
   */;
  _proto.importJSON = function importJSON(_exportedJSON) {
    throw (0, _index.pluginMissing)('json-dump');
  };
  _proto.backup = function backup(_options) {
    throw (0, _index.pluginMissing)('backup');
  };
  _proto.leaderElector = function leaderElector() {
    throw (0, _index.pluginMissing)('leader-election');
  };
  _proto.isLeader = function isLeader() {
    throw (0, _index.pluginMissing)('leader-election');
  }
  /**
   * returns a promise which resolves when the instance becomes leader
   */;
  _proto.waitForLeadership = function waitForLeadership() {
    throw (0, _index.pluginMissing)('leader-election');
  };
  _proto.migrationStates = function migrationStates() {
    throw (0, _index.pluginMissing)('migration-schema');
  }

  /**
   * closes the database-instance and all collections
   */;
  _proto.close = function close() {
    if (this.closePromise) {
      return this.closePromise;
    }
    var {
      promise,
      resolve
    } = createPromiseWithResolvers();
    var resolveClosePromise = result => {
      if (this.onClosed) {
        this.onClosed();
      }
      this.closed = true;
      resolve(result);
    };
    this.closePromise = promise;
    (async () => {
      await (0, _hooks.runAsyncPluginHooks)('preCloseRxDatabase', this);
      /**
       * Complete the event stream
       * to stop all subscribers who forgot to unsubscribe.
       */
      this.eventBulks$.complete();
      DB_COUNT--;
      this._subs.map(sub => sub.unsubscribe());

      /**
       * closing the pseudo instance will throw
       * because stuff is missing
       * TODO we should not need the pseudo instance on runtime.
       * we should generate the property list on build time.
       */
      if (this.name === 'pseudoInstance') {
        resolveClosePromise(false);
        return;
      }

      /**
       * First wait until the database is idle
       */
      return this.requestIdlePromise().then(() => Promise.all(this.onClose.map(fn => fn())))
      // close all collections
      .then(() => Promise.all(Object.keys(this.collections).map(key => this.collections[key]).map(col => col.close())))
      // close internal storage instances
      .then(() => this.internalStore.close()).then(() => resolveClosePromise(true));
    })();
    return promise;
  }

  /**
   * deletes the database and its stored data.
   * Returns the names of all removed collections.
   */;
  _proto.remove = function remove() {
    return this.close().then(() => removeRxDatabase(this.name, this.storage, this.multiInstance, this.password));
  };
  return (0, _createClass2.default)(RxDatabaseBase, [{
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
}();
/**
 * checks if an instance with same name and storage already exists
 * @throws {RxError} if used
 */
function throwIfDatabaseNameUsed(name, storage) {
  if (USED_DATABASE_NAMES.has(getDatabaseNameKey(name, storage))) {
    throw (0, _rxError.newRxError)('DB8', {
      name,
      storage: storage.name,
      link: 'https://rxdb.info/rx-database.html#ignoreduplicate'
    });
  }
}

/**
 * ponyfill for https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
 */
function createPromiseWithResolvers() {
  var resolve;
  var reject;
  var promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve,
    reject
  };
}
function getDatabaseNameKey(name, storage) {
  return storage.name + '|' + name;
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
    password,
    devMode: _overwritable.overwritable.isDevMode()
  });
  return internalStore;
}
function createRxDatabase({
  storage,
  instanceCreationOptions,
  name,
  password,
  multiInstance = true,
  eventReduce = true,
  ignoreDuplicate = false,
  options = {},
  cleanupPolicy,
  closeDuplicates = false,
  allowSlowCount = false,
  localDocuments = false,
  hashFunction = _index.defaultHashSha256,
  reactivity
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
  var databaseNameKey = getDatabaseNameKey(name, storage);
  var databaseNameKeyUnclosedInstancesSet = DATABASE_UNCLOSED_INSTANCE_PROMISE_MAP.get(databaseNameKey) || new Set();
  var instancePromiseWithResolvers = createPromiseWithResolvers();
  var closeDuplicatesPromises = Array.from(databaseNameKeyUnclosedInstancesSet);
  var onInstanceClosed = () => {
    databaseNameKeyUnclosedInstancesSet.delete(instancePromiseWithResolvers.promise);
    USED_DATABASE_NAMES.delete(databaseNameKey);
  };
  databaseNameKeyUnclosedInstancesSet.add(instancePromiseWithResolvers.promise);
  DATABASE_UNCLOSED_INSTANCE_PROMISE_MAP.set(databaseNameKey, databaseNameKeyUnclosedInstancesSet);
  (async () => {
    if (closeDuplicates) {
      await Promise.all(closeDuplicatesPromises.map(unclosedInstancePromise => unclosedInstancePromise.catch(() => null).then(instance => instance && instance.close())));
    }
    if (ignoreDuplicate) {
      if (!_overwritable.overwritable.isDevMode()) {
        throw (0, _rxError.newRxError)('DB9', {
          database: name
        });
      }
    } else {
      // check if combination already used
      throwIfDatabaseNameUsed(name, storage);
    }
    USED_DATABASE_NAMES.add(databaseNameKey);
    var databaseInstanceToken = (0, _index.randomToken)(10);
    var storageInstance = await createRxDatabaseStorageInstance(databaseInstanceToken, storage, name, instanceCreationOptions, multiInstance, password);
    var rxDatabase = new RxDatabaseBase(name, databaseInstanceToken, storage, instanceCreationOptions, password, multiInstance, eventReduce, options, storageInstance, hashFunction, cleanupPolicy, allowSlowCount, reactivity, onInstanceClosed);
    await (0, _hooks.runAsyncPluginHooks)('createRxDatabase', {
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
    });
    return rxDatabase;
  })().then(rxDatabase => {
    instancePromiseWithResolvers.resolve(rxDatabase);
  }).catch(err => {
    instancePromiseWithResolvers.reject(err);
    onInstanceClosed();
  });
  return instancePromiseWithResolvers.promise;
}

/**
 * Removes the database and all its known data
 * with all known collections and all internal meta data.
 *
 * Returns the names of the removed collections.
 */
async function removeRxDatabase(databaseName, storage, multiInstance = true, password) {
  var databaseInstanceToken = (0, _index.randomToken)(10);
  var dbInternalsStorageInstance = await createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, {}, multiInstance, password);
  var collectionDocs = await (0, _rxDatabaseInternalStore.getAllCollectionDocuments)(dbInternalsStorageInstance);
  var collectionNames = new Set();
  collectionDocs.forEach(doc => collectionNames.add(doc.data.name));
  var removedCollectionNames = Array.from(collectionNames);
  await Promise.all(removedCollectionNames.map(collectionName => (0, _rxCollectionHelper.removeCollectionStorages)(storage, dbInternalsStorageInstance, databaseInstanceToken, databaseName, collectionName, multiInstance, password)));
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