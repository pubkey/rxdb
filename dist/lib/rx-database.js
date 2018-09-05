"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.properties = properties;
exports.create = create;
exports.getPouchLocation = getPouchLocation;
exports.removeDatabase = removeDatabase;
exports.checkAdapter = checkAdapter;
exports.isInstanceOf = isInstanceOf;
exports.dbCount = dbCount;
exports["default"] = exports.RxDatabase = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _randomToken = _interopRequireDefault(require("random-token"));

var _customIdleQueue = _interopRequireDefault(require("custom-idle-queue"));

var _pouchDb = _interopRequireDefault(require("./pouch-db"));

var _util = require("./util");

var _rxError = _interopRequireDefault(require("./rx-error"));

var _rxCollection = _interopRequireDefault(require("./rx-collection"));

var _rxSchema = _interopRequireDefault(require("./rx-schema"));

var _rxChangeEvent = _interopRequireDefault(require("./rx-change-event"));

var _socket = _interopRequireDefault(require("./socket"));

var _overwritable = _interopRequireDefault(require("./overwritable"));

var _hooks = require("./hooks");

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

/**
 * stores the combinations
 * of used database-names with their adapters
 * so we can throw when the same database is created more then once
 * @type {Object<string, array>} map with {dbName -> array<adapters>}
 */
var USED_COMBINATIONS = {};
var DB_COUNT = 0;

