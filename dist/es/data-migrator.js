import _createClass from "@babel/runtime/helpers/createClass";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";

/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */
import PouchDB from './pouch-db';
import { clone } from './util';
import RxSchema from './rx-schema';
import Crypter from './crypter';
import RxError from './rx-error';
import overwritable from './overwritable';
import hooks from './hooks';
import { Subject } from 'rxjs';

var DataMigrator =
/*#__PURE__*/
function () {
  function DataMigrator(newestCollection, migrationStrategies) {
    this.newestCollection = newestCollection;
    this.migrationStrategies = migrationStrategies;
    this.currentSchema = newestCollection.schema;
    this.database = newestCollection.database;
    this.name = newestCollection.name;
  }
  /**
   * @param {number} [batchSize=10] amount of documents handled in parallel
   * @return {Observable} emits the migration-state
   */


  var _proto = DataMigrator.prototype;

  _proto.migrate = function migrate() {
    var _this = this;

    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    if (this._migrated) throw RxError.newRxError('DM1');
    this._migrated = true;
    var state = {
      done: false,
      // true if finished
      total: null,
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

    _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee() {
      var oldCols, countAll, totalCount, currentCol, _loop;

      return _regeneratorRuntime.wrap(function _callee$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return _getOldCollections(_this);

            case 2:
              oldCols = _context2.sent;
              _context2.next = 5;
              return Promise.all(oldCols.map(function (oldCol) {
                return oldCol.countAllUndeleted();
              }));

            case 5:
              countAll = _context2.sent;
              totalCount = countAll.reduce(function (cur, prev) {
                return prev = cur + prev;
              }, 0);
              state.total = totalCount;
              observer.next(clone(state));
              currentCol = oldCols.shift();
              _loop =
              /*#__PURE__*/
              _regeneratorRuntime.mark(function _loop() {
                var migrationState$;
                return _regeneratorRuntime.wrap(function _loop$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        migrationState$ = currentCol.migrate(batchSize);
                        _context.next = 3;
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

                      case 3:
                        currentCol = oldCols.shift();

                      case 4:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _loop, this);
              });

            case 11:
              if (!currentCol) {
                _context2.next = 15;
                break;
              }

              return _context2.delegateYield(_loop(), "t0", 13);

            case 13:
              _context2.next = 11;
              break;

            case 15:
              state.done = true;
              state.percent = 100;
              observer.next(clone(state));
              observer.complete();

            case 19:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee, this);
    }))();

    return observer.asObservable();
  };

  _proto.migratePromise =
  /*#__PURE__*/
  function () {
    var _migratePromise = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee2(batchSize) {
      var _this2 = this;

      var must;
      return _regeneratorRuntime.wrap(function _callee2$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              if (this._migratePromise) {
                _context3.next = 7;
                break;
              }

              _context3.next = 3;
              return mustMigrate(this);

            case 3:
              must = _context3.sent;

              if (must) {
                _context3.next = 6;
                break;
              }

              return _context3.abrupt("return", Promise.resolve(false));

            case 6:
              this._migratePromise = new Promise(function (res, rej) {
                var state$ = _this2.migrate(batchSize);

                state$.subscribe(null, rej, res);
              });

            case 7:
              return _context3.abrupt("return", this._migratePromise);

            case 8:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee2, this);
    }));

    return function migratePromise(_x) {
      return _migratePromise.apply(this, arguments);
    };
  }();

  return DataMigrator;
}();

