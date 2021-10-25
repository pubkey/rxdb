"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDatabaseBase = void 0;
exports._collectionNamePrimary = _collectionNamePrimary;
exports._ensureStorageTokenExists = _ensureStorageTokenExists;
exports._removeAllOfCollection = _removeAllOfCollection;
exports.createRxDatabase = createRxDatabase;
exports.dbCount = dbCount;
exports.isRxDatabase = isRxDatabase;
exports.removeRxDatabase = removeRxDatabase;
exports.writeToSocket = writeToSocket;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _randomToken = _interopRequireDefault(require("random-token"));

var _customIdleQueue = require("custom-idle-queue");

var _broadcastChannel = require("broadcast-channel");

var _util = require("./util");

var _rxError = require("./rx-error");

var _rxSchema = require("./rx-schema");

var _rxChangeEvent = require("./rx-change-event");

var _overwritable = require("./overwritable");

var _hooks = require("./hooks");

var _rxjs = require("rxjs");

var _rxCollection = require("./rx-collection");

var _rxStorageHelper = require("./rx-storage-helper");

var _rxSchemaHelper = require("./rx-schema-helper");

var _rxCollectionHelper = require("./rx-collection-helper");

/**
 * stores the used database names
 * so we can throw when the same database is created more then once.
 */
var USED_DATABASE_NAMES = new Set();
var DB_COUNT = 0; // stores information about the collections

