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
exports.isDocumentDataWithoutRevisionEqual = isDocumentDataWithoutRevisionEqual;
exports.migrateDocumentData = migrateDocumentData;
exports.migrateOldCollection = migrateOldCollection;
exports.migratePromise = migratePromise;
exports.mustMigrate = mustMigrate;
exports.runStrategyIfNotNull = runStrategyIfNotNull;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _rxjs = require("rxjs");

var _deepEqual = _interopRequireDefault(require("deep-equal"));

var _util = require("../../util");

var _rxSchema = require("../../rx-schema");

var _rxError = require("../../rx-error");

var _hooks = require("../../hooks");

var _crypter = require("../../crypter");

var _migrationState = require("./migration-state");

var _operators = require("rxjs/operators");

var _rxStorageHelper = require("../../rx-storage-helper");

var _rxCollectionHelper = require("../../rx-collection-helper");

/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */

/**
 * TODO this should be completely rewritten because:
 * - The current implemetation does not use bulkDocs which is much faster
 * - This could have been done in much less code which would be easier to uderstand
 *
 */
var DataMigrator = /*#__PURE__*/function () {
  function DataMigrator(newestCollection, migrationStrategies) {
    this._migrated = false;
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
      // handled docs which successed
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
      var oldCols;
      return _getOldCollections(_this).then(function (ret) {
        oldCols = ret;
        var countAll = Promise.all(oldCols.map(function (oldCol) {
          return (0, _rxStorageHelper.countAllUndeleted)(oldCol.storageInstance);
        }));
        return countAll;
      }).then(function (countAll) {
        var totalCount = countAll.reduce(function (cur, prev) {
          return prev = cur + prev;
        }, 0);
        state.total = totalCount;
        stateSubject.next({
          collection: _this.newestCollection,
          state: (0, _util.flatClone)(state)
        });
        var currentCol = oldCols.shift();
        var currentPromise = _util.PROMISE_RESOLVE_VOID;

        var _loop = function _loop() {
          var migrationState$ = migrateOldCollection(currentCol, batchSize);
          currentPromise = currentPromise.then(function () {
            return new Promise(function (res) {
              var sub = migrationState$.subscribe(function (subState) {
                state.handled++;
                state[subState.type] = state[subState.type] + 1;
                state.percent = Math.round(state.handled / state.total * 100);
                stateSubject.next({
                  collection: _this.newestCollection,
                  state: (0, _util.flatClone)(state)
                });
              }, function (e) {
                sub.unsubscribe();
                stateSubject.error(e);
              }, function () {
                sub.unsubscribe();
                res();
              });
            });
          });
          currentCol = oldCols.shift();
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
          state: (0, _util.flatClone)(state)
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
          return _util.PROMISE_RESOLVE_FALSE;
        } else {
          return new Promise(function (res, rej) {
            var state$ = _this2.migrate(batchSize);

            state$.subscribe(null, rej, res);
          });
        }
      });
    }

    return this._migratePromise;
  };

  return DataMigrator;
}();

exports.DataMigrator = DataMigrator;

function createOldCollection(_x, _x2, _x3) {
  return _createOldCollection.apply(this, arguments);
}
/**
 * get an array with OldCollection-instances from all existing old storage-instances
 */