var OldCollection =
/*#__PURE__*/
function () {
  function OldCollection(version, schemaObj, dataMigrator) {
    this.version = version;
    this.dataMigrator = dataMigrator;
    this.schemaObj = schemaObj;
    this.newestCollection = dataMigrator.newestCollection;
    this.database = dataMigrator.newestCollection.database;
  }

  var _proto2 = OldCollection.prototype;

  /**
   * @return {Promise}
   */
  _proto2.countAllUndeleted = function countAllUndeleted() {
    return PouchDB.countAllUndeleted(this.pouchdb);
  };

  _proto2.getBatch = function getBatch(batchSize) {
    var _this3 = this;

    return PouchDB.getBatch(this.pouchdb, batchSize).then(function (docs) {
      return docs.map(function (doc) {
        return _this3._handleFromPouch(doc);
      });
    });
  };
  /**
   * handles a document from the pouchdb-instance
   */


  _proto2._handleFromPouch = function _handleFromPouch(docData) {
    var data = clone(docData);
    data = this.schema.swapIdToPrimary(docData);
    if (this.schema.doKeyCompression()) data = this.keyCompressor.decompress(data);
    data = this.crypter.decrypt(data);
    return data;
  };
  /**
   * wrappers for Pouch.put/get to handle keycompression etc
   */


  _proto2._handleToPouch = function _handleToPouch(docData) {
    var data = clone(docData);
    data = this.crypter.encrypt(data);
    data = this.schema.swapPrimaryToId(data);
    if (this.schema.doKeyCompression()) data = this.keyCompressor.compress(data);
    return data;
  };
  /**
   * runs the doc-data through all following migrationStrategies
   * so it will match the newest schema.
   * @throws Error if final doc does not match final schema or migrationStrategy crashes
   * @return {Object|null} final object or null if migrationStrategy deleted it
   */


  _proto2.migrateDocumentData =
  /*#__PURE__*/
  function () {
    var _migrateDocumentData = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee3(doc) {
      var nextVersion;
      return _regeneratorRuntime.wrap(function _callee3$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              doc = clone(doc);
              nextVersion = this.version + 1; // run throught migrationStrategies

            case 2:
              if (!(nextVersion <= this.newestCollection.schema.version)) {
                _context4.next = 11;
                break;
              }

              _context4.next = 5;
              return this.dataMigrator.migrationStrategies[nextVersion + ''](doc);

            case 5:
              doc = _context4.sent;
              nextVersion++;

              if (!(doc === null)) {
                _context4.next = 9;
                break;
              }

              return _context4.abrupt("return", null);

            case 9:
              _context4.next = 2;
              break;

            case 11:
              _context4.prev = 11;
              this.newestCollection.schema.validate(doc);
              _context4.next = 18;
              break;

            case 15:
              _context4.prev = 15;
              _context4.t0 = _context4["catch"](11);
              throw RxError.newRxError('DM2', {
                fromVersion: this.version,
                toVersion: this.newestCollection.schema.version,
                finalDoc: doc
              });

            case 18:
              return _context4.abrupt("return", doc);

            case 19:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee3, this, [[11, 15]]);
    }));

    return function migrateDocumentData(_x2) {
      return _migrateDocumentData.apply(this, arguments);
    };
  }();
  /**
   * transform docdata and save to new collection
   * @return {{type: string, doc: {}}} status-action with status and migrated document
   */


  _proto2._migrateDocument =
  /*#__PURE__*/
  function () {
    var _migrateDocument2 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee4(doc) {
      var migrated, action, res;
      return _regeneratorRuntime.wrap(function _callee4$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 2;
              return this.migrateDocumentData(doc);

            case 2:
              migrated = _context5.sent;
              action = {
                doc: doc,
                migrated: migrated,
                oldCollection: this,
                newestCollection: this.newestCollection
              };

              if (!migrated) {
                _context5.next = 16;
                break;
              }

              hooks.runPluginHooks('preMigrateDocument', action); // save to newest collection

              delete migrated._rev;
              _context5.next = 9;
              return this.newestCollection._pouchPut(migrated, true);

            case 9:
              res = _context5.sent;
              action.res = res;
              action.type = 'success';
              _context5.next = 14;
              return hooks.runAsyncPluginHooks('postMigrateDocument', action);

            case 14:
              _context5.next = 17;
              break;

            case 16:
              action.type = 'deleted';

            case 17:
              _context5.prev = 17;
              _context5.next = 20;
              return this.pouchdb.remove(this._handleToPouch(doc));

            case 20:
              _context5.next = 24;
              break;

            case 22:
              _context5.prev = 22;
              _context5.t0 = _context5["catch"](17);

            case 24:
              return _context5.abrupt("return", action);

            case 25:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee4, this, [[17, 22]]);
    }));

    return function _migrateDocument(_x3) {
      return _migrateDocument2.apply(this, arguments);
    };
  }();
  /**
   * deletes this.pouchdb and removes it from the database.collectionsCollection
   * @return {Promise}
   */


  _proto2["delete"] = function _delete() {
    var _this4 = this;

    return this.pouchdb.destroy().then(function () {
      return _this4.database.removeCollectionDoc(_this4.dataMigrator.name, _this4.schema);
    });
  };
  /**
   * runs the migration on all documents and deletes the pouchdb afterwards
   */


  _proto2.migrate = function migrate() {
    var _this5 = this;

    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    if (this._migrate) throw RxError.newRxError('DM3');
    this._migrate = true;
    var observer = new Subject();
    /**
     * TODO this is a side-effect which might throw
     * @see DataMigrator.migrate()
     */

    _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee5() {
      var batch, error;
      return _regeneratorRuntime.wrap(function _callee5$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 2;
              return _this5.getBatch(batchSize);

            case 2:
              batch = _context6.sent;

            case 3:
              _context6.next = 5;
              return Promise.all(batch.map(function (doc) {
                return _this5._migrateDocument(doc).then(function (action) {
                  return observer.next(action);
                });
              }))["catch"](function (e) {
                return error = e;
              });

            case 5:
              if (!error) {
                _context6.next = 8;
                break;
              }

              observer.error(error);
              return _context6.abrupt("return");

            case 8:
              _context6.next = 10;
              return _this5.getBatch(batchSize);

            case 10:
              batch = _context6.sent;

            case 11:
              if (!error && batch.length > 0) {
                _context6.next = 3;
                break;
              }

            case 12:
              _context6.next = 14;
              return _this5["delete"]();

            case 14:
              observer.complete();

            case 15:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee5, this);
    }))();

    return observer.asObservable();
  };

  _proto2.migratePromise = function migratePromise(batchSize) {
    var _this6 = this;

    if (!this._migratePromise) {
      this._migratePromise = new Promise(function (res, rej) {
        var state$ = _this6.migrate(batchSize);

        state$.subscribe(null, rej, res);
      });
    }

    return this._migratePromise;
  };

  _createClass(OldCollection, [{
    key: "schema",
    get: function get() {
      if (!this._schema) {
        //            delete this.schemaObj._id;
        this._schema = RxSchema.create(this.schemaObj, false);
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
      if (!this._crypter) this._crypter = Crypter.create(this.database.password, this.schema);
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
 * @return {Promise<OldCollection[]>}
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
 * @return {Promise<boolean>}
 */

export function mustMigrate(dataMigrator) {
  if (dataMigrator.currentSchema.version === 0) return Promise.resolve(false);
  return _getOldCollections(dataMigrator).then(function (oldCols) {
    if (oldCols.length === 0) return false;else return true;
  });
}
export function create(newestCollection, migrationStrategies) {
  return new DataMigrator(newestCollection, migrationStrategies);
}
export default {
  create: create
};