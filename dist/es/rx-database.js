import _createClass from "@babel/runtime/helpers/createClass";
import randomToken from 'random-token';
import IdleQueue from 'custom-idle-queue';
import { BroadcastChannel } from 'broadcast-channel';
import { adapterObject, hash, promiseWait, pluginMissing } from './util';
import { newRxError } from './rx-error';
import { createRxSchema } from './rx-schema';
import { isInstanceOf as isInstanceOfRxChangeEvent, createChangeEvent, changeEventfromJSON } from './rx-change-event';
import overwritable from './overwritable';
import { runPluginHooks } from './hooks';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PouchDB, validateCouchDBString, isLevelDown } from './pouch-db';
import { create as createRxCollection } from './rx-collection';

/**
 * stores the combinations
 * of used database-names with their adapters
 * so we can throw when the same database is created more then once
 */
var USED_COMBINATIONS = {};
var DB_COUNT = 0;
export var RxDatabaseBase = /*#__PURE__*/function () {
  function RxDatabaseBase(name, adapter, password, multiInstance) {
    var queryChangeDetection = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
    var options = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
    var pouchSettings = arguments.length > 6 ? arguments[6] : undefined;
    this.idleQueue = new IdleQueue();
    this.token = randomToken(10);
    this._subs = [];
    this.destroyed = false;
    this.subject = new Subject();
    this.observable$ = this.subject.asObservable().pipe(filter(function (cEvent) {
      return isInstanceOfRxChangeEvent(cEvent);
    }));
    this._adminPouch = {};
    this._collectionsPouch = {};
    this.name = name;
    this.adapter = adapter;
    this.password = password;
    this.multiInstance = multiInstance;
    this.queryChangeDetection = queryChangeDetection;
    this.options = options;
    this.pouchSettings = pouchSettings;
    this.collections = {};
    if (typeof name !== 'undefined') DB_COUNT++;
  }

  var _proto = RxDatabaseBase.prototype;

  /**
   * removes all internal collection-info
   * only use this if you have to upgrade from a major rxdb-version
   * do NEVER use this to change the schema of a collection
   */
  _proto.dangerousRemoveCollectionInfo = function dangerousRemoveCollectionInfo() {
    var colPouch = this._collectionsPouch;
    return colPouch.allDocs().then(function (docsRes) {
      return Promise.all(docsRes.rows.map(function (row) {
        return {
          _id: row.key,
          _rev: row.value.rev
        };
      }).map(function (doc) {
        return colPouch.remove(doc._id, doc._rev);
      }));
    });
  }
  /**
   * spawns a new pouch-instance
   */
  ;

  _proto._spawnPouchDB = function _spawnPouchDB(collectionName, schemaVersion) {
    var pouchSettings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return _spawnPouchDB2(this.name, this.adapter, collectionName, schemaVersion, pouchSettings, this.pouchSettings);
  }
  /**
   * returns a promise which resolves when the instance becomes leader
   */
  ;

  _proto.waitForLeadership = function waitForLeadership() {
    if (!this.multiInstance) return Promise.resolve(true);
    return this.leaderElector.waitForLeadership();
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

    if (changeEvent.data.it === this.token) {
      writeToSocket(this, changeEvent);
    }
  }
  /**
   * removes the collection-doc from this._collectionsPouch
   */
  ;

  _proto.removeCollectionDoc = function removeCollectionDoc(name, schema) {
    var _this = this;

    var docId = _collectionNamePrimary(name, schema);

    return this._collectionsPouch.get(docId).then(function (doc) {
      return _this.lockedRun(function () {
        return _this._collectionsPouch.remove(doc);
      });
    });
  }
  /**
   * create or fetch a collection
   */
  ;

  _proto.collection = function collection(args) {
    var _this2 = this;

    if (typeof args === 'string') return Promise.resolve(this.collections[args]);
    args = Object.assign({}, args);
    args.database = this;
    runPluginHooks('preCreateRxCollection', args);

    if (args.name.charAt(0) === '_') {
      throw newRxError('DB2', {
        name: args.name
      });
    }

    if (this.collections[args.name]) {
      throw newRxError('DB3', {
        name: args.name
      });
    }

    if (!args.schema) {
      throw newRxError('DB4', {
        name: args.name,
        args: args
      });
    }

    var internalPrimary = _collectionNamePrimary(args.name, args.schema); // check unallowed collection-names


    if (properties().includes(args.name)) {
      throw newRxError('DB5', {
        name: args.name
      });
    }

    var schema = createRxSchema(args.schema);
    args.schema = schema; // check schemaHash

    var schemaHash = schema.hash;
    var colDoc;
    var col;
    return this.lockedRun(function () {
      return _this2._collectionsPouch.get(internalPrimary);
    })["catch"](function () {
      return null;
    }).then(function (collectionDoc) {
      colDoc = collectionDoc;

      if (collectionDoc && collectionDoc.schemaHash !== schemaHash) {
        // collection already exists with different schema, check if it has documents
        var pouch = _this2._spawnPouchDB(args.name, args.schema.version, args.pouchSettings);

        return pouch.find({
          selector: {
            _id: {}
          },
          limit: 1
        }).then(function (oneDoc) {
          if (oneDoc.docs.length !== 0) {
            // we have one document
            throw newRxError('DB6', {
              name: args.name,
              previousSchemaHash: collectionDoc.schemaHash,
              schemaHash: schemaHash
            });
          }

          return collectionDoc;
        });
      } else return collectionDoc;
    }).then(function () {
      return createRxCollection(args);
    }).then(function (collection) {
      col = collection;

      if (Object.keys(collection.schema.encryptedPaths).length > 0 && !_this2.password) {
        throw newRxError('DB7', {
          name: args.name
        });
      }

      if (!colDoc) {
        return _this2.lockedRun(function () {
          return _this2._collectionsPouch.put({
            _id: internalPrimary,
            schemaHash: schemaHash,
            schema: collection.schema.normalized,
            version: collection.schema.version
          });
        })["catch"](function () {});
      }
    }).then(function () {
      var cEvent = createChangeEvent('RxDatabase.collection', _this2, col);
      cEvent.data.v = col.name;
      cEvent.data.col = '_collections';
      _this2.collections[args.name] = col;

      if (!_this2[args.name]) {
        Object.defineProperty(_this2, args.name, {
          get: function get() {
            return _this2.collections[args.name];
          }
        });
      }

      _this2.$emit(cEvent);

      return col;
    });
  }
  /**
   * delete all data of the collection and its previous versions
   */
  ;

  _proto.removeCollection = function removeCollection(collectionName) {
    var _this3 = this;

    if (this.collections[collectionName]) this.collections[collectionName].destroy(); // remove schemas from internal db

    return _removeAllOfCollection(this, collectionName) // get all relevant pouchdb-instances
    .then(function (knownVersions) {
      return knownVersions.map(function (v) {
        return _this3._spawnPouchDB(collectionName, v);
      });
    }) // remove documents
    .then(function (pouches) {
      return Promise.all(pouches.map(function (pouch) {
        return _this3.lockedRun(function () {
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
  }
  /**
   * destroys the database-instance and all collections
   */
  ;

  _proto.destroy = function destroy() {
    var _this4 = this;

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
        return _this4.broadcastChannel.close();
      }, 1000);
    }

    if (this._leaderElector) this._leaderElector.destroy();

    this._subs.map(function (sub) {
      return sub.unsubscribe();
    }); // destroy all collections


    return Promise.all(Object.keys(this.collections).map(function (key) {
      return _this4.collections[key];
    }).map(function (col) {
      return col.destroy();
    })) // remove combination from USED_COMBINATIONS-map
    .then(function () {
      return _removeUsedCombination(_this4.name, _this4.adapter);
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
      return removeDatabase(_this5.name, _this5.adapter);
    });
  };

  _createClass(RxDatabaseBase, [{
    key: "leaderElector",
    get: function get() {
      if (!this._leaderElector) this._leaderElector = overwritable.createLeaderElector(this);
      return this._leaderElector;
    }
  }, {
    key: "isLeader",
    get: function get() {
      if (!this.multiInstance) return true;
      return this.leaderElector.isLeader;
    }
  }, {
    key: "$",
    get: function get() {
      return this.observable$;
    }
  }]);

  return RxDatabaseBase;
}();
/**
 * returns all possible properties of a RxDatabase-instance
 */

var _properties = null;
export function properties() {
  if (!_properties) {
    var pseudoInstance = new RxDatabaseBase();
    var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
    var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
    _properties = [].concat(ownProperties, prototypeProperties);
  }

  return _properties;
}
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
 * validates and inserts the password-hash
 * to ensure there is/was no other instance with a different password
 */


export function _preparePasswordHash(rxDatabase) {
  if (!rxDatabase.password) return Promise.resolve(false);
  var pwHash = hash(rxDatabase.password);
  return rxDatabase._adminPouch.get('_local/pwHash')["catch"](function () {
    return null;
  }).then(function (pwHashDoc) {
    /**
     * if pwHash was not saved, we save it,
     * this operation might throw because another instance runs save at the same time,
     * also we do not await the output because it does not mather
     */
    if (!pwHashDoc) {
      rxDatabase._adminPouch.put({
        _id: '_local/pwHash',
        value: pwHash
      })["catch"](function () {
        return null;
      });
    } // different hash was already set by other instance


    if (pwHashDoc && rxDatabase.password && pwHash !== pwHashDoc.value) {
      return rxDatabase.destroy().then(function () {
        throw newRxError('DB1', {
          passwordHash: hash(rxDatabase.password),
          existingPasswordHash: pwHashDoc.value
        });
      });
    }

    return true;
  });
}
/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */

export function _ensureStorageTokenExists(rxDatabase) {
  return rxDatabase._adminPouch.get('_local/storageToken')["catch"](function () {
    // no doc exists -> insert
    return rxDatabase._adminPouch.put({
      _id: '_local/storageToken',
      value: randomToken(10)
    })["catch"](function () {}).then(function () {
      return promiseWait(0);
    });
  }).then(function () {
    return rxDatabase._adminPouch.get('_local/storageToken');
  }).then(function (storageTokenDoc2) {
    return storageTokenDoc2.value;
  });
}
/**
 * writes the changeEvent to the broadcastChannel
 */

export function writeToSocket(rxDatabase, changeEvent) {
  if (rxDatabase.multiInstance && !changeEvent.isIntern() && rxDatabase.broadcastChannel) {
    var socketDoc = changeEvent.toJSON();
    delete socketDoc.db;
    var sendOverChannel = {
      db: rxDatabase.token,
      // database-token
      st: rxDatabase.storageToken,
      // storage-token
      d: socketDoc
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
    return rxDatabase._collectionsPouch.allDocs({
      include_docs: true
    });
  }).then(function (data) {
    var relevantDocs = data.rows.map(function (row) {
      return row.doc;
    }).filter(function (doc) {
      var name = doc._id.split('-')[0];

      return name === collectionName;
    });
    return Promise.all(relevantDocs.map(function (doc) {
      return rxDatabase.lockedRun(function () {
        return rxDatabase._collectionsPouch.remove(doc);
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
    if (msg.st !== rxDatabase.storageToken) return; // not same storage-state

    if (msg.db === rxDatabase.token) return; // same db

    var changeEvent = changeEventfromJSON(msg.d);
    rxDatabase.broadcastChannel$.next(changeEvent);
  }; // TODO only subscribe when sth is listening to the event-chain


  rxDatabase._subs.push(rxDatabase.broadcastChannel$.subscribe(function (cE) {
    rxDatabase.$emit(cE);
  }));
}
/**
 * do the async things for this database
 */


function prepare(rxDatabase) {
  rxDatabase._adminPouch = _internalAdminPouch(rxDatabase.name, rxDatabase.adapter, rxDatabase.pouchSettings);
  rxDatabase._collectionsPouch = _internalCollectionsPouch(rxDatabase.name, rxDatabase.adapter, rxDatabase.pouchSettings); // ensure admin-pouch is useable

  return rxDatabase._adminPouch.info().then(function () {
    // validate/insert password-hash
    return Promise.all([_ensureStorageTokenExists(rxDatabase), _preparePasswordHash(rxDatabase)]);
  }).then(function (_ref) {
    var storageToken = _ref[0];
    rxDatabase.storageToken = storageToken;

    if (rxDatabase.multiInstance) {
      _prepareBroadcastChannel(rxDatabase);
    }
  });
}

export function create(_ref2) {
  var name = _ref2.name,
      adapter = _ref2.adapter,
      password = _ref2.password,
      _ref2$multiInstance = _ref2.multiInstance,
      multiInstance = _ref2$multiInstance === void 0 ? true : _ref2$multiInstance,
      _ref2$queryChangeDete = _ref2.queryChangeDetection,
      queryChangeDetection = _ref2$queryChangeDete === void 0 ? false : _ref2$queryChangeDete,
      _ref2$ignoreDuplicate = _ref2.ignoreDuplicate,
      ignoreDuplicate = _ref2$ignoreDuplicate === void 0 ? false : _ref2$ignoreDuplicate,
      _ref2$options = _ref2.options,
      options = _ref2$options === void 0 ? {} : _ref2$options,
      _ref2$pouchSettings = _ref2.pouchSettings,
      pouchSettings = _ref2$pouchSettings === void 0 ? {} : _ref2$pouchSettings;
  validateCouchDBString(name); // check if pouchdb-adapter

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


  if (!USED_COMBINATIONS[name]) USED_COMBINATIONS[name] = [];
  USED_COMBINATIONS[name].push(adapter);
  var db = new RxDatabaseBase(name, adapter, password, multiInstance, queryChangeDetection, options, pouchSettings);
  return prepare(db).then(function () {
    runPluginHooks('createRxDatabase', db);
    return db;
  });
}
export function getPouchLocation(dbName, collectionName, schemaVersion) {
  var prefix = dbName + '-rxdb-' + schemaVersion + '-';

  if (!collectionName.includes('/')) {
    return prefix + collectionName;
  } else {
    // if collectionName is a path, we have to prefix the last part only
    var split = collectionName.split('/');
    var last = split.pop();
    var ret = split.join('/');
    ret += '/' + prefix + last;
    return ret;
  }
}

function _spawnPouchDB2(dbName, adapter, collectionName, schemaVersion) {
  var pouchSettings = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  var pouchSettingsFromRxDatabaseCreator = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
  var pouchLocation = getPouchLocation(dbName, collectionName, schemaVersion);
  var pouchDbParameters = {
    location: pouchLocation,
    adapter: adapterObject(adapter),
    settings: pouchSettings
  };
  var pouchDBOptions = Object.assign({}, pouchDbParameters.adapter, pouchSettingsFromRxDatabaseCreator, pouchDbParameters.settings);
  runPluginHooks('preCreatePouchDb', pouchDbParameters);
  return new PouchDB(pouchDbParameters.location, pouchDBOptions);
}

function _internalAdminPouch(name, adapter) {
  var pouchSettingsFromRxDatabaseCreator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return _spawnPouchDB2(name, adapter, '_admin', 0, {
    // no compaction because this only stores local documents
    auto_compaction: false,
    revs_limit: 1
  }, pouchSettingsFromRxDatabaseCreator);
}

function _internalCollectionsPouch(name, adapter) {
  var pouchSettingsFromRxDatabaseCreator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return _spawnPouchDB2(name, adapter, '_collections', 0, {
    // no compaction because this only stores local documents
    auto_compaction: false,
    revs_limit: 1
  }, pouchSettingsFromRxDatabaseCreator);
}
/**
 * removes the database and all its known data
 */


export function removeDatabase(databaseName, adapter) {
  var adminPouch = _internalAdminPouch(databaseName, adapter);

  var collectionsPouch = _internalCollectionsPouch(databaseName, adapter);

  return collectionsPouch.allDocs({
    include_docs: true
  }) // remove collections
  .then(function (collectionsData) {
    return Promise.all(collectionsData.rows.map(function (colDoc) {
      return colDoc.id;
    }).map(function (id) {
      var split = id.split('-');
      var name = split[0];
      var version = parseInt(split[1], 10);

      var pouch = _spawnPouchDB2(databaseName, adapter, name, version);

      return pouch.destroy();
    }));
  }) // remove internals
  .then(function () {
    return Promise.all([collectionsPouch.destroy(), adminPouch.destroy()]);
  });
}
/**
 * check is the given adapter can be used
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
  create: create,
  removeDatabase: removeDatabase,
  checkAdapter: checkAdapter,
  isInstanceOf: isInstanceOf,
  RxDatabaseBase: RxDatabaseBase,
  dbCount: dbCount
};
//# sourceMappingURL=rx-database.js.map