var RxDatabase =
/*#__PURE__*/
function () {
  function RxDatabase(name, adapter, password, multiInstance, queryChangeDetection, options, pouchSettings) {
    if (typeof name !== 'undefined') DB_COUNT++;
    this.name = name;
    this.adapter = adapter;
    this.password = password;
    this.multiInstance = multiInstance;
    this.queryChangeDetection = queryChangeDetection;
    this.options = options;
    this.pouchSettings = pouchSettings;
    this.idleQueue = new _customIdleQueue["default"]();
    this.token = (0, _randomToken["default"])(10);
    this._subs = [];
    this.destroyed = false; // cache for collection-objects

    this.collections = {}; // rx

    this.subject = new _rxjs.Subject();
    this.observable$ = this.subject.asObservable().pipe((0, _operators.filter)(function (cEvent) {
      return _rxChangeEvent["default"].isInstanceOf(cEvent);
    }));
  }

  var _proto = RxDatabase.prototype;

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
  };
  /**
   * do the async things for this database
   */


  _proto.prepare =
  /*#__PURE__*/
  function () {
    var _prepare = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee() {
      var _this = this;

      var _ref, storageToken;

      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return this._adminPouch.info();

            case 2:
              _context.next = 4;
              return Promise.all([this._ensureStorageTokenExists(), this._preparePasswordHash()]);

            case 4:
              _ref = _context.sent;
              storageToken = _ref[0];
              this.storageToken = storageToken;

              if (this.multiInstance) {
                // socket
                this.socket = _socket["default"].create(this); // TODO only subscribe when sth is listening to the event-chain

                this._subs.push(this.socket.messages$.subscribe(function (cE) {
                  _this.$emit(cE);
                }));
              }

            case 8:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function prepare() {
      return _prepare.apply(this, arguments);
    };
  }();
  /**
   * validates and inserts the password-hash
   * to ensure there is/was no other instance with a different password
   */


  _proto._preparePasswordHash =
  /*#__PURE__*/
  function () {
    var _preparePasswordHash2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee2() {
      var pwHash, pwHashDoc;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (this.password) {
                _context2.next = 2;
                break;
              }

              return _context2.abrupt("return", false);

            case 2:
              pwHash = (0, _util.hash)(this.password);
              pwHashDoc = null;
              _context2.prev = 4;
              _context2.next = 7;
              return this._adminPouch.get('_local/pwHash');

            case 7:
              pwHashDoc = _context2.sent;
              _context2.next = 12;
              break;

            case 10:
              _context2.prev = 10;
              _context2.t0 = _context2["catch"](4);

            case 12:
              /**
               * if pwHash was not saved, we save it,
               * this operation might throw because another instance runs save at the same time,
               * also we do not await the output because it does not mather
               */
              if (!pwHashDoc) {
                this._adminPouch.put({
                  _id: '_local/pwHash',
                  value: pwHash
                })["catch"](function () {
                  return null;
                });
              } // different hash was already set by other instance


              if (!(pwHashDoc && this.password && pwHash !== pwHashDoc.value)) {
                _context2.next = 15;
                break;
              }

              throw _rxError["default"].newRxError('DB1', {
                passwordHash: (0, _util.hash)(this.password),
                existingPasswordHash: pwHashDoc.value
              });

            case 15:
              return _context2.abrupt("return", true);

            case 16:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this, [[4, 10]]);
    }));

    return function _preparePasswordHash() {
      return _preparePasswordHash2.apply(this, arguments);
    };
  }();
  /**
   * to not confuse multiInstance-messages with other databases that have the same
   * name and adapter, but do not share state with this one (for example in-memory-instances),
   * we set a storage-token and use it in the broadcast-channel
   */


  _proto._ensureStorageTokenExists =
  /*#__PURE__*/
  function () {
    var _ensureStorageTokenExists2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee3() {
      var storageTokenDoc2;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.prev = 0;
              _context3.next = 3;
              return this._adminPouch.get('_local/storageToken');

            case 3:
              _context3.next = 16;
              break;

            case 5:
              _context3.prev = 5;
              _context3.t0 = _context3["catch"](0);
              _context3.prev = 7;
              _context3.next = 10;
              return this._adminPouch.put({
                _id: '_local/storageToken',
                value: (0, _randomToken["default"])(10)
              });

            case 10:
              _context3.next = 14;
              break;

            case 12:
              _context3.prev = 12;
              _context3.t1 = _context3["catch"](7);

            case 14:
              _context3.next = 16;
              return new Promise(function (res) {
                return setTimeout(res, 0);
              });

            case 16:
              _context3.next = 18;
              return this._adminPouch.get('_local/storageToken');

            case 18:
              storageTokenDoc2 = _context3.sent;
              return _context3.abrupt("return", storageTokenDoc2.value);

            case 20:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this, [[0, 5], [7, 12]]);
    }));

    return function _ensureStorageTokenExists() {
      return _ensureStorageTokenExists2.apply(this, arguments);
    };
  }();

  /**
   * spawns a new pouch-instance
   * @param {string} collectionName
   * @param {string} schemaVersion
   * @param {Object} [pouchSettings={}] pouchSettings
   * @type {Object}
   */
  _proto._spawnPouchDB = function _spawnPouchDB(collectionName, schemaVersion) {
    var pouchSettings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return _spawnPouchDB2(this.name, this.adapter, collectionName, schemaVersion, pouchSettings, this.pouchSettings);
  };

  /**
   * @return {Promise}
   */
  _proto.waitForLeadership = function waitForLeadership() {
    if (!this.multiInstance) return Promise.resolve(true);
    return this.leaderElector.waitForLeadership();
  };
  /**
   * writes the changeEvent to the socket
   * @param  {RxChangeEvent} changeEvent
   * @return {Promise<boolean>}
   */


  _proto.writeToSocket = function writeToSocket(changeEvent) {
    if (this.multiInstance && !changeEvent.isIntern() && this.socket) {
      return this.socket.write(changeEvent).then(function () {
        return true;
      });
    } else return Promise.resolve(false);
  };
  /**
   * This is the main handle-point for all change events
   * ChangeEvents created by this instance go:
   * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
   * ChangeEvents created by other instances go:
   * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
   */


  _proto.$emit = function $emit(changeEvent) {
    if (!changeEvent) return; // emit into own stream

    this.subject.next(changeEvent); // write to socket if event was created by this instance

    if (changeEvent.data.it === this.token) {
      this.writeToSocket(changeEvent);
    }
  };
  /**
   * @return {Observable} observable
   */


  /**
   * returns the primary for a given collection-data
   * used in the internal pouchdb-instances
   * @param {string} name
   * @param {RxSchema} schema
   */
  _proto._collectionNamePrimary = function _collectionNamePrimary(name, schema) {
    return name + '-' + schema.version;
  };
  /**
   * removes the collection-doc from this._collectionsPouch
   * @return {Promise}
   */


  _proto.removeCollectionDoc = function removeCollectionDoc(name, schema) {
    var _this2 = this;

    var docId = this._collectionNamePrimary(name, schema);

    return this._collectionsPouch.get(docId).then(function (doc) {
      return _this2.lockedRun(function () {
        return _this2._collectionsPouch.remove(doc);
      });
    });
  };
  /**
   * removes all internal docs of a given collection
   * @param  {string}  collectionName
   * @return {Promise<string[]>} resolves all known collection-versions
   */


  _proto._removeAllOfCollection = function _removeAllOfCollection(collectionName) {
    var _this3 = this;

    return this.lockedRun(function () {
      return _this3._collectionsPouch.allDocs({
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
        return _this3.lockedRun(function () {
          return _this3._collectionsPouch.remove(doc);
        });
      })).then(function () {
        return relevantDocs.map(function (doc) {
          return doc.version;
        });
      });
    });
  };
  /**
   * create or fetch a collection
   * @param {{name: string, schema: Object, pouchSettings = {}, migrationStrategies = {}}} args
   * @return {Collection}
   */


  _proto.collection =
  /*#__PURE__*/
  function () {
    var _collection = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee4(args) {
      var _this4 = this;

      var internalPrimary, schemaHash, collectionDoc, pouch, oneDoc, collection, cEvent;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              if (!(typeof args === 'string')) {
                _context4.next = 2;
                break;
              }

              return _context4.abrupt("return", this.collections[args]);

            case 2:
              args.database = this;
              (0, _hooks.runPluginHooks)('preCreateRxCollection', args);

              if (!(args.name.charAt(0) === '_')) {
                _context4.next = 6;
                break;
              }

              throw _rxError["default"].newRxError('DB2', {
                name: args.name
              });

            case 6:
              if (!this.collections[args.name]) {
                _context4.next = 8;
                break;
              }

              throw _rxError["default"].newRxError('DB3', {
                name: args.name
              });

            case 8:
              if (args.schema) {
                _context4.next = 10;
                break;
              }

              throw _rxError["default"].newRxError('DB4', {
                name: args.name,
                args: args
              });

            case 10:
              internalPrimary = this._collectionNamePrimary(args.name, args.schema); // check unallowed collection-names

              if (!properties().includes(args.name)) {
                _context4.next = 13;
                break;
              }

              throw _rxError["default"].newRxError('DB5', {
                name: args.name
              });

            case 13:
              args.schema = _rxSchema["default"].create(args.schema); // check schemaHash

              schemaHash = args.schema.hash;
              collectionDoc = null;
              _context4.prev = 16;
              _context4.next = 19;
              return this.lockedRun(function () {
                return _this4._collectionsPouch.get(internalPrimary);
              });

            case 19:
              collectionDoc = _context4.sent;
              _context4.next = 24;
              break;

            case 22:
              _context4.prev = 22;
              _context4.t0 = _context4["catch"](16);

            case 24:
              if (!(collectionDoc && collectionDoc.schemaHash !== schemaHash)) {
                _context4.next = 31;
                break;
              }

              // collection already exists with different schema, check if it has documents
              pouch = this._spawnPouchDB(args.name, args.schema.version, args.pouchSettings);
              _context4.next = 28;
              return pouch.find({
                selector: {
                  _id: {}
                },
                limit: 1
              });

            case 28:
              oneDoc = _context4.sent;

              if (!(oneDoc.docs.length !== 0)) {
                _context4.next = 31;
                break;
              }

              throw _rxError["default"].newRxError('DB6', {
                name: args.name,
                previousSchemaHash: collectionDoc.schemaHash,
                schemaHash: schemaHash
              });

            case 31:
              _context4.next = 33;
              return _rxCollection["default"].create(args);

            case 33:
              collection = _context4.sent;

              if (!(Object.keys(collection.schema.encryptedPaths).length > 0 && !this.password)) {
                _context4.next = 36;
                break;
              }

              throw _rxError["default"].newRxError('DB7', {
                name: args.name
              });

            case 36:
              if (collectionDoc) {
                _context4.next = 44;
                break;
              }

              _context4.prev = 37;
              _context4.next = 40;
              return this.lockedRun(function () {
                return _this4._collectionsPouch.put({
                  _id: internalPrimary,
                  schemaHash: schemaHash,
                  schema: collection.schema.normalized,
                  version: collection.schema.version
                });
              });

            case 40:
              _context4.next = 44;
              break;

            case 42:
              _context4.prev = 42;
              _context4.t1 = _context4["catch"](37);

            case 44:
              cEvent = _rxChangeEvent["default"].create('RxDatabase.collection', this);
              cEvent.data.v = collection.name;
              cEvent.data.col = '_collections';
              this.$emit(cEvent);
              this.collections[args.name] = collection;

              this.__defineGetter__(args.name, function () {
                return _this4.collections[args.name];
              });

              return _context4.abrupt("return", collection);

            case 51:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, this, [[16, 22], [37, 42]]);
    }));

    return function collection(_x) {
      return _collection.apply(this, arguments);
    };
  }();
  /**
   * delete all data of the collection and its previous versions
   * @param  {string}  collectionName
   * @return {Promise}
   */


  _proto.removeCollection =
  /*#__PURE__*/
  function () {
    var _removeCollection = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee5(collectionName) {
      var _this5 = this;

      var knownVersions, pouches;
      return _regenerator["default"].wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              if (!this.collections[collectionName]) {
                _context5.next = 3;
                break;
              }

              _context5.next = 3;
              return this.collections[collectionName].destroy();

            case 3:
              _context5.next = 5;
              return this._removeAllOfCollection(collectionName);

            case 5:
              knownVersions = _context5.sent;
              // get all relevant pouchdb-instances
              pouches = knownVersions.map(function (v) {
                return _this5._spawnPouchDB(collectionName, v);
              }); // remove documents

              return _context5.abrupt("return", Promise.all(pouches.map(function (pouch) {
                return _this5.lockedRun(function () {
                  return pouch.destroy();
                });
              })));

            case 8:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));

    return function removeCollection(_x2) {
      return _removeCollection.apply(this, arguments);
    };
  }();
  /**
   * runs the given function between idleQueue-locking
   * @return {any}
   */


  _proto.lockedRun = function lockedRun(fun) {
    return this.idleQueue.wrapCall(fun);
  };

  _proto.requestIdlePromise = function requestIdlePromise() {
    return this.idleQueue.requestIdlePromise();
  };
  /**
   * export to json
   * @param {boolean} decrypted
   * @param {?string[]} collections array with collectionNames or null if all
   */


  _proto.dump = function dump() {
    throw _rxError["default"].pluginMissing('json-dump');
  };
  /**
   * import json
   * @param {Object} dump
   */


  _proto.importDump = function importDump() {
    throw _rxError["default"].pluginMissing('json-dump');
  };
  /**
   * spawn server
   */


  _proto.server = function server() {
    throw _rxError["default"].pluginMissing('server');
  };
  /**
   * destroys the database-instance and all collections
   * @return {Promise}
   */


  _proto.destroy =
  /*#__PURE__*/
  function () {
    var _destroy = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee6() {
      var _this6 = this;

      return _regenerator["default"].wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              if (!this.destroyed) {
                _context6.next = 2;
                break;
              }

              return _context6.abrupt("return");

            case 2:
              (0, _hooks.runPluginHooks)('preDestroyRxDatabase', this);
              DB_COUNT--;
              this.destroyed = true;
              this.socket && this.socket.destroy();

              if (!this._leaderElector) {
                _context6.next = 9;
                break;
              }

              _context6.next = 9;
              return this._leaderElector.destroy();

            case 9:
              this._subs.map(function (sub) {
                return sub.unsubscribe();
              }); // destroy all collections


              _context6.next = 12;
              return Promise.all(Object.keys(this.collections).map(function (key) {
                return _this6.collections[key];
              }).map(function (col) {
                return col.destroy();
              }));

            case 12:
              // remove combination from USED_COMBINATIONS-map
              _removeUsedCombination(this.name, this.adapter);

            case 13:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));

    return function destroy() {
      return _destroy.apply(this, arguments);
    };
  }();
  /**
   * deletes the database and its stored data
   * @return {Promise}
   */


  _proto.remove = function remove() {
    var _this7 = this;

    return this.destroy().then(function () {
      return removeDatabase(_this7.name, _this7.adapter);
    });
  };

  (0, _createClass2["default"])(RxDatabase, [{
    key: "_adminPouch",
    get: function get() {
      if (!this.__adminPouch) this.__adminPouch = _internalAdminPouch(this.name, this.adapter, this.pouchSettings);
      return this.__adminPouch;
    }
  }, {
    key: "_collectionsPouch",
    get: function get() {
      if (!this.__collectionsPouch) this.__collectionsPouch = _internalCollectionsPouch(this.name, this.adapter, this.pouchSettings);
      return this.__collectionsPouch;
    }
  }, {
    key: "leaderElector",
    get: function get() {
      if (!this._leaderElector) this._leaderElector = _overwritable["default"].createLeaderElector(this);
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
  return RxDatabase;
}();
/**
 * returns all possible properties of a RxDatabase-instance
 * @return {string[]} property-names
 */


exports.RxDatabase = RxDatabase;
var _properties = null;

function properties() {
  if (!_properties) {
    var pseudoInstance = new RxDatabase();
    var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
    var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
    _properties = ownProperties.concat(prototypeProperties);
  }

  return _properties;
}
/**
 * checks if an instance with same name and adapter already exists
 * @param       {string}  name
 * @param       {any}  adapter
 * @throws {RxError} if used
 */


function _isNameAdapterUsed(name, adapter) {
  if (!USED_COMBINATIONS[name]) return false;
  var used = false;
  USED_COMBINATIONS[name].forEach(function (ad) {
    if (ad === adapter) used = true;
  });

  if (used) {
    throw _rxError["default"].newRxError('DB8', {
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

function create(_ref2) {
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
  (0, _util.validateCouchDBString)(name); // check if pouchdb-adapter

  if (typeof adapter === 'string') {
    if (!_pouchDb["default"].adapters || !_pouchDb["default"].adapters[adapter]) {
      throw _rxError["default"].newRxError('DB9', {
        adapter: adapter
      });
    }
  } else {
    (0, _util.isLevelDown)(adapter);

    if (!_pouchDb["default"].adapters || !_pouchDb["default"].adapters.leveldb) {
      throw _rxError["default"].newRxError('DB10', {
        adapter: adapter
      });
    }
  }

  if (password) {
    _overwritable["default"].validatePassword(password);
  } // check if combination already used


  if (!ignoreDuplicate) {
    _isNameAdapterUsed(name, adapter);
  } // add to used_map


  if (!USED_COMBINATIONS[name]) USED_COMBINATIONS[name] = [];
  USED_COMBINATIONS[name].push(adapter);
  var db = new RxDatabase(name, adapter, password, multiInstance, queryChangeDetection, options, pouchSettings);
  return db.prepare().then(function () {
    (0, _hooks.runPluginHooks)('createRxDatabase', db);
    return db;
  });
}

function getPouchLocation(dbName, collectionName, schemaVersion) {
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
    adapter: (0, _util.adapterObject)(adapter),
    settings: pouchSettings
  };
  var pouchDBOptions = Object.assign({}, pouchDbParameters.adapter, pouchSettingsFromRxDatabaseCreator);
  (0, _hooks.runPluginHooks)('preCreatePouchDb', pouchDbParameters);
  return new _pouchDb["default"](pouchDbParameters.location, pouchDBOptions, pouchDbParameters.settings);
}

function _internalAdminPouch(name, adapter) {
  var pouchSettingsFromRxDatabaseCreator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return _spawnPouchDB2(name, adapter, '_admin', 0, {
    auto_compaction: false,
    // no compaction because this only stores local documents
    revs_limit: 1
  }, pouchSettingsFromRxDatabaseCreator);
}

function _internalCollectionsPouch(name, adapter) {
  var pouchSettingsFromRxDatabaseCreator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return _spawnPouchDB2(name, adapter, '_collections', 0, {
    auto_compaction: false,
    // no compaction because this only stores local documents
    revs_limit: 1
  }, pouchSettingsFromRxDatabaseCreator);
}
/**
 *
 * @return {Promise}
 */


function removeDatabase(databaseName, adapter) {
  var adminPouch = _internalAdminPouch(databaseName, adapter);

  var collectionsPouch = _internalCollectionsPouch(databaseName, adapter);

  collectionsPouch.allDocs({
    include_docs: true
  }).then(function (collectionsData) {
    // remove collections
    Promise.all(collectionsData.rows.map(function (colDoc) {
      return colDoc.id;
    }).map(function (id) {
      var split = id.split('-');
      var name = split[0];
      var version = parseInt(split[1], 10);

      var pouch = _spawnPouchDB2(databaseName, adapter, name, version);

      return pouch.destroy();
    })); // remove internals

    return Promise.all([collectionsPouch.destroy(), adminPouch.destroy()]);
  });
}
/**
 * check is the given adapter can be used
 * @return {Promise}
 */


function checkAdapter(adapter) {
  return _overwritable["default"].checkAdapter(adapter);
}

function isInstanceOf(obj) {
  return obj instanceof RxDatabase;
}

function dbCount() {
  return DB_COUNT;
}

var _default = {
  create: create,
  removeDatabase: removeDatabase,
  checkAdapter: checkAdapter,
  isInstanceOf: isInstanceOf,
  RxDatabase: RxDatabase,
  RxSchema: _rxSchema["default"],
  dbCount: dbCount
};
exports["default"] = _default;
