"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DataMigrator = void 0;
exports._getOldCollections = _getOldCollections;
exports._migrateDocuments = _migrateDocuments;
exports.createOldCollection = createOldCollection;
exports.deleteOldCollection = deleteOldCollection;
exports.getBatchOfOldCollection = getBatchOfOldCollection;
exports.getOldCollectionDocs = getOldCollectionDocs;
exports.isDocumentDataWithoutRevisionEqual = isDocumentDataWithoutRevisionEqual;
exports.migrateDocumentData = migrateDocumentData;
exports.migrateOldCollection = migrateOldCollection;
exports.migratePromise = migratePromise;
exports.mustMigrate = mustMigrate;
exports.runStrategyIfNotNull = runStrategyIfNotNull;
var _rxjs = require("rxjs");
var _utils = require("../../plugins/utils");
var _rxSchema = require("../../rx-schema");
var _rxError = require("../../rx-error");
var _hooks = require("../../hooks");
var _migrationState = require("./migration-state");
var _operators = require("rxjs/operators");
var _rxStorageHelper = require("../../rx-storage-helper");
var _rxDatabaseInternalStore = require("../../rx-database-internal-store");
var _rxQueryHelper = require("../../rx-query-helper");
var _overwritable = require("../../overwritable");
var _migrationHelpers = require("./migration-helpers");
/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */
/**
 * TODO this should be completely rewritten because:
 * - This could have been done in much less code which would be easier to understand
 *
 */
