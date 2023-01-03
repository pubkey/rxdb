"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
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
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _rxjs = require("rxjs");
var _fastDeepEqual = _interopRequireDefault(require("fast-deep-equal"));
var _utils = require("../../plugins/utils");
var _rxSchema = require("../../rx-schema");
var _rxError = require("../../rx-error");
var _hooks = require("../../hooks");
var _migrationState = require("./migration-state");
var _operators = require("rxjs/operators");
var _rxStorageHelper = require("../../rx-storage-helper");
var _rxDatabaseInternalStore = require("../../rx-database-internal-store");
var _rxQueryHelper = require("../../rx-query-helper");
/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */
/**
 * TODO this should be completely rewritten because:
 * - This could have been done in much less code which would be easier to uderstand
 *
 */
var DataMigrator = /*#__PURE__*/function () {
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
  _proto.migrate = function migrate() {
    var _this = this;
    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
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
    (function () {
      return _getOldCollections(_this).then(function (ret) {
        _this.nonMigratedOldCollections = ret;
        _this.allOldCollections = _this.nonMigratedOldCollections.slice(0);
        var getAllDocuments = /*#__PURE__*/function () {
          var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(storageInstance, schema) {
            var storage, getAllQueryPrepared, queryResult, allDocs;
            return _regenerator["default"].wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  storage = _this.database.storage;
                  getAllQueryPrepared = storage.statics.prepareQuery(storageInstance.schema, (0, _rxQueryHelper.normalizeMangoQuery)(schema, {}));
                  _context.next = 4;
                  return storageInstance.query(getAllQueryPrepared);
                case 4:
                  queryResult = _context.sent;
                  allDocs = queryResult.documents;
                  return _context.abrupt("return", allDocs);
                case 7:
                case "end":
                  return _context.stop();
              }
            }, _callee);
          }));
          return function getAllDocuments(_x, _x2) {
            return _ref.apply(this, arguments);
          };
        }();
        var countAll = Promise.all(_this.nonMigratedOldCollections.map(function (oldCol) {
          return getAllDocuments(oldCol.storageInstance, oldCol.schema.jsonSchema).then(function (allDocs) {
            return allDocs.length;
          });
        }));
        return countAll;
      }).then(function (countAll) {
        var totalCount = countAll.reduce(function (cur, prev) {
          return prev = cur + prev;
        }, 0);
        state.total = totalCount;
        stateSubject.next({
          collection: _this.newestCollection,
          state: (0, _utils.flatClone)(state)
        });
        var currentCol = _this.nonMigratedOldCollections.shift();
        var currentPromise = _utils.PROMISE_RESOLVE_VOID;
        var _loop = function _loop() {
          var migrationState$ = migrateOldCollection(currentCol, batchSize);
          currentPromise = currentPromise.then(function () {
            return new Promise(function (res) {
              var sub = migrationState$.subscribe({
                next: function next(subState) {
                  state.handled++;
                  state[subState.type] = state[subState.type] + 1;
                  state.percent = Math.round(state.handled / state.total * 100);
                  stateSubject.next({
                    collection: _this.newestCollection,
                    state: (0, _utils.flatClone)(state)
                  });
                },
                error: function error(e) {
                  sub.unsubscribe();
                  // TODO we should not have to catch here.
                  _this.allOldCollections.forEach(function (c) {
                    return c.storageInstance.close()["catch"](function () {});
                  });
                  stateSubject.error(e);
                },
                complete: function complete() {
                  if (currentCol) {
                    // TODO we should not have to catch here.
                    currentCol.storageInstance.close()["catch"](function () {});
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
      }).then(function () {
        state.done = true;
        state.percent = 100;
        stateSubject.next({
          collection: _this.newestCollection,
          state: (0, _utils.flatClone)(state)
        });
        stateSubject.complete();
      });
    })();
    return stateSubject.pipe((0, _operators.map)(function (withCollection) {
      return withCollection.state;
    }));
  };
  _proto.migratePromise = function migratePromise(batchSize) {
    var _this2 = this;
    if (!this._migratePromise) {
      this._migratePromise = mustMigrate(this).then(function (must) {
        if (!must) {
          return _utils.PROMISE_RESOLVE_FALSE;
        } else {
          return new Promise(function (res, rej) {
            var state$ = _this2.migrate(batchSize);
            state$.subscribe(null, rej, res);
            _this2.allOldCollections.forEach(function (c) {
              return c.storageInstance.close()["catch"](function () {});
            });
          })["catch"](function (err) {
            _this2.allOldCollections.forEach(function (c) {
              return c.storageInstance.close()["catch"](function () {});
            });
            throw err;
          });
        }
      });
    }
    return this._migratePromise;
  };
  return DataMigrator;
}();
exports.DataMigrator = DataMigrator;
function createOldCollection(_x3, _x4, _x5) {
  return _createOldCollection.apply(this, arguments);
}
function _createOldCollection() {
  _createOldCollection = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(version, schemaObj, dataMigrator) {
    var database, storageInstanceCreationParams, storageInstance, ret;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          database = dataMigrator.newestCollection.database;
          storageInstanceCreationParams = {
            databaseInstanceToken: database.token,
            databaseName: database.name,
            collectionName: dataMigrator.newestCollection.name,
            schema: schemaObj,
            options: dataMigrator.newestCollection.instanceCreationOptions,
            multiInstance: database.multiInstance
          };
          (0, _hooks.runPluginHooks)('preCreateRxStorageInstance', storageInstanceCreationParams);
          _context2.next = 5;
          return database.storage.createStorageInstance(storageInstanceCreationParams);
        case 5:
          storageInstance = _context2.sent;
          ret = {
            version: version,
            dataMigrator: dataMigrator,
            newestCollection: dataMigrator.newestCollection,
            database: database,
            schema: (0, _rxSchema.createRxSchema)(schemaObj, false),
            storageInstance: storageInstance
          };
          ret.storageInstance = (0, _rxStorageHelper.getWrappedStorageInstance)(ret.database, storageInstance, schemaObj);
          return _context2.abrupt("return", ret);
        case 9:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _createOldCollection.apply(this, arguments);
}
function getOldCollectionDocs(dataMigrator) {
  var collectionDocKeys = (0, _rxSchema.getPreviousVersions)(dataMigrator.currentSchema.jsonSchema).map(function (version) {
    return dataMigrator.name + '-' + version;
  });
  return dataMigrator.database.internalStore.findDocumentsById(collectionDocKeys.map(function (key) {
    return (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(key, _rxDatabaseInternalStore.INTERNAL_CONTEXT_COLLECTION);
  }), false).then(function (docsObj) {
    return Object.values(docsObj);
  });
}

/**
 * get an array with OldCollection-instances from all existing old storage-instances
 */
function _getOldCollections(_x6) {
  return _getOldCollections2.apply(this, arguments);
}
/**
 * returns true if a migration is needed
 */
function _getOldCollections2() {
  _getOldCollections2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(dataMigrator) {
    var oldColDocs;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return getOldCollectionDocs(dataMigrator);
        case 2:
          oldColDocs = _context3.sent;
          return _context3.abrupt("return", Promise.all(oldColDocs.map(function (colDoc) {
            if (!colDoc) {
              return null;
            }
            return createOldCollection(colDoc.data.schema.version, colDoc.data.schema, dataMigrator);
          }).filter(function (colDoc) {
            return colDoc !== null;
          })));
        case 4:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _getOldCollections2.apply(this, arguments);
}
function mustMigrate(dataMigrator) {
  if (dataMigrator.currentSchema.version === 0) {
    return _utils.PROMISE_RESOLVE_FALSE;
  }
  return getOldCollectionDocs(dataMigrator).then(function (oldColDocs) {
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
  var _ref2;
  var storage = oldCollection.database.storage;
  var storageInstance = oldCollection.storageInstance;
  var preparedQuery = storage.statics.prepareQuery(storageInstance.schema, {
    selector: {},
    sort: [(_ref2 = {}, _ref2[oldCollection.schema.primaryPath] = 'asc', _ref2)],
    limit: batchSize,
    skip: 0
  });
  return storageInstance.query(preparedQuery).then(function (result) {
    return result.documents.map(function (doc) {
      doc = (0, _utils.flatClone)(doc);
      return doc;
    });
  });
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
  var _loop2 = function _loop2() {
    var version = nextVersion;
    currentPromise = currentPromise.then(function (docOrNull) {
      return runStrategyIfNotNull(oldCollection, version, docOrNull);
    });
    nextVersion++;
  };
  while (nextVersion <= oldCollection.newestCollection.schema.version) {
    _loop2();
  }
  return currentPromise.then(function (doc) {
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
  return (0, _fastDeepEqual["default"])(doc1NoRev, doc2NoRev);
}

/**
 * transform documents data and save them to the new collection
 * @return status-action with status and migrated document
 */
function _migrateDocuments(_x7, _x8) {
  return _migrateDocuments2.apply(this, arguments);
}
/**
 * deletes this.storageInstance and removes it from the database.collectionsCollection
 */
function _migrateDocuments2() {
  _migrateDocuments2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(oldCollection, documentsData) {
    var migratedDocuments, bulkWriteToStorageInput, actions, originalStorageInstance, bulkDeleteInputData;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return Promise.all(documentsData.map(function (docData) {
            return (0, _hooks.runAsyncPluginHooks)('preMigrateDocument', {
              docData: docData,
              oldCollection: oldCollection
            });
          }));
        case 2:
          _context4.next = 4;
          return Promise.all(documentsData.map(function (docData) {
            return migrateDocumentData(oldCollection, docData);
          }));
        case 4:
          migratedDocuments = _context4.sent;
          bulkWriteToStorageInput = [];
          actions = [];
          documentsData.forEach(function (docData, idx) {
            var migratedDocData = migratedDocuments[idx];
            var action = {
              res: null,
              type: '',
              migrated: migratedDocData,
              doc: docData,
              oldCollection: oldCollection,
              newestCollection: oldCollection.newestCollection
            };
            actions.push(action);

            /**
             * Determiniticly handle the revision
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
          if (!bulkWriteToStorageInput.length) {
            _context4.next = 12;
            break;
          }
          /**
           * To ensure that we really keep that revision, we
           * hackly insert this document via the RxStorageInstance.originalStorageInstance
           * so that getWrappedStorageInstance() does not overwrite its own revision.
           */
          originalStorageInstance = oldCollection.newestCollection.storageInstance.originalStorageInstance;
          _context4.next = 12;
          return originalStorageInstance.bulkWrite(bulkWriteToStorageInput.map(function (document) {
            return {
              document: document
            };
          }), 'data-migrator-import');
        case 12:
          _context4.next = 14;
          return Promise.all(actions.map(function (action) {
            return (0, _hooks.runAsyncPluginHooks)('postMigrateDocument', action);
          }));
        case 14:
          // remove the documents from the old collection storage instance
          bulkDeleteInputData = documentsData.map(function (docData) {
            var writeDeleted = (0, _utils.flatClone)(docData);
            writeDeleted._deleted = true;
            writeDeleted._attachments = {};
            return {
              previous: docData,
              document: writeDeleted
            };
          });
          if (!bulkDeleteInputData.length) {
            _context4.next = 18;
            break;
          }
          _context4.next = 18;
          return oldCollection.storageInstance.bulkWrite(bulkDeleteInputData, 'data-migrator-delete');
        case 18:
          return _context4.abrupt("return", actions);
        case 19:
        case "end":
          return _context4.stop();
      }
    }, _callee4);
  }));
  return _migrateDocuments2.apply(this, arguments);
}
function deleteOldCollection(oldCollection) {
  return oldCollection.storageInstance.remove().then(function () {
    return oldCollection.database.removeCollectionDoc(oldCollection.dataMigrator.name, oldCollection.schema);
  });
}

/**
 * runs the migration on all documents and deletes the storage instance afterwards
 */
function migrateOldCollection(oldCollection) {
  var batchSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
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
  (function () {
    var error;
    var allBatchesDone = function allBatchesDone() {
      // remove this oldCollection
      return deleteOldCollection(oldCollection).then(function () {
        return observer.complete();
      });
    };
    var handleOneBatch = function handleOneBatch() {
      return getBatchOfOldCollection(oldCollection, batchSize).then(function (batch) {
        if (batch.length === 0) {
          allBatchesDone();
          return false;
        } else {
          return _migrateDocuments(oldCollection, batch).then(function (actions) {
            return actions.forEach(function (action) {
              return observer.next(action);
            });
          })["catch"](function (e) {
            return error = e;
          }).then(function () {
            return true;
          });
        }
      }).then(function (next) {
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
    oldCollection._migratePromise = new Promise(function (res, rej) {
      var state$ = migrateOldCollection(oldCollection, batchSize);
      state$.subscribe(null, rej, res);
    });
  }
  return oldCollection._migratePromise;
}
//# sourceMappingURL=data-migrator.js.map