function _createOldCollection() {
  _createOldCollection = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(version, schemaObj, dataMigrator) {
    var database, schema, storageInstanceCreationParams, storageInstance, ret;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            database = dataMigrator.newestCollection.database;
            schema = (0, _rxSchema.createRxSchema)(schemaObj, false);
            storageInstanceCreationParams = {
              databaseName: database.name,
              collectionName: dataMigrator.newestCollection.name,
              schema: schemaObj,
              options: dataMigrator.newestCollection.instanceCreationOptions
            };
            (0, _hooks.runPluginHooks)('preCreateRxStorageInstance', storageInstanceCreationParams);
            _context.next = 6;
            return database.storage.createStorageInstance(storageInstanceCreationParams);

          case 6:
            storageInstance = _context.sent;
            ret = {
              version: version,
              dataMigrator: dataMigrator,
              newestCollection: dataMigrator.newestCollection,
              database: database,
              schema: (0, _rxSchema.createRxSchema)(schemaObj, false),
              storageInstance: storageInstance,
              _crypter: (0, _crypter.createCrypter)(database.password, schema)
            };
            return _context.abrupt("return", ret);

          case 9:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _createOldCollection.apply(this, arguments);
}

function _getOldCollections(_x4) {
  return _getOldCollections2.apply(this, arguments);
}
/**
 * returns true if a migration is needed
 */


function _getOldCollections2() {
  _getOldCollections2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(dataMigrator) {
    var oldColDocs;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return Promise.all((0, _rxSchema.getPreviousVersions)(dataMigrator.currentSchema.jsonSchema).map(function (v) {
              return (0, _rxStorageHelper.getSingleDocument)(dataMigrator.database.internalStore, dataMigrator.name + '-' + v);
            }).map(function (fun) {
              return fun["catch"](function () {
                return null;
              });
            }) // auto-catch so Promise.all continues
            );

          case 2:
            oldColDocs = _context2.sent;
            return _context2.abrupt("return", Promise.all(oldColDocs.map(function (colDoc) {
              if (!colDoc) {
                return null;
              }

              return createOldCollection(colDoc.schema.version, colDoc.schema, dataMigrator);
            }).filter(function (colDoc) {
              return colDoc !== null;
            })));

          case 4:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _getOldCollections2.apply(this, arguments);
}

function mustMigrate(dataMigrator) {
  if (dataMigrator.currentSchema.version === 0) {
    return _util.PROMISE_RESOLVE_FALSE;
  }

  return _getOldCollections(dataMigrator).then(function (oldCols) {
    if (oldCols.length === 0) return false;else return true;
  });
}

function runStrategyIfNotNull(oldCollection, version, docOrNull) {
  if (docOrNull === null) {
    return _util.PROMISE_RESOLVE_NULL;
  } else {
    var ret = oldCollection.dataMigrator.migrationStrategies[version](docOrNull, oldCollection);
    var retPromise = (0, _util.toPromise)(ret);
    return retPromise;
  }
}

function getBatchOfOldCollection(oldCollection, batchSize) {
  return (0, _rxStorageHelper.getBatch)(oldCollection.storageInstance, batchSize).then(function (docs) {
    return docs.map(function (doc) {
      doc = (0, _util.flatClone)(doc);
      doc = (0, _rxCollectionHelper._handleFromStorageInstance)(oldCollection, doc);
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
  var attachmentsBefore = (0, _util.flatClone)(docData._attachments);
  var mutateableDocData = (0, _util.clone)(docData);
  mutateableDocData._attachments = attachmentsBefore;
  var nextVersion = oldCollection.version + 1; // run the document throught migrationStrategies

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
      return _util.PROMISE_RESOLVE_NULL;
    } // check final schema


    try {
      oldCollection.newestCollection.schema.validate(doc);
    } catch (err) {
      var asRxError = err;
      throw (0, _rxError.newRxError)('DM2', {
        fromVersion: oldCollection.version,
        toVersion: oldCollection.newestCollection.schema.version,
        originalDoc: docData,
        finalDoc: doc,

        /**
         * pass down data from parent error,
         * to make it better understandable what did not work
         */
        errors: asRxError.parameters.errors,
        schema: asRxError.parameters.schema
      });
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
  return (0, _deepEqual["default"])(doc1NoRev, doc2NoRev);
}
/**
 * transform documents data and save them to the new collection
 * @return status-action with status and migrated document
 */


function _migrateDocuments(_x5, _x6) {
  return _migrateDocuments2.apply(this, arguments);
}
/**
 * deletes this.storageInstance and removes it from the database.collectionsCollection
 */


function _migrateDocuments2() {
  _migrateDocuments2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(oldCollection, documentsData) {
    var migratedDocuments, bulkWriteToStorageInput, actions, bulkDeleteInputData;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return Promise.all(documentsData.map(function (docData) {
              return (0, _hooks.runAsyncPluginHooks)('preMigrateDocument', {
                docData: docData,
                oldCollection: oldCollection
              });
            }));

          case 2:
            _context3.next = 4;
            return Promise.all(documentsData.map(function (docData) {
              return migrateDocumentData(oldCollection, docData);
            }));

          case 4:
            migratedDocuments = _context3.sent;
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
                var newHeight = (0, _util.getHeightOfRevision)(docData._rev) + 1;
                var newRevision = newHeight + '-' + (0, _util.createRevision)(migratedDocData, true);
                migratedDocData._rev = newRevision;
              }

              if (migratedDocData) {
                /**
                 * save to newest collection
                 * notice that this data also contains the attachments data
                 */
                var attachmentsBefore = migratedDocData._attachments;
                var saveData = (0, _rxCollectionHelper._handleToStorageInstance)(oldCollection.newestCollection, migratedDocData);
                saveData._attachments = attachmentsBefore;
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
              _context3.next = 11;
              break;
            }

            _context3.next = 11;
            return oldCollection.newestCollection.storageInstance.bulkAddRevisions(bulkWriteToStorageInput);

          case 11:
            _context3.next = 13;
            return Promise.all(actions.map(function (action) {
              return (0, _hooks.runAsyncPluginHooks)('postMigrateDocument', action);
            }));

          case 13:
            // remove the documents from the old collection storage instance
            bulkDeleteInputData = documentsData.map(function (docData) {
              var writeDeleted = (0, _util.flatClone)(docData);
              writeDeleted._deleted = true;
              return {
                previous: (0, _rxCollectionHelper._handleToStorageInstance)(oldCollection, docData),
                document: (0, _rxCollectionHelper._handleToStorageInstance)(oldCollection, writeDeleted)
              };
            });

            if (!bulkDeleteInputData.length) {
              _context3.next = 17;
              break;
            }

            _context3.next = 17;
            return oldCollection.storageInstance.bulkWrite(bulkDeleteInputData);

          case 17:
            return _context3.abrupt("return", actions);

          case 18:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
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