var DataMigrator = exports.DataMigrator = /*#__PURE__*/function () {
  function DataMigrator(newestCollection, migrationStrategies) {
    this._migrated = false;
    this.nonMigratedOldCollections = [];
    this.allOldCollections = [];
    this.newestCollection = newestCollection;
    this.migrationStrategies = migrationStrategies;
    this.currentSchema = newestCollection.schema;
    this.database = newestCollection.database;
    this.name = newestCollection.name;
  }
  var _proto = DataMigrator.prototype;
  _proto.migrate = function migrate(batchSize = _migrationHelpers.MIGRATION_DEFAULT_BATCH_SIZE) {
    var _this = this;
    if (this._migrated) {
      throw (0, _rxError.newRxError)('DM1');
    }
    this._migrated = true;
    var state = {
      done: false,
      // true if finished
      total: 0,
      // will be the doc-count
      handled: 0,
      // amount of handled docs
      success: 0,
      // handled docs which succeeded
      deleted: 0,
      // handled docs which got deleted
      percent: 0 // percentage
    };

    var stateSubject = new _rxjs.Subject();

    /**
     * Add to output of RxDatabase.migrationStates
     */
    var allSubject = (0, _migrationState.getMigrationStateByDatabase)(this.newestCollection.database);
    var allList = allSubject.getValue().slice(0);
    allList.push(stateSubject.asObservable());
    allSubject.next(allList);

    /**
     * TODO this is a side-effect which might throw
     * We did this because it is not possible to create new Observer(async(...))
     * @link https://github.com/ReactiveX/rxjs/issues/4074
     * In the future the whole migration plugin should be rewritten without rxjs
     * so we do not have this problem.
     */
    (() => {
      return _getOldCollections(this).then(ret => {
        this.nonMigratedOldCollections = ret;
        this.allOldCollections = this.nonMigratedOldCollections.slice(0);
        var storage = this.database.storage;
        async function countAllDocuments(storageInstance, schema) {
          var getAllQueryPrepared = storage.statics.prepareQuery(storageInstance.schema, (0, _rxQueryHelper.normalizeMangoQuery)(schema, {}));
          var queryResult = await storageInstance.count(getAllQueryPrepared);
          return queryResult.count;
        }
        var countAll = Promise.all(this.nonMigratedOldCollections.map(oldCol => countAllDocuments(oldCol.storageInstance, oldCol.schema.jsonSchema)));
        return countAll;
      }).then(countAll => {
        var totalCount = countAll.reduce((cur, prev) => prev = cur + prev, 0);
        state.total = totalCount;
        stateSubject.next({
          collection: this.newestCollection,
          state: (0, _utils.flatClone)(state)
        });
        var currentCol = this.nonMigratedOldCollections.shift();
        var currentPromise = _utils.PROMISE_RESOLVE_VOID;
        var _loop = function () {
          var migrationState$ = migrateOldCollection(currentCol, batchSize);
          currentPromise = currentPromise.then(() => {
            return new Promise(res => {
              var sub = migrationState$.subscribe({
                next: subState => {
                  state.handled++;
                  state[subState.type] = state[subState.type] + 1;
                  state.percent = Math.round(state.handled / state.total * 100);
                  stateSubject.next({
                    collection: _this.newestCollection,
                    state: (0, _utils.flatClone)(state)
                  });
                },
                error: e => {
                  sub.unsubscribe();
                  // TODO we should not have to catch here.
                  _this.allOldCollections.forEach(c => c.storageInstance.close().catch(() => {}));
                  stateSubject.error(e);
                },
                complete: () => {
                  if (currentCol) {
                    // TODO we should not have to catch here.
                    currentCol.storageInstance.close().catch(() => {});
                  }
                  sub.unsubscribe();
                  res();
                }
              });
            });
          });
          currentCol = _this.nonMigratedOldCollections.shift();
        };
        while (currentCol) {
          _loop();
        }
        return currentPromise;
      }).then(() => {
        state.done = true;
        state.percent = 100;
        stateSubject.next({
          collection: this.newestCollection,
          state: (0, _utils.flatClone)(state)
        });
        stateSubject.complete();
      });
    })();
    return stateSubject.pipe((0, _operators.map)(withCollection => withCollection.state));
  };
  _proto.migratePromise = function migratePromise(batchSize) {
    if (!this._migratePromise) {
      this._migratePromise = mustMigrate(this).then(must => {
        if (!must) {
          return _utils.PROMISE_RESOLVE_FALSE;
        } else {
          return new Promise((res, rej) => {
            var state$ = this.migrate(batchSize);
            state$.subscribe(null, rej, res);
            this.allOldCollections.forEach(c => c.storageInstance.close().catch(() => {}));
          }).catch(err => {
            this.allOldCollections.forEach(c => c.storageInstance.close().catch(() => {}));
            throw err;
          });
        }
      });
    }
    return this._migratePromise;
  };
  return DataMigrator;
}();
async function createOldCollection(version, schemaObj, dataMigrator) {
  var database = dataMigrator.newestCollection.database;
  var storageInstanceCreationParams = {
    databaseInstanceToken: database.token,
    databaseName: database.name,
    collectionName: dataMigrator.newestCollection.name,
    schema: schemaObj,
    options: dataMigrator.newestCollection.instanceCreationOptions,
    multiInstance: database.multiInstance,
    devMode: _overwritable.overwritable.isDevMode()
  };
  (0, _hooks.runPluginHooks)('preCreateRxStorageInstance', storageInstanceCreationParams);
  var storageInstance = await database.storage.createStorageInstance(storageInstanceCreationParams);
  var ret = {
    version,
    dataMigrator,
    newestCollection: dataMigrator.newestCollection,
    database,
    schema: (0, _rxSchema.createRxSchema)(schemaObj, database.hashFunction, false),
    storageInstance
  };
  ret.storageInstance = (0, _rxStorageHelper.getWrappedStorageInstance)(ret.database, storageInstance, schemaObj);
  return ret;
}
function getOldCollectionDocs(dataMigrator) {
  var collectionDocKeys = (0, _rxSchema.getPreviousVersions)(dataMigrator.currentSchema.jsonSchema).map(version => dataMigrator.name + '-' + version);
  return dataMigrator.database.internalStore.findDocumentsById(collectionDocKeys.map(key => (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(key, _rxDatabaseInternalStore.INTERNAL_CONTEXT_COLLECTION)), false).then(docsObj => Object.values(docsObj));
}

/**
 * get an array with OldCollection-instances from all existing old storage-instances
 */
async function _getOldCollections(dataMigrator) {
  var oldColDocs = await getOldCollectionDocs(dataMigrator);
  return Promise.all(oldColDocs.map(colDoc => {
    if (!colDoc) {
      return null;
    }
    return createOldCollection(colDoc.data.schema.version, colDoc.data.schema, dataMigrator);
  }).filter(colDoc => colDoc !== null));
}

/**
 * returns true if a migration is needed
 */
function mustMigrate(dataMigrator) {
  if (dataMigrator.currentSchema.version === 0) {
    return _utils.PROMISE_RESOLVE_FALSE;
  }
  return getOldCollectionDocs(dataMigrator).then(oldColDocs => {
    if (oldColDocs.length === 0) {
      return false;
    } else {
      return true;
    }
  });
}
function runStrategyIfNotNull(oldCollection, version, docOrNull) {
  if (docOrNull === null) {
    return _utils.PROMISE_RESOLVE_NULL;
  } else {
    var ret = oldCollection.dataMigrator.migrationStrategies[version](docOrNull, oldCollection);
    var retPromise = (0, _utils.toPromise)(ret);
    return retPromise;
  }
}
function getBatchOfOldCollection(oldCollection, batchSize) {
  var storage = oldCollection.database.storage;
  var storageInstance = oldCollection.storageInstance;
  var preparedQuery = storage.statics.prepareQuery(storageInstance.schema, {
    selector: {},
    sort: [{
      [oldCollection.schema.primaryPath]: 'asc'
    }],
    limit: batchSize,
    skip: 0
  });
  return storageInstance.query(preparedQuery).then(result => result.documents.map(doc => {
    doc = (0, _utils.flatClone)(doc);
    return doc;
  }));
}

/**
 * runs the doc-data through all following migrationStrategies
 * so it will match the newest schema.
 * @throws Error if final doc does not match final schema or migrationStrategy crashes
 * @return final object or null if migrationStrategy deleted it
 */
function migrateDocumentData(oldCollection, docData) {
  /**
   * We cannot deep-clone Blob or Buffer
   * so we just flat clone it here
   * and attach it to the deep cloned document data.
   */
  var attachmentsBefore = (0, _utils.flatClone)(docData._attachments);
  var mutateableDocData = (0, _utils.clone)(docData);
  mutateableDocData._attachments = attachmentsBefore;
  var nextVersion = oldCollection.version + 1;

  // run the document through migrationStrategies
  var currentPromise = Promise.resolve(mutateableDocData);
  var _loop2 = function () {
    var version = nextVersion;
    currentPromise = currentPromise.then(docOrNull => runStrategyIfNotNull(oldCollection, version, docOrNull));
    nextVersion++;
  };
  while (nextVersion <= oldCollection.newestCollection.schema.version) {
    _loop2();
  }
  return currentPromise.then(doc => {
    if (doc === null) {
      return _utils.PROMISE_RESOLVE_NULL;
    }

    /**
     * Add _meta field if missing.
     * We need this to migration documents from pre-12.0.0 state
     * to version 12.0.0. Therefore we need to add the _meta field if it is missing.
     * TODO remove this in the major version 13.0.0
     */
    if (!doc._meta) {
      doc._meta = (0, _utils.getDefaultRxDocumentMeta)();
    }
    return doc;
  });
}
function isDocumentDataWithoutRevisionEqual(doc1, doc2) {
  var doc1NoRev = Object.assign({}, doc1, {
    _attachments: undefined,
    _rev: undefined
  });
  var doc2NoRev = Object.assign({}, doc2, {
    _attachments: undefined,
    _rev: undefined
  });
  return (0, _utils.deepEqual)(doc1NoRev, doc2NoRev);
}

/**
 * transform documents data and save them to the new collection
 * @return status-action with status and migrated document
 */
async function _migrateDocuments(oldCollection, documentsData) {
  /**
   * Required in case the hooks mutate the document
   * data which would then wrongly cause conflicts
   * because we would send the mutated document
   * as writeRow.previous.
   */
  var previousDocumentData = (0, _utils.clone)(documentsData);

  // run hooks that might mutate documentsData
  await Promise.all(documentsData.map(docData => (0, _hooks.runAsyncPluginHooks)('preMigrateDocument', {
    docData,
    oldCollection
  })));
  // run the migration strategies on each document
  var migratedDocuments = await Promise.all(documentsData.map(docData => migrateDocumentData(oldCollection, docData)));
  var bulkWriteToStorageInput = [];
  var actions = [];
  documentsData.forEach((docData, idx) => {
    var migratedDocData = migratedDocuments[idx];
    var action = {
      res: null,
      type: '',
      migrated: migratedDocData,
      doc: docData,
      oldCollection,
      newestCollection: oldCollection.newestCollection
    };
    actions.push(action);

    /**
     * Deterministically handle the revision
     * so migrating the same data on multiple instances
     * will result in the same output.
     */
    if (isDocumentDataWithoutRevisionEqual(docData, migratedDocData)) {
      /**
       * Data not changed by migration strategies, keep the same revision.
       * This ensures that other replicated instances that did not migrate already
       * will still have the same document.
       */
      migratedDocData._rev = docData._rev;
    } else if (migratedDocData !== null) {
      /**
       * data changed, increase revision height
       * so replicating instances use our new document data
       */
      migratedDocData._rev = (0, _utils.createRevision)(oldCollection.newestCollection.database.token, docData);
    }
    if (migratedDocData) {
      /**
       * save to newest collection
       * notice that this data also contains the attachments data
       */
      var attachmentsBefore = migratedDocData._attachments;
      var saveData = migratedDocData;
      saveData._attachments = attachmentsBefore;
      saveData._meta.lwt = (0, _utils.now)();
      bulkWriteToStorageInput.push(saveData);
      action.res = saveData;
      action.type = 'success';
    } else {
      /**
       * Migration strategy returned null
       * which means we should not migrate this document,
       * just drop it.
       */
      action.type = 'deleted';
    }
  });

  /**
   * Write the documents to the newest collection.
   * We need to add as revision
   * because we provide the _rev by our own
   * to have deterministic revisions in case the migration
   * runs on multiple nodes which must lead to the equal storage state.
   */
  if (bulkWriteToStorageInput.length) {
    /**
     * To ensure that we really keep that revision, we
     * hackly insert this document via the RxStorageInstance.originalStorageInstance
     * so that getWrappedStorageInstance() does not overwrite its own revision.
     */
    var originalStorageInstance = oldCollection.newestCollection.storageInstance.originalStorageInstance;
    await originalStorageInstance.bulkWrite(bulkWriteToStorageInput.map(document => ({
      document
    })), 'data-migrator-import');
  }

  // run hooks
  await Promise.all(actions.map(action => (0, _hooks.runAsyncPluginHooks)('postMigrateDocument', action)));

  // remove the documents from the old collection storage instance
  var bulkDeleteInputData = documentsData.map((docData, idx) => {
    var writeDeleted = (0, _utils.flatClone)(docData);
    writeDeleted._deleted = true;
    writeDeleted._attachments = {};
    return {
      previous: previousDocumentData[idx],
      document: writeDeleted
    };
  });
  if (bulkDeleteInputData.length) {
    await oldCollection.storageInstance.bulkWrite(bulkDeleteInputData, 'data-migrator-delete');
  }
  return actions;
}

/**
 * deletes this.storageInstance and removes it from the database.collectionsCollection
 */
function deleteOldCollection(oldCollection) {
  return oldCollection.storageInstance.remove().then(() => oldCollection.database.removeCollectionDoc(oldCollection.dataMigrator.name, oldCollection.schema));
}

/**
 * runs the migration on all documents and deletes the storage instance afterwards
 */
function migrateOldCollection(oldCollection, batchSize = _migrationHelpers.MIGRATION_DEFAULT_BATCH_SIZE) {
  if (oldCollection._migrate) {
    // already running
    throw (0, _rxError.newRxError)('DM3');
  }
  oldCollection._migrate = true;
  var observer = new _rxjs.Subject();

  /**
   * TODO this is a side-effect which might throw
   * @see DataMigrator.migrate()
   */
  (() => {
    var error;
    var allBatchesDone = () => {
      // remove this oldCollection
      return deleteOldCollection(oldCollection).then(() => observer.complete());
    };
    var handleOneBatch = () => {
      return getBatchOfOldCollection(oldCollection, batchSize).then(batch => {
        if (batch.length === 0) {
          allBatchesDone();
          return false;
        } else {
          return _migrateDocuments(oldCollection, batch).then(actions => actions.forEach(action => observer.next(action))).catch(e => error = e).then(() => true);
        }
      }).then(next => {
        if (!next) {
          return;
        }
        if (error) {
          observer.error(error);
        } else {
          handleOneBatch();
        }
      });
    };
    handleOneBatch();
  })();
  return observer.asObservable();
}
function migratePromise(oldCollection, batchSize) {
  if (!oldCollection._migratePromise) {
    oldCollection._migratePromise = new Promise((res, rej) => {
      var state$ = migrateOldCollection(oldCollection, batchSize);
      state$.subscribe(null, rej, res);
    });
  }
  return oldCollection._migratePromise;
}
//# sourceMappingURL=data-migrator.js.map