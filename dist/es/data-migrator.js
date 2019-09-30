import _createClass from "@babel/runtime/helpers/createClass";

/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */
import { countAllUndeleted, getBatch as _getBatch } from './pouch-db';
import { clone, toPromise } from './util';
import { createRxSchema } from './rx-schema';
import { newRxError } from './rx-error';
import overwritable from './overwritable';
import { runPluginHooks, runAsyncPluginHooks } from './hooks';
import { Subject } from 'rxjs';
import { create as createCrypter } from './crypter';
export var DataMigrator =
/*#__PURE__*/
function () {
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
        observer.next(clone(state));
        var currentCol = oldCols.shift();
        var currentPromise = Promise.resolve();

        var _loop = function _loop() {
          var migrationState$ = currentCol.migrate(batchSize);
          currentPromise = currentPromise.then(function () {
            return new Promise(function (res) {
              var sub = migrationState$.subscribe(function (subState) {
                state.handled++;
                state[subState.type] = state[subState.type] + 1;
                state.percent = Math.round(state.handled / state.total * 100);
                observer.next(clone(state));
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
        observer.next(clone(state));
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

          state$['subscribe'](null, rej, res);
        });
      });
    }

    return this._migratePromise;
  };

  return DataMigrator;
}();

var OldCollection =
/*#__PURE__*/
function () {
  function OldCollection(version, schemaObj, dataMigrator) {
    this.version = version;
    this.schemaObj = schemaObj;
    this.dataMigrator = dataMigrator;
    this.newestCollection = dataMigrator.newestCollection;
    this.database = dataMigrator.newestCollection.database;
  }

  var _proto2 = OldCollection.prototype;

  _proto2.getBatch = function getBatch(batchSize) {
    var _this3 = this;

    return _getBatch(this.pouchdb, batchSize).then(function (docs) {
      return docs.map(function (doc) {
        return _this3._handleFromPouch(doc);
      });
    });
  }
  /**
   * handles a document from the pouchdb-instance
   */
  ;

  _proto2._handleFromPouch = function _handleFromPouch(docData) {
    var data = clone(docData);
    data = this.schema.swapIdToPrimary(docData);
    if (this.schema.doKeyCompression()) data = this.keyCompressor.decompress(data);
    data = this.crypter.decrypt(data);
    return data;
  }
  /**
   * wrappers for Pouch.put/get to handle keycompression etc
   */
  ;

  _proto2._handleToPouch = function _handleToPouch(docData) {
    var data = clone(docData);
    data = this.crypter.encrypt(data);
    data = this.schema.swapPrimaryToId(data);
    if (this.schema.doKeyCompression()) data = this.keyCompressor.compress(data);
    return data;
  };

  _proto2._runStrategyIfNotNull = function _runStrategyIfNotNull(version, docOrNull) {
    if (docOrNull === null) return Promise.resolve(null);
    var ret = this.dataMigrator.migrationStrategies[version + ''](docOrNull);
    var retPromise = toPromise(ret);
    return retPromise;
  }
  /**
   * runs the doc-data through all following migrationStrategies
   * so it will match the newest schema.
   * @throws Error if final doc does not match final schema or migrationStrategy crashes
   * @return final object or null if migrationStrategy deleted it
   */
  ;

  _proto2.migrateDocumentData = function migrateDocumentData(docData) {
    var _this4 = this;

    docData = clone(docData);
    var nextVersion = this.version + 1; // run the document throught migrationStrategies

    var currentPromise = Promise.resolve(docData);

    var _loop2 = function _loop2() {
      var version = nextVersion;
      currentPromise = currentPromise.then(function (docOrNull) {
        return _this4._runStrategyIfNotNull(version, docOrNull);
      });
      nextVersion++;
    };

    while (nextVersion <= this.newestCollection.schema.version) {
      _loop2();
    }

    return currentPromise.then(function (doc) {
      if (doc === null) return Promise.resolve(null); // check final schema

      try {
        _this4.newestCollection.schema.validate(doc);
      } catch (e) {
        throw newRxError('DM2', {
          fromVersion: _this4.version,
          toVersion: _this4.newestCollection.schema.version,
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
  ;

  _proto2._migrateDocument = function _migrateDocument(doc) {
    var _this5 = this;

    var action = {
      res: null,
      type: '',
      migrated: null,
      doc: doc,
      oldCollection: this,
      newestCollection: this.newestCollection
    };
    return this.migrateDocumentData(doc).then(function (migrated) {
      action.migrated = migrated;

      if (migrated) {
        runPluginHooks('preMigrateDocument', action); // save to newest collection

        delete migrated._rev;
        return _this5.newestCollection._pouchPut(migrated, true).then(function (res) {
          action.res = res;
          action.type = 'success';
          return runAsyncPluginHooks('postMigrateDocument', action);
        });
      } else action.type = 'deleted';
    }).then(function () {
      // remove from old collection
      return _this5.pouchdb.remove(_this5._handleToPouch(doc))["catch"](function () {});
    }).then(function () {
      return action;
    });
  }
  /**
   * deletes this.pouchdb and removes it from the database.collectionsCollection
   */
  ;

  _proto2["delete"] = function _delete() {
    var _this6 = this;

    return this.pouchdb.destroy().then(function () {
      return _this6.database.removeCollectionDoc(_this6.dataMigrator.name, _this6.schema);
    });
  };

  _proto2.migrate = function migrate() {
    var _this7 = this;

    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    if (this._migrate) throw newRxError('DM3');
    this._migrate = true;
    var observer = new Subject();
    /**
     * TODO this is a side-effect which might throw
     * @see DataMigrator.migrate()
     */

    (function () {
      var error;

      var allBatchesDone = function allBatchesDone() {
        // remove this oldCollection
        return _this7["delete"]().then(function () {
          return observer.complete();
        });
      };

      var handleOneBatch = function handleOneBatch() {
        return _this7.getBatch(batchSize).then(function (batch) {
          if (batch.length === 0) {
            allBatchesDone();
            return false;
          } else {
            return Promise.all(batch.map(function (doc) {
              return _this7._migrateDocument(doc).then(function (action) {
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
  };

  _proto2.migratePromise = function migratePromise(batchSize) {
    var _this8 = this;

    if (!this._migratePromise) {
      this._migratePromise = new Promise(function (res, rej) {
        var state$ = _this8.migrate(batchSize);

        state$['subscribe'](null, rej, res);
      });
    }

    return this._migratePromise;
  };

  _createClass(OldCollection, [{
    key: "schema",
    get: function get() {
      if (!this._schema) {
        //            delete this.schemaObj._id;
        this._schema = createRxSchema(this.schemaObj, false);
      }

      return this._schema;
    }
  }, {
    key: "keyCompressor",
    get: function get() {
      if (!this._keyCompressor) this._keyCompressor = overwritable.createKeyCompressor(this.schema);
      return this._keyCompressor;
    }
  }, {
    key: "crypter",
    get: function get() {
      if (!this._crypter) this._crypter = createCrypter(this.database.password, this.schema);
      return this._crypter;
    }
  }, {
    key: "pouchdb",
    get: function get() {
      if (!this._pouchdb) {
        this._pouchdb = this.database._spawnPouchDB(this.newestCollection.name, this.version, this.newestCollection.pouchSettings);
      }

      return this._pouchdb;
    }
  }]);

  return OldCollection;
}();
/**
 * get an array with OldCollection-instances from all existing old pouchdb-instance
 */


export function _getOldCollections(dataMigrator) {
  return Promise.all(dataMigrator.currentSchema.previousVersions.map(function (v) {
    return dataMigrator.database._collectionsPouch.get(dataMigrator.name + '-' + v);
  }).map(function (fun) {
    return fun["catch"](function () {
      return null;
    });
  }) // auto-catch so Promise.all continues
  ).then(function (oldColDocs) {
    return oldColDocs.filter(function (colDoc) {
      return colDoc !== null;
    }).map(function (colDoc) {
      return new OldCollection(colDoc.schema.version, colDoc.schema, dataMigrator);
    });
  });
}
/**
 * returns true if a migration is needed
 */

export function mustMigrate(dataMigrator) {
  if (dataMigrator.currentSchema.version === 0) return Promise.resolve(false);
  return _getOldCollections(dataMigrator).then(function (oldCols) {
    if (oldCols.length === 0) return false;else return true;
  });
}
export function createDataMigrator(newestCollection, migrationStrategies) {
  return new DataMigrator(newestCollection, migrationStrategies);
}
//# sourceMappingURL=data-migrator.js.map