import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";

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
import { Subject } from 'rxjs';
import deepEqual from 'deep-equal';
import { clone, toPromise, flatClone, getHeightOfRevision, createRevision, PROMISE_RESOLVE_VOID, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_NULL } from '../../util';
import { createRxSchema } from '../../rx-schema';
import { newRxError } from '../../rx-error';
import { runAsyncPluginHooks, runPluginHooks } from '../../hooks';
import { getPreviousVersions } from '../../rx-schema';
import { createCrypter } from '../../crypter';
import { getMigrationStateByDatabase } from './migration-state';
import { map } from 'rxjs/operators';
import { countAllUndeleted, getBatch, getSingleDocument } from '../../rx-storage-helper';
import { _handleFromStorageInstance, _handleToStorageInstance } from '../../rx-collection-helper';
export var DataMigrator = /*#__PURE__*/function () {
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
      throw newRxError('DM1');
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
    var stateSubject = new Subject();
    /**
     * Add to output of RxDatabase.migrationStates
     */

    var allSubject = getMigrationStateByDatabase(this.newestCollection.database);
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
        var countAll = Promise.all(_this.nonMigratedOldCollections.map(function (oldCol) {
          return countAllUndeleted(oldCol.storageInstance);
        }));
        return countAll;
      }).then(function (countAll) {
        var totalCount = countAll.reduce(function (cur, prev) {
          return prev = cur + prev;
        }, 0);
        state.total = totalCount;
        stateSubject.next({
          collection: _this.newestCollection,
          state: flatClone(state)
        });

        var currentCol = _this.nonMigratedOldCollections.shift();

        var currentPromise = PROMISE_RESOLVE_VOID;

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
                  state: flatClone(state)
                });
              }, function (e) {
                sub.unsubscribe();

                _this.allOldCollections.forEach(function (c) {
                  return c.storageInstance.close();
                });

                stateSubject.error(e);
              }, function () {
                if (currentCol) {
                  currentCol.storageInstance.close();
                }

                sub.unsubscribe();
                res();
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
          state: flatClone(state)
        });
        stateSubject.complete();
      });
    })();

    return stateSubject.pipe(map(function (withCollection) {
      return withCollection.state;
    }));
  };

  _proto.migratePromise = function migratePromise(batchSize) {
    var _this2 = this;

    if (!this._migratePromise) {
      this._migratePromise = mustMigrate(this).then(function (must) {
        if (!must) {
          return PROMISE_RESOLVE_FALSE;
        } else {
          return new Promise(function (res, rej) {
            var state$ = _this2.migrate(batchSize);

            state$.subscribe(null, rej, res);

            _this2.allOldCollections.forEach(function (c) {
              return c.storageInstance.close();
            });
          })["catch"](function (err) {
            _this2.allOldCollections.forEach(function (c) {
              return c.storageInstance.close();
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
export function createOldCollection(_x, _x2, _x3) {
  return _createOldCollection.apply(this, arguments);
}

function _createOldCollection() {
  _createOldCollection = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(version, schemaObj, dataMigrator) {
    var database, schema, storageInstanceCreationParams, storageInstance, ret;
    return _regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            database = dataMigrator.newestCollection.database;
            schema = createRxSchema(schemaObj, false);
            storageInstanceCreationParams = {
              databaseName: database.name,
              collectionName: dataMigrator.newestCollection.name,
              schema: schemaObj,
              options: dataMigrator.newestCollection.instanceCreationOptions
            };
            runPluginHooks('preCreateRxStorageInstance', storageInstanceCreationParams);
            _context.next = 6;
            return database.storage.createStorageInstance(storageInstanceCreationParams);

          case 6:
            storageInstance = _context.sent;
            ret = {
              version: version,
              dataMigrator: dataMigrator,
              newestCollection: dataMigrator.newestCollection,
              database: database,
              schema: createRxSchema(schemaObj, false),
              storageInstance: storageInstance,
              _crypter: createCrypter(database.password, schema)
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

export function getOldCollectionDocs(_x4) {
  return _getOldCollectionDocs.apply(this, arguments);
}
/**
 * get an array with OldCollection-instances from all existing old storage-instances
 */

function _getOldCollectionDocs() {
  _getOldCollectionDocs = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(dataMigrator) {
    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            return _context2.abrupt("return", Promise.all(getPreviousVersions(dataMigrator.currentSchema.jsonSchema).map(function (v) {
              return getSingleDocument(dataMigrator.database.internalStore, dataMigrator.name + '-' + v);
            }).map(function (fun) {
              return fun["catch"](function () {
                return null;
              });
            }) // auto-catch so Promise.all continues
            ).then(function (oldCollectionDocs) {
              return oldCollectionDocs.filter(function (d) {
                return !!d;
              });
            }));

          case 1:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _getOldCollectionDocs.apply(this, arguments);
}

export function _getOldCollections(_x5) {
  return _getOldCollections2.apply(this, arguments);
}
/**
 * returns true if a migration is needed
 */

function _getOldCollections2() {
  _getOldCollections2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(dataMigrator) {
    var oldColDocs;
    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return getOldCollectionDocs(dataMigrator);

          case 2:
            oldColDocs = _context3.sent;
            return _context3.abrupt("return", Promise.all(oldColDocs.map(function (colDoc) {
              if (!colDoc) {
                return null;
              }

              return createOldCollection(colDoc.schema.version, colDoc.schema, dataMigrator);
            }).filter(function (colDoc) {
              return colDoc !== null;
            })));

          case 4:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _getOldCollections2.apply(this, arguments);
}

export function mustMigrate(dataMigrator) {
  if (dataMigrator.currentSchema.version === 0) {
    return PROMISE_RESOLVE_FALSE;
  }

  return getOldCollectionDocs(dataMigrator).then(function (oldColDocs) {
    if (oldColDocs.length === 0) {
      return false;
    } else {
      return true;
    }
  });
}
export function runStrategyIfNotNull(oldCollection, version, docOrNull) {
  if (docOrNull === null) {
    return PROMISE_RESOLVE_NULL;
  } else {
    var ret = oldCollection.dataMigrator.migrationStrategies[version](docOrNull, oldCollection);
    var retPromise = toPromise(ret);
    return retPromise;
  }
}
export function getBatchOfOldCollection(oldCollection, batchSize) {
  return getBatch(oldCollection.storageInstance, batchSize).then(function (docs) {
    return docs.map(function (doc) {
      doc = flatClone(doc);
      doc = _handleFromStorageInstance(oldCollection, doc);
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

export function migrateDocumentData(oldCollection, docData) {
  /**
   * We cannot deep-clone Blob or Buffer
   * so we just flat clone it here
   * and attach it to the deep cloned document data.
   */
  var attachmentsBefore = flatClone(docData._attachments);
  var mutateableDocData = clone(docData);
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
      return PROMISE_RESOLVE_NULL;
    } // check final schema


    try {
      oldCollection.newestCollection.schema.validate(doc);
    } catch (err) {
      var asRxError = err;
      throw newRxError('DM2', {
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
export function isDocumentDataWithoutRevisionEqual(doc1, doc2) {
  var doc1NoRev = Object.assign({}, doc1, {
    _attachments: undefined,
    _rev: undefined
  });
  var doc2NoRev = Object.assign({}, doc2, {
    _attachments: undefined,
    _rev: undefined
  });
  return deepEqual(doc1NoRev, doc2NoRev);
}
/**
 * transform documents data and save them to the new collection
 * @return status-action with status and migrated document
 */

export function _migrateDocuments(_x6, _x7) {
  return _migrateDocuments2.apply(this, arguments);
}
/**
 * deletes this.storageInstance and removes it from the database.collectionsCollection
 */

function _migrateDocuments2() {
  _migrateDocuments2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(oldCollection, documentsData) {
    var migratedDocuments, bulkWriteToStorageInput, actions, bulkDeleteInputData;
    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return Promise.all(documentsData.map(function (docData) {
              return runAsyncPluginHooks('preMigrateDocument', {
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
                var newHeight = getHeightOfRevision(docData._rev) + 1;
                var newRevision = newHeight + '-' + createRevision(migratedDocData, true);
                migratedDocData._rev = newRevision;
              }

              if (migratedDocData) {
                /**
                 * save to newest collection
                 * notice that this data also contains the attachments data
                 */
                var attachmentsBefore = migratedDocData._attachments;

                var saveData = _handleToStorageInstance(oldCollection.newestCollection, migratedDocData);

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
              _context4.next = 11;
              break;
            }

            _context4.next = 11;
            return oldCollection.newestCollection.storageInstance.bulkAddRevisions(bulkWriteToStorageInput);

          case 11:
            _context4.next = 13;
            return Promise.all(actions.map(function (action) {
              return runAsyncPluginHooks('postMigrateDocument', action);
            }));

          case 13:
            // remove the documents from the old collection storage instance
            bulkDeleteInputData = documentsData.map(function (docData) {
              var writeDeleted = flatClone(docData);
              writeDeleted._deleted = true;
              return {
                previous: _handleToStorageInstance(oldCollection, docData),
                document: _handleToStorageInstance(oldCollection, writeDeleted)
              };
            });

            if (!bulkDeleteInputData.length) {
              _context4.next = 17;
              break;
            }

            _context4.next = 17;
            return oldCollection.storageInstance.bulkWrite(bulkDeleteInputData);

          case 17:
            return _context4.abrupt("return", actions);

          case 18:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _migrateDocuments2.apply(this, arguments);
}

export function deleteOldCollection(oldCollection) {
  return oldCollection.storageInstance.remove().then(function () {
    return oldCollection.database.removeCollectionDoc(oldCollection.dataMigrator.name, oldCollection.schema);
  });
}
/**
 * runs the migration on all documents and deletes the storage instance afterwards
 */

export function migrateOldCollection(oldCollection) {
  var batchSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;

  if (oldCollection._migrate) {
    // already running
    throw newRxError('DM3');
  }

  oldCollection._migrate = true;
  var observer = new Subject();
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
export function migratePromise(oldCollection, batchSize) {
  if (!oldCollection._migratePromise) {
    oldCollection._migratePromise = new Promise(function (res, rej) {
      var state$ = migrateOldCollection(oldCollection, batchSize);
      state$.subscribe(null, rej, res);
    });
  }

  return oldCollection._migratePromise;
}
//# sourceMappingURL=data-migrator.js.map