var RxDatabaseBase = /*#__PURE__*/function () {
  /**
   * Stores information documents about the collections of the database
   */

  /**
   * Stores the local documents which are attached to this database.
   */
  function RxDatabaseBase(name, storage, instanceCreationOptions, password, multiInstance) {
    var eventReduce = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;
    var options = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
    this.internalStore = {};
    this.localDocumentsStore = {};
    this.idleQueue = new _customIdleQueue.IdleQueue();
    this.token = (0, _randomToken["default"])(10);
    this._subs = [];
    this.destroyed = false;
    this.subject = new _rxjs.Subject();
    this.observable$ = this.subject.asObservable();
    this.name = name;
    this.storage = storage;
    this.instanceCreationOptions = instanceCreationOptions;
    this.password = password;
    this.multiInstance = multiInstance;
    this.eventReduce = eventReduce;
    this.options = options;
    this.collections = {};
    DB_COUNT++;
  }

  var _proto = RxDatabaseBase.prototype;

  /**
   * removes all internal collection-info
   * only use this if you have to upgrade from a major rxdb-version
   * do NEVER use this to change the schema of a collection
   */
  _proto.dangerousRemoveCollectionInfo =
  /*#__PURE__*/
  function () {
    var _dangerousRemoveCollectionInfo = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var allDocs, writeData;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return (0, _rxStorageHelper.getAllDocuments)(this.internalStore);

            case 2:
              allDocs = _context.sent;
              writeData = allDocs.map(function (doc) {
                var deletedDoc = (0, _util.flatClone)(doc);
                deletedDoc._deleted = true;
                return {
                  previous: doc,
                  document: deletedDoc
                };
              });
              _context.next = 6;
              return this.internalStore.bulkWrite(writeData);

            case 6:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function dangerousRemoveCollectionInfo() {
      return _dangerousRemoveCollectionInfo.apply(this, arguments);
    }

    return dangerousRemoveCollectionInfo;
  }()
  /**
   * This is the main handle-point for all change events
   * ChangeEvents created by this instance go:
   * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
   * ChangeEvents created by other instances go:
   * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
   */
  ;

  _proto.$emit = function $emit(changeEvent) {
    // emit into own stream
    this.subject.next(changeEvent); // write to socket if event was created by this instance

    if (changeEvent.databaseToken === this.token) {
      writeToSocket(this, changeEvent);
    }
  }
  /**
   * removes the collection-doc from the internalStore
   */
  ;

  _proto.removeCollectionDoc =
  /*#__PURE__*/
  function () {
    var _removeCollectionDoc = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(name, schema) {
      var _this = this;

      var docId, doc, writeDoc;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              docId = _collectionNamePrimary(name, schema);
              _context2.next = 3;
              return (0, _rxStorageHelper.getSingleDocument)(this.internalStore, docId);

            case 3:
              doc = _context2.sent;

              if (doc) {
                _context2.next = 6;
                break;
              }

              throw (0, _rxError.newRxError)('SNH', {
                name: name,
                schema: schema
              });

            case 6:
              writeDoc = (0, _util.flatClone)(doc);
              writeDoc._deleted = true;
              _context2.next = 10;
              return this.lockedRun(function () {
                return _this.internalStore.bulkWrite([{
                  document: writeDoc,
                  previous: doc
                }]);
              });

            case 10:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function removeCollectionDoc(_x, _x2) {
      return _removeCollectionDoc.apply(this, arguments);
    }

    return removeCollectionDoc;
  }()
  /**
   * creates multiple RxCollections at once
   * to be much faster by saving db txs and doing stuff in bulk-operations
   * This function is not called often, but mostly in the critical path at the initial page load
   * So it must be as fast as possible.
   */
  ;

  _proto.addCollections =
  /*#__PURE__*/
  function () {
    var _addCollections = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(collectionCreators) {
      var _this2 = this;

      var collectionDocs, internalDocByCollectionName, schemaHashByName, collections, bulkPutDocs, ret;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return this.internalStore.findDocumentsById(Object.keys(collectionCreators).map(function (name) {
                var schema = collectionCreators[name].schema;
                return _collectionNamePrimary(name, schema);
              }), false);

            case 2:
              collectionDocs = _context3.sent;
              internalDocByCollectionName = {};
              Array.from(collectionDocs.entries()).forEach(function (_ref) {
                var key = _ref[0],
                    doc = _ref[1];
                internalDocByCollectionName[key] = doc;
              });
              schemaHashByName = {};
              _context3.next = 8;
              return Promise.all(Object.entries(collectionCreators).map(function (_ref2) {
                var name = _ref2[0],
                    args = _ref2[1];
                var useName = name;

                var internalDoc = internalDocByCollectionName[_collectionNamePrimary(name, collectionCreators[useName].schema)];

                var useArgs = (0, _util.flatClone)(args);
                useArgs.name = useName;
                var schema = (0, _rxSchema.createRxSchema)(args.schema);
                schemaHashByName[useName] = schema.hash;
                useArgs.schema = schema;
                useArgs.database = _this2; // TODO check if already exists and schema hash has changed
                // collection already exists

                // TODO check if already exists and schema hash has changed
                // collection already exists
                if (_this2.collections[name]) {
                  throw (0, _rxError.newRxError)('DB3', {
                    name: name
                  });
                } // collection already exists but has different schema


                // collection already exists but has different schema
                if (internalDoc && internalDoc.schemaHash !== schemaHashByName[useName]) {
                  throw (0, _rxError.newRxError)('DB6', {
                    name: name,
                    previousSchemaHash: internalDoc.schemaHash,
                    schemaHash: schemaHashByName[useName]
                  });
                } // run hooks


                // run hooks
                var hookData = (0, _util.flatClone)(args);
                hookData.database = _this2;
                hookData.name = name;
                (0, _hooks.runPluginHooks)('preCreateRxCollection', hookData);
                return (0, _rxCollection.createRxCollection)(useArgs, !!internalDoc);
              }));

            case 8:
              collections = _context3.sent;
              bulkPutDocs = [];
              ret = {};
              collections.forEach(function (collection) {
                var name = collection.name;
                ret[name] = collection;

                if (collection.schema.crypt && !_this2.password) {
                  throw (0, _rxError.newRxError)('DB7', {
                    name: name
                  });
                } // add to bulk-docs list


                if (!internalDocByCollectionName[name]) {
                  bulkPutDocs.push({
                    document: {
                      collectionName: _collectionNamePrimary(name, collectionCreators[name].schema),
                      schemaHash: schemaHashByName[name],
                      schema: collection.schema.normalized,
                      version: collection.schema.version,
                      _attachments: {}
                    }
                  });
                } // set as getter to the database


                _this2.collections[name] = collection;

                if (!_this2[name]) {
                  Object.defineProperty(_this2, name, {
                    get: function get() {
                      return _this2.collections[name];
                    }
                  });
                }
              }); // make a single call to the pouchdb instance

              if (!(bulkPutDocs.length > 0)) {
                _context3.next = 15;
                break;
              }

              _context3.next = 15;
              return this.internalStore.bulkWrite(bulkPutDocs);

            case 15:
              return _context3.abrupt("return", ret);

            case 16:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function addCollections(_x3) {
      return _addCollections.apply(this, arguments);
    }

    return addCollections;
  }()
  /**
   * delete all data of the collection and its previous versions
   */
  ;

  _proto.removeCollection = function removeCollection(collectionName) {
    var _this3 = this;

    if (this.collections[collectionName]) {
      this.collections[collectionName].destroy();
    } // remove schemas from internal db


    return _removeAllOfCollection(this, collectionName) // get all relevant pouchdb-instances
    .then(function (knownVersions) {
      return Promise.all(knownVersions.map(function (v) {
        return (0, _rxCollectionHelper.createRxCollectionStorageInstances)(collectionName, _this3, {
          databaseName: _this3.name,
          collectionName: collectionName,
          schema: (0, _rxSchemaHelper.getPseudoSchemaForVersion)(v, 'collectionName'),
          options: _this3.instanceCreationOptions
        }, {});
      }));
    }) // remove normal and local documents
    .then(function (storageInstances) {
      return Promise.all(storageInstances.map(function (instance) {
        return _this3.lockedRun(function () {
          return Promise.all([instance.storageInstance.remove(), instance.localDocumentsStore.remove()]);
        });
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
    var _this4 = this;

    if (this.destroyed) {
      return _util.PROMISE_RESOLVE_FALSE;
    }

    (0, _hooks.runPluginHooks)('preDestroyRxDatabase', this);
    DB_COUNT--;
    this.destroyed = true;

    this._subs.map(function (sub) {
      return sub.unsubscribe();
    }); // first wait until db is idle


    return this.requestIdlePromise() // destroy all collections
    .then(function () {
      return Promise.all(Object.keys(_this4.collections).map(function (key) {
        return _this4.collections[key];
      }).map(function (col) {
        return col.destroy();
      }));
    }) // destroy internal storage instances
    .then(function () {
      return _this4.internalStore.close ? _this4.internalStore.close() : null;
    }) // close broadcastChannel if exists
    .then(function () {
      return _this4.broadcastChannel ? _this4.broadcastChannel.close() : _util.PROMISE_RESOLVE_VOID;
    }) // remove combination from USED_COMBINATIONS-map
    .then(function () {
      return USED_DATABASE_NAMES["delete"](_this4.name);
    }).then(function () {
      return true;
    });
  }
  /**
   * deletes the database and its stored data
   */
  ;

  _proto.remove = function remove() {
    var _this5 = this;

    return this.destroy().then(function () {
      return removeRxDatabase(_this5.name, _this5.storage);
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
/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */


function _ensureStorageTokenExists(_x4) {
  return _ensureStorageTokenExists2.apply(this, arguments);
}
/**
 * writes the changeEvent to the broadcastChannel
 */


function _ensureStorageTokenExists2() {
  _ensureStorageTokenExists2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(rxDatabase) {
    var storageTokenDocumentId, storageTokenDoc, storageToken;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            storageTokenDocumentId = 'storageToken';
            _context4.next = 3;
            return (0, _rxStorageHelper.findLocalDocument)(rxDatabase.localDocumentsStore, storageTokenDocumentId);

          case 3:
            storageTokenDoc = _context4.sent;

            if (storageTokenDoc) {
              _context4.next = 11;
              break;
            }

            storageToken = (0, _randomToken["default"])(10);
            _context4.next = 8;
            return rxDatabase.localDocumentsStore.bulkWrite([{
              document: {
                _id: storageTokenDocumentId,
                value: storageToken,
                _attachments: {}
              }
            }]);

          case 8:
            return _context4.abrupt("return", storageToken);

          case 11:
            return _context4.abrupt("return", storageTokenDoc.value);

          case 12:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _ensureStorageTokenExists2.apply(this, arguments);
}

function writeToSocket(rxDatabase, changeEvent) {
  if (rxDatabase.destroyed) {
    return _util.PROMISE_RESOLVE_FALSE;
  }

  if (rxDatabase.multiInstance && !(0, _rxChangeEvent.isRxChangeEventIntern)(changeEvent) && rxDatabase.broadcastChannel) {
    var sendOverChannel = {
      cE: changeEvent,
      storageToken: rxDatabase.storageToken
    };
    return rxDatabase.broadcastChannel.postMessage(sendOverChannel).then(function () {
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
/**
 * removes all internal docs of a given collection
 * @return resolves all known collection-versions
 */


function _removeAllOfCollection(_x5, _x6) {
  return _removeAllOfCollection2.apply(this, arguments);
}

function _removeAllOfCollection2() {
  _removeAllOfCollection2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(rxDatabase, collectionName) {
    var docs, relevantDocs;
    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return rxDatabase.lockedRun(function () {
              return (0, _rxStorageHelper.getAllDocuments)(rxDatabase.internalStore);
            });

          case 2:
            docs = _context5.sent;
            relevantDocs = docs.filter(function (doc) {
              var name = doc.collectionName.split('-')[0];
              return name === collectionName;
            });
            return _context5.abrupt("return", Promise.all(relevantDocs.map(function (doc) {
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
            }));

          case 5:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  }));
  return _removeAllOfCollection2.apply(this, arguments);
}

function _prepareBroadcastChannel(rxDatabase) {
  // broadcastChannel
  rxDatabase.broadcastChannel = new _broadcastChannel.BroadcastChannel('RxDB:' + rxDatabase.name + ':' + 'socket');
  rxDatabase.broadcastChannel$ = new _rxjs.Subject();

  rxDatabase.broadcastChannel.onmessage = function (msg) {
    if (msg.storageToken !== rxDatabase.storageToken) return; // not same storage-state

    if (msg.cE.databaseToken === rxDatabase.token) return; // same db

    var changeEvent = msg.cE;
    rxDatabase.broadcastChannel$.next(changeEvent);
  };

  rxDatabase._subs.push(rxDatabase.broadcastChannel$.subscribe(function (cE) {
    rxDatabase.$emit(cE);
  }));
}
/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */


function createRxDatabaseStorageInstances(_x7, _x8, _x9) {
  return _createRxDatabaseStorageInstances.apply(this, arguments);
}
/**
 * do the async things for this database
 */


function _createRxDatabaseStorageInstances() {
  _createRxDatabaseStorageInstances = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(storage, databaseName, options) {
    var internalStore, localDocumentsStore;
    return _regenerator["default"].wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return storage.createStorageInstance({
              databaseName: databaseName,
              collectionName: _rxStorageHelper.INTERNAL_STORAGE_NAME,
              schema: (0, _rxSchemaHelper.getPseudoSchemaForVersion)(0, 'collectionName'),
              options: options
            });

          case 2:
            internalStore = _context6.sent;
            _context6.next = 5;
            return storage.createKeyObjectStorageInstance(databaseName, // TODO having to set an empty string here is ugly.
            // we should change the rx-storage interface to account for non-collection storage instances.
            '', options);

          case 5:
            localDocumentsStore = _context6.sent;
            return _context6.abrupt("return", {
              internalStore: internalStore,
              localDocumentsStore: localDocumentsStore
            });

          case 7:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee6);
  }));
  return _createRxDatabaseStorageInstances.apply(this, arguments);
}

function prepare(_x10) {
  return _prepare.apply(this, arguments);
}

function _prepare() {
  _prepare = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(rxDatabase) {
    var storageInstances, localDocsSub;
    return _regenerator["default"].wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return createRxDatabaseStorageInstances(rxDatabase.storage, rxDatabase.name, rxDatabase.instanceCreationOptions);

          case 2:
            storageInstances = _context7.sent;
            rxDatabase.internalStore = storageInstances.internalStore;
            rxDatabase.localDocumentsStore = storageInstances.localDocumentsStore;
            localDocsSub = rxDatabase.localDocumentsStore.changeStream().subscribe(function (rxStorageChangeEvent) {
              rxDatabase.$emit((0, _rxStorageHelper.storageChangeEventToRxChangeEvent)(true, rxStorageChangeEvent, rxDatabase));
            });

            rxDatabase._subs.push(localDocsSub);

            _context7.next = 9;
            return _ensureStorageTokenExists(rxDatabase);

          case 9:
            rxDatabase.storageToken = _context7.sent;

            if (rxDatabase.multiInstance) {
              _prepareBroadcastChannel(rxDatabase);
            }

          case 11:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7);
  }));
  return _prepare.apply(this, arguments);
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
  var rxDatabase = new RxDatabaseBase(name, storage, instanceCreationOptions, password, multiInstance, eventReduce, options);
  return prepare(rxDatabase).then(function () {
    return (0, _hooks.runAsyncPluginHooks)('createRxDatabase', rxDatabase);
  }).then(function () {
    return rxDatabase;
  });
}
/**
 * removes the database and all its known data
 */


function removeRxDatabase(_x11, _x12) {
  return _removeRxDatabase.apply(this, arguments);
}

function _removeRxDatabase() {
  _removeRxDatabase = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(databaseName, storage) {
    var storageInstance, docs;
    return _regenerator["default"].wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.next = 2;
            return createRxDatabaseStorageInstances(storage, databaseName, {});

          case 2:
            storageInstance = _context9.sent;
            _context9.next = 5;
            return (0, _rxStorageHelper.getAllDocuments)(storageInstance.internalStore);

          case 5:
            docs = _context9.sent;
            _context9.next = 8;
            return Promise.all(docs.map( /*#__PURE__*/function () {
              var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(colDoc) {
                var id, schema, split, collectionName, version, primaryPath, _yield$Promise$all, instance, localInstance;

                return _regenerator["default"].wrap(function _callee8$(_context8) {
                  while (1) {
                    switch (_context8.prev = _context8.next) {
                      case 0:
                        id = colDoc.collectionName;
                        schema = colDoc.schema;
                        split = id.split('-');
                        collectionName = split[0];
                        version = parseInt(split[1], 10);
                        primaryPath = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
                        _context8.next = 8;
                        return Promise.all([storage.createStorageInstance({
                          databaseName: databaseName,
                          collectionName: collectionName,
                          schema: (0, _rxSchemaHelper.getPseudoSchemaForVersion)(version, primaryPath),
                          options: {}
                        }), storage.createKeyObjectStorageInstance(databaseName, (0, _rxCollectionHelper.getCollectionLocalInstanceName)(collectionName), {})]);

                      case 8:
                        _yield$Promise$all = _context8.sent;
                        instance = _yield$Promise$all[0];
                        localInstance = _yield$Promise$all[1];
                        _context8.next = 13;
                        return Promise.all([instance.remove(), localInstance.remove()]);

                      case 13:
                      case "end":
                        return _context8.stop();
                    }
                  }
                }, _callee8);
              }));

              return function (_x13) {
                return _ref4.apply(this, arguments);
              };
            }()));

          case 8:
            return _context9.abrupt("return", Promise.all([storageInstance.internalStore.remove(), storageInstance.localDocumentsStore.remove()]));

          case 9:
          case "end":
            return _context9.stop();
        }
      }
    }, _callee9);
  }));
  return _removeRxDatabase.apply(this, arguments);
}

function isRxDatabase(obj) {
  return obj instanceof RxDatabaseBase;
}

function dbCount() {
  return DB_COUNT;
}

//# sourceMappingURL=rx-database.js.map