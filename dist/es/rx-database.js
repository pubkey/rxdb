import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _createClass from "@babel/runtime/helpers/createClass";
import randomToken from 'random-token';
import { IdleQueue } from 'custom-idle-queue';
import { BroadcastChannel } from 'broadcast-channel';
import { promiseWait, pluginMissing, LOCAL_PREFIX, flatClone } from './util';
import { newRxError } from './rx-error';
import { createRxSchema } from './rx-schema';
import { isInstanceOf as isInstanceOfRxChangeEvent } from './rx-change-event';
import { overwritable } from './overwritable';
import { runPluginHooks, runAsyncPluginHooks } from './hooks';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PouchDB, isLevelDown } from './pouch-db';
import { create as createRxCollection } from './rx-collection';
import { RxChangeEvent } from './rx-change-event';
import { getRxStoragePouchDb } from './rx-storage-pouchdb';
import { getAllDocuments, deleteStorageInstance } from './rx-database-internal-store';
/**
 * stores the combinations
 * of used database-names with their adapters
 * so we can throw when the same database is created more then once
 */

var USED_COMBINATIONS = {};
var DB_COUNT = 0;
export var RxDatabaseBase = /*#__PURE__*/function () {
  function RxDatabaseBase(name, adapter, password, multiInstance) {
    var eventReduce = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
    var options = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
    var pouchSettings = arguments.length > 6 ? arguments[6] : undefined;
    this.internalStore = {};
    this.idleQueue = new IdleQueue();
    this.token = randomToken(10);
    this._subs = [];
    this.destroyed = false;
    this.subject = new Subject();
    this.observable$ = this.subject.asObservable().pipe(filter(function (cEvent) {
      return isInstanceOfRxChangeEvent(cEvent);
    }));
    this.name = name;
    this.adapter = adapter;
    this.password = password;
    this.multiInstance = multiInstance;
    this.eventReduce = eventReduce;
    this.options = options;
    this.pouchSettings = pouchSettings;
    this.storage = getRxStoragePouchDb(adapter, pouchSettings);
    this.collections = {};
    DB_COUNT++;
  }

  var _proto = RxDatabaseBase.prototype;

  /**
   * removes all internal collection-info
   * only use this if you have to upgrade from a major rxdb-version
   * do NEVER use this to change the schema of a collection
   */
  _proto.dangerousRemoveCollectionInfo = function dangerousRemoveCollectionInfo() {
    var _this = this;

    return getAllDocuments(this.internalStore).then(function (docsRes) {
      return Promise.all(docsRes.map(function (row) {
        return {
          _id: row.key,
          _rev: row.value.rev
        };
      }).map(function (doc) {
        return _this.internalStore.remove(doc._id, doc._rev);
      }));
    });
  }
  /**
   * spawns a new pouch-instance
   */
  ;

  _proto._spawnPouchDB = function _spawnPouchDB(collectionName, schemaVersion) {
    var pouchSettings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return this.storage.createStorageInstance(this.name, collectionName, schemaVersion, {
      pouchSettings: pouchSettings
    });
  }
  /**
   * This is the main handle-point for all change events
   * ChangeEvents created by this instance go:
   * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
   * ChangeEvents created by other instances go:
   * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
   */
  ;

  _proto.$emit = function $emit(changeEvent) {
    if (!changeEvent) return; // emit into own stream

    this.subject.next(changeEvent); // write to socket if event was created by this instance

    if (changeEvent.databaseToken === this.token) {
      writeToSocket(this, changeEvent);
    }
  }
  /**
   * removes the collection-doc from this._collectionsPouch
   */
  ;

  _proto.removeCollectionDoc = function removeCollectionDoc(name, schema) {
    var _this2 = this;

    var docId = _collectionNamePrimary(name, schema);

    return this.internalStore.get(docId).then(function (doc) {
      return _this2.lockedRun(function () {
        return _this2.internalStore.remove(doc);
      });
    });
  }
  /**
   * creates multiple RxCollections at once
   * to be much faster by saving db txs and doing stuff in bulk-operations
   * This function is not called often, but mostly in the critical path at the initial page load
   * So it must be as fast as possible
   */
  ;

  _proto.addCollections =
  /*#__PURE__*/
  function () {
    var _addCollections = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(collectionCreators) {
      var _this3 = this;

      var pouch, result, internalDocByCollectionName, schemaHashByName, collections, bulkPutDocs, ret;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              pouch = this.internalStore; // get local management docs in bulk request

              _context.next = 3;
              return pouch.allDocs({
                include_docs: true,
                keys: Object.keys(collectionCreators).map(function (name) {
                  return _collectionNamePrimary(name, collectionCreators[name].schema);
                })
              });

            case 3:
              result = _context.sent;
              internalDocByCollectionName = {};
              result.rows.forEach(function (row) {
                if (!row.error) {
                  internalDocByCollectionName[row.key] = row.doc;
                }
              });
              schemaHashByName = {};
              _context.next = 9;
              return Promise.all(Object.entries(collectionCreators).map(function (_ref) {
                var name = _ref[0],
                    args = _ref[1];

                var internalDoc = internalDocByCollectionName[_collectionNamePrimary(name, collectionCreators[name].schema)];

                var useArgs = flatClone(args);
                useArgs.name = name;
                var schema = createRxSchema(args.schema);
                schemaHashByName[name] = schema.hash;
                useArgs.schema = schema;
                useArgs.database = _this3; // TODO check if already exists and schema hash has changed
                // collection already exists

                if (_this3.collections[name]) {
                  throw newRxError('DB3', {
                    name: name
                  });
                } // collection already exists but has different schema


                if (internalDoc && internalDoc.schemaHash !== schemaHashByName[name]) {
                  throw newRxError('DB6', {
                    name: name,
                    previousSchemaHash: internalDoc.schemaHash,
                    schemaHash: schemaHashByName[name]
                  });
                } // run hooks


                var hookData = flatClone(args);
                hookData.database = _this3;
                hookData.name = name;
                runPluginHooks('preCreateRxCollection', hookData);
                return createRxCollection(useArgs, !!internalDoc);
              }));

            case 9:
              collections = _context.sent;
              bulkPutDocs = [];
              ret = {};
              collections.forEach(function (collection) {
                var name = collection.name;
                ret[name] = collection;

                if (collection.schema.crypt && !_this3.password) {
                  throw newRxError('DB7', {
                    name: name
                  });
                } // add to bulk-docs list


                if (!internalDocByCollectionName[name]) {
                  bulkPutDocs.push({
                    _id: _collectionNamePrimary(name, collectionCreators[name].schema),
                    schemaHash: schemaHashByName[name],
                    schema: collection.schema.normalized,
                    version: collection.schema.version
                  });
                } // set as getter to the database


                _this3.collections[name] = collection;

                if (!_this3[name]) {
                  Object.defineProperty(_this3, name, {
                    get: function get() {
                      return _this3.collections[name];
                    }
                  });
                }
              }); // make a single call to the pouchdb instance

              if (!(bulkPutDocs.length > 0)) {
                _context.next = 16;
                break;
              }

              _context.next = 16;
              return pouch.bulkDocs({
                docs: bulkPutDocs
              });

            case 16:
              return _context.abrupt("return", ret);

            case 17:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function addCollections(_x) {
      return _addCollections.apply(this, arguments);
    }

    return addCollections;
  }()
  /**
   * create or fetch a collection
   * @deprecated use addCollections() instead, it is faster and better typed
   */
  ;

  _proto.collection = function collection(args) {
    var _this$addCollections;

    if (typeof args === 'string') {
      return Promise.resolve(this.collections[args]);
    } // collection() is deprecated, call new bulk-creation method


    return this.addCollections((_this$addCollections = {}, _this$addCollections[args.name] = args, _this$addCollections)).then(function (colObject) {
      return colObject[args.name];
    });
  }
  /**
   * delete all data of the collection and its previous versions
   */
  ;

  _proto.removeCollection = function removeCollection(collectionName) {
    var _this4 = this;

    if (this.collections[collectionName]) this.collections[collectionName].destroy(); // remove schemas from internal db

    return _removeAllOfCollection(this, collectionName) // get all relevant pouchdb-instances
    .then(function (knownVersions) {
      return knownVersions.map(function (v) {
        return _this4._spawnPouchDB(collectionName, v);
      });
    }) // remove documents
    .then(function (pouches) {
      return Promise.all(pouches.map(function (pouch) {
        return _this4.lockedRun(function () {
          return pouch.destroy();
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

  _proto.dump = function dump() {
    var _decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    var _collections = arguments.length > 1 ? arguments[1] : undefined;

    throw pluginMissing('json-dump');
  }
  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<db>.dump()` method.
   * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
   * since data could be encrypted.
   */
  ;

  _proto.importDump = function importDump(_exportedJSON) {
    throw pluginMissing('json-dump');
  }
  /**
   * spawn server
   */
  ;

  _proto.server = function server(_options) {
    throw pluginMissing('server');
  };

  _proto.leaderElector = function leaderElector() {
    throw pluginMissing('leader-election');
  };

  _proto.isLeader = function isLeader() {
    throw pluginMissing('leader-election');
  }
  /**
   * returns a promise which resolves when the instance becomes leader
   */
  ;

  _proto.waitForLeadership = function waitForLeadership() {
    throw pluginMissing('leader-election');
  }
  /**
   * destroys the database-instance and all collections
   */
  ;

  _proto.destroy = function destroy() {
    var _this5 = this;

    if (this.destroyed) return Promise.resolve(false);
    runPluginHooks('preDestroyRxDatabase', this);
    DB_COUNT--;
    this.destroyed = true;

    if (this.broadcastChannel) {
      /**
       * The broadcast-channel gets closed lazy
       * to ensure that all pending change-events
       * get emitted
       */
      setTimeout(function () {
        return _this5.broadcastChannel.close();
      }, 1000);
    }

    this._subs.map(function (sub) {
      return sub.unsubscribe();
    }); // destroy all collections


    return Promise.all(Object.keys(this.collections).map(function (key) {
      return _this5.collections[key];
    }).map(function (col) {
      return col.destroy();
    })) // remove combination from USED_COMBINATIONS-map
    .then(function () {
      return _removeUsedCombination(_this5.name, _this5.adapter);
    }).then(function () {
      return true;
    });
  }
  /**
   * deletes the database and its stored data
   */
  ;

  _proto.remove = function remove() {
    var _this6 = this;

    return this.destroy().then(function () {
      return removeRxDatabase(_this6.name, _this6.adapter);
    });
  };

  _createClass(RxDatabaseBase, [{
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

function _isNameAdapterUsed(name, adapter) {
  if (!USED_COMBINATIONS[name]) return false;
  var used = false;
  USED_COMBINATIONS[name].forEach(function (ad) {
    if (ad === adapter) used = true;
  });

  if (used) {
    throw newRxError('DB8', {
      name: name,
      adapter: adapter,
      link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
    });
  }
}

function _removeUsedCombination(name, adapter) {
  if (!USED_COMBINATIONS[name]) return;
  var index = USED_COMBINATIONS[name].indexOf(adapter);
  USED_COMBINATIONS[name].splice(index, 1);
}
/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */


export function _ensureStorageTokenExists(rxDatabase) {
  return rxDatabase.internalStore.get(LOCAL_PREFIX + 'storageToken')["catch"](function () {
    // no doc exists -> insert
    return rxDatabase.internalStore.put({
      _id: LOCAL_PREFIX + 'storageToken',
      value: randomToken(10)
    })["catch"](function () {}).then(function () {
      return promiseWait(0);
    });
  }).then(function () {
    return rxDatabase.internalStore.get(LOCAL_PREFIX + 'storageToken');
  }).then(function (storageTokenDoc2) {
    return storageTokenDoc2.value;
  });
}
/**
 * writes the changeEvent to the broadcastChannel
 */

export function writeToSocket(rxDatabase, changeEvent) {
  if (rxDatabase.multiInstance && !changeEvent.isIntern() && rxDatabase.broadcastChannel) {
    var sendOverChannel = {
      cE: changeEvent.toJSON(),
      storageToken: rxDatabase.storageToken
    };
    return rxDatabase.broadcastChannel.postMessage(sendOverChannel).then(function () {
      return true;
    });
  } else return Promise.resolve(false);
}
/**
 * returns the primary for a given collection-data
 * used in the internal pouchdb-instances
 */

export function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}
/**
 * removes all internal docs of a given collection
 * @return resolves all known collection-versions
 */

export function _removeAllOfCollection(rxDatabase, collectionName) {
  return rxDatabase.lockedRun(function () {
    return getAllDocuments(rxDatabase.internalStore);
  }).then(function (data) {
    var relevantDocs = data.map(function (row) {
      return row.doc;
    }).filter(function (doc) {
      var name = doc._id.split('-')[0];

      return name === collectionName;
    });
    return Promise.all(relevantDocs.map(function (doc) {
      return rxDatabase.lockedRun(function () {
        return rxDatabase.internalStore.remove(doc);
      });
    })).then(function () {
      return relevantDocs.map(function (doc) {
        return doc.version;
      });
    });
  });
}

function _prepareBroadcastChannel(rxDatabase) {
  // broadcastChannel
  rxDatabase.broadcastChannel = new BroadcastChannel('RxDB:' + rxDatabase.name + ':' + 'socket');
  rxDatabase.broadcastChannel$ = new Subject();

  rxDatabase.broadcastChannel.onmessage = function (msg) {
    if (msg.storageToken !== rxDatabase.storageToken) return; // not same storage-state

    if (msg.cE.databaseToken === rxDatabase.token) return; // same db

    var changeEvent = new RxChangeEvent(msg.cE.operation, msg.cE.documentId, msg.cE.documentData, msg.cE.databaseToken, msg.cE.collectionName, msg.cE.isLocal, msg.cE.startTime, msg.cE.endTime, msg.cE.previousData);
    rxDatabase.broadcastChannel$.next(changeEvent);
  }; // TODO only subscribe when something is listening to the event-chain


  rxDatabase._subs.push(rxDatabase.broadcastChannel$.subscribe(function (cE) {
    rxDatabase.$emit(cE);
  }));
}
/**
 * do the async things for this database
 */


function prepare(rxDatabase) {
  return rxDatabase.storage.createInternalStorageInstance(rxDatabase.name).then(function (internalStore) {
    rxDatabase.internalStore = internalStore;
    return _ensureStorageTokenExists(rxDatabase);
  }).then(function (storageToken) {
    rxDatabase.storageToken = storageToken;

    if (rxDatabase.multiInstance) {
      _prepareBroadcastChannel(rxDatabase);
    }
  });
}

export function createRxDatabase(_ref2) {
  var name = _ref2.name,
      adapter = _ref2.adapter,
      password = _ref2.password,
      _ref2$multiInstance = _ref2.multiInstance,
      multiInstance = _ref2$multiInstance === void 0 ? true : _ref2$multiInstance,
      _ref2$eventReduce = _ref2.eventReduce,
      eventReduce = _ref2$eventReduce === void 0 ? false : _ref2$eventReduce,
      _ref2$ignoreDuplicate = _ref2.ignoreDuplicate,
      ignoreDuplicate = _ref2$ignoreDuplicate === void 0 ? false : _ref2$ignoreDuplicate,
      _ref2$options = _ref2.options,
      options = _ref2$options === void 0 ? {} : _ref2$options,
      _ref2$pouchSettings = _ref2.pouchSettings,
      pouchSettings = _ref2$pouchSettings === void 0 ? {} : _ref2$pouchSettings;
  runPluginHooks('preCreateRxDatabase', {
    name: name,
    adapter: adapter,
    password: password,
    multiInstance: multiInstance,
    eventReduce: eventReduce,
    ignoreDuplicate: ignoreDuplicate,
    options: options,
    pouchSettings: pouchSettings
  }); // check if pouchdb-adapter

  if (typeof adapter === 'string') {
    // TODO make a function hasAdapter()
    if (!PouchDB.adapters || !PouchDB.adapters[adapter]) {
      throw newRxError('DB9', {
        adapter: adapter
      });
    }
  } else {
    isLevelDown(adapter);

    if (!PouchDB.adapters || !PouchDB.adapters.leveldb) {
      throw newRxError('DB10', {
        adapter: adapter
      });
    }
  }

  if (password) {
    overwritable.validatePassword(password);
  } // check if combination already used


  if (!ignoreDuplicate) {
    _isNameAdapterUsed(name, adapter);
  } // add to used_map


  if (!USED_COMBINATIONS[name]) {
    USED_COMBINATIONS[name] = [];
  }

  USED_COMBINATIONS[name].push(adapter);
  var rxDatabase = new RxDatabaseBase(name, adapter, password, multiInstance, eventReduce, options, pouchSettings);
  return prepare(rxDatabase).then(function () {
    return runAsyncPluginHooks('createRxDatabase', rxDatabase);
  }).then(function () {
    return rxDatabase;
  });
}
/**
 * removes the database and all its known data
 */

export function removeRxDatabase(databaseName, adapter) {
  var storage = getRxStoragePouchDb(adapter);
  return storage.createInternalStorageInstance(databaseName).then(function (internalStore) {
    return getAllDocuments(internalStore).then(function (docs) {
      // remove collections storages
      return Promise.all(docs.map(function (colDoc) {
        return colDoc.id;
      }).map(function (id) {
        var split = id.split('-');
        var name = split[0];
        var version = parseInt(split[1], 10);
        var instance = storage.createStorageInstance(databaseName, name, version);
        return instance.destroy();
      }));
    }) // remove internals
    .then(function () {
      return deleteStorageInstance(internalStore);
    });
  });
}
/**
 * check if the given adapter can be used
 */

export function checkAdapter(adapter) {
  return overwritable.checkAdapter(adapter);
}
export function isInstanceOf(obj) {
  return obj instanceof RxDatabaseBase;
}
export function dbCount() {
  return DB_COUNT;
}
export default {
  createRxDatabase: createRxDatabase,
  removeRxDatabase: removeRxDatabase,
  checkAdapter: checkAdapter,
  isInstanceOf: isInstanceOf,
  RxDatabaseBase: RxDatabaseBase,
  dbCount: dbCount
};
//# sourceMappingURL=rx-database.js.map