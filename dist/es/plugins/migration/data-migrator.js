/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */

/**
 * TODO this should be completely rewritten because:
 * - The current implemetation does not use pouchdb'S bulkDocs which is much faster
 * - This could have been done in much less code which would be easier to uderstand
 *
 */
import { Subject } from 'rxjs';
import { countAllUndeleted, getBatch } from '../../pouch-db';
import { clone, toPromise, flatClone } from '../../util';
import { createRxSchema } from '../../rx-schema';
import { newRxError } from '../../rx-error';
import { overwritable } from '../../overwritable';
import { runPluginHooks, runAsyncPluginHooks } from '../../hooks';
import { getPreviousVersions } from '../../rx-schema';
import { createCrypter } from '../../crypter';
import { _handleToPouch, _handleFromPouch } from '../../rx-collection-helper';
export var DataMigrator = /*#__PURE__*/function () {
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
    if (this._migrated) throw newRxError('DM1');
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
    var observer = new Subject();
    /**
     * TODO this is a side-effect which might throw
     * We did this because it is not possible to create new Observer(async(...))
     * @link https://github.com/ReactiveX/rxjs/issues/4074
     */

    (function () {
      var oldCols;
      return _getOldCollections(_this).then(function (ret) {
        oldCols = ret;
        var countAll = Promise.all(oldCols.map(function (oldCol) {
          return countAllUndeleted(oldCol.pouchdb);
        }));
        return countAll;
      }).then(function (countAll) {
        var totalCount = countAll.reduce(function (cur, prev) {
          return prev = cur + prev;
        }, 0);
        state.total = totalCount;
        observer.next(flatClone(state));
        var currentCol = oldCols.shift();
        var currentPromise = Promise.resolve();

        var _loop = function _loop() {
          var migrationState$ = migrateOldCollection(currentCol, batchSize);
          currentPromise = currentPromise.then(function () {
            return new Promise(function (res) {
              var sub = migrationState$.subscribe(function (subState) {
                state.handled++;
                state[subState.type] = state[subState.type] + 1;
                state.percent = Math.round(state.handled / state.total * 100);
                observer.next(flatClone(state));
              }, function (e) {
                sub.unsubscribe();
                observer.error(e);
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
        observer.next(flatClone(state));
        observer.complete();
      });
    })();

    return observer.asObservable();
  };

  _proto.migratePromise = function migratePromise(batchSize) {
    var _this2 = this;

    if (!this._migratePromise) {
      this._migratePromise = mustMigrate(this).then(function (must) {
        if (!must) return Promise.resolve(false);else return new Promise(function (res, rej) {
          var state$ = _this2.migrate(batchSize);

          state$.subscribe(null, rej, res);
        });
      });
    }

    return this._migratePromise;
  };

  return DataMigrator;
}();
export function createOldCollection(version, schemaObj, dataMigrator) {
  var database = dataMigrator.newestCollection.database;
  var schema = createRxSchema(schemaObj, false);
  var ret = {
    version: version,
    dataMigrator: dataMigrator,
    newestCollection: dataMigrator.newestCollection,
    database: database,
    schema: createRxSchema(schemaObj, false),
    pouchdb: database._spawnPouchDB(dataMigrator.newestCollection.name, version, dataMigrator.newestCollection.pouchSettings),
    _crypter: createCrypter(database.password, schema)
  };

  if (schema.doKeyCompression()) {
    ret._keyCompressor = overwritable.createKeyCompressor(schema);
  }

  return ret;
}
/**
 * get an array with OldCollection-instances from all existing old pouchdb-instance
 */

export function _getOldCollections(dataMigrator) {
  return Promise.all(getPreviousVersions(dataMigrator.currentSchema.jsonSchema).map(function (v) {
    return dataMigrator.database.internalStore.get(dataMigrator.name + '-' + v);
  }).map(function (fun) {
    return fun["catch"](function () {
      return null;
    });
  }) // auto-catch so Promise.all continues
  ).then(function (oldColDocs) {
    return oldColDocs.filter(function (colDoc) {
      return colDoc !== null;
    }).map(function (colDoc) {
      return createOldCollection(colDoc.schema.version, colDoc.schema, dataMigrator);
    });
  });
}
/**
 * returns true if a migration is needed
 */

export function mustMigrate(dataMigrator) {
  if (dataMigrator.currentSchema.version === 0) {
    return Promise.resolve(false);
  }

  return _getOldCollections(dataMigrator).then(function (oldCols) {
    if (oldCols.length === 0) return false;else return true;
  });
}
export function createDataMigrator(newestCollection, migrationStrategies) {
  return new DataMigrator(newestCollection, migrationStrategies);
}
export function _runStrategyIfNotNull(oldCollection, version, docOrNull) {
  if (docOrNull === null) {
    return Promise.resolve(null);
  } else {
    var ret = oldCollection.dataMigrator.migrationStrategies[version](docOrNull);
    var retPromise = toPromise(ret);
    return retPromise;
  }
}
export function getBatchOfOldCollection(oldCollection, batchSize) {
  return getBatch(oldCollection.pouchdb, batchSize).then(function (docs) {
    return docs.map(function (doc) {
      return _handleFromPouch(oldCollection, doc);
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
  docData = clone(docData);
  var nextVersion = oldCollection.version + 1; // run the document throught migrationStrategies

  var currentPromise = Promise.resolve(docData);

  var _loop2 = function _loop2() {
    var version = nextVersion;
    currentPromise = currentPromise.then(function (docOrNull) {
      return _runStrategyIfNotNull(oldCollection, version, docOrNull);
    });
    nextVersion++;
  };

  while (nextVersion <= oldCollection.newestCollection.schema.version) {
    _loop2();
  }

  return currentPromise.then(function (doc) {
    if (doc === null) return Promise.resolve(null); // check final schema

    try {
      oldCollection.newestCollection.schema.validate(doc);
    } catch (e) {
      throw newRxError('DM2', {
        fromVersion: oldCollection.version,
        toVersion: oldCollection.newestCollection.schema.version,
        finalDoc: doc
      });
    }

    return doc;
  });
}
/**
 * transform docdata and save to new collection
 * @return status-action with status and migrated document
 */

export function _migrateDocument(oldCollection, doc) {
  var action = {
    res: null,
    type: '',
    migrated: null,
    doc: doc,
    oldCollection: oldCollection,
    newestCollection: oldCollection.newestCollection
  };
  return migrateDocumentData(oldCollection, doc).then(function (migrated) {
    action.migrated = migrated;

    if (migrated) {
      runPluginHooks('preMigrateDocument', action); // save to newest collection

      delete migrated._rev;
      return oldCollection.newestCollection._pouchPut(migrated, true).then(function (res) {
        action.res = res;
        action.type = 'success';
        return runAsyncPluginHooks('postMigrateDocument', action);
      });
    } else action.type = 'deleted';
  }).then(function () {
    // remove from old collection
    return oldCollection.pouchdb.remove(_handleToPouch(oldCollection, doc))["catch"](function () {});
  }).then(function () {
    return action;
  });
}
/**
 * deletes this.pouchdb and removes it from the database.collectionsCollection
 */

export function deleteOldCollection(oldCollection) {
  return oldCollection.pouchdb.destroy().then(function () {
    return oldCollection.database.removeCollectionDoc(oldCollection.dataMigrator.name, oldCollection.schema);
  });
}
/**
 * runs the migration on all documents and deletes the pouchdb afterwards
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
          return Promise.all(batch.map(function (doc) {
            return _migrateDocument(oldCollection, doc).then(function (action) {
              return observer.next(action);
            });
          }))["catch"](function (e) {
            return error = e;
          }).then(function () {
            return true;
          });
        }
      }).then(function (next) {
        if (!next) return;
        if (error) observer.error(error);else handleOneBatch();
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