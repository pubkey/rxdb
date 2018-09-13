"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.properties = properties;
exports.getDocumentOrmPrototype = getDocumentOrmPrototype;
exports.create = create;
exports.isInstanceOf = isInstanceOf;
exports["default"] = exports.RxCollection = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _operators = require("rxjs/operators");

var _util = require("./util");

var _rxDocument = _interopRequireDefault(require("./rx-document"));

var _rxQuery = _interopRequireDefault(require("./rx-query"));

var _rxSchema = _interopRequireDefault(require("./rx-schema"));

var _rxChangeEvent = _interopRequireDefault(require("./rx-change-event"));

var _rxError = _interopRequireDefault(require("./rx-error"));

var _dataMigrator = _interopRequireWildcard(require("./data-migrator"));

var _crypter = _interopRequireDefault(require("./crypter"));

var _docCache = _interopRequireDefault(require("./doc-cache"));

var _queryCache = _interopRequireDefault(require("./query-cache"));

var _changeEventBuffer = _interopRequireDefault(require("./change-event-buffer"));

var _overwritable = _interopRequireDefault(require("./overwritable"));

var _hooks = require("./hooks");

var RxCollection =
/*#__PURE__*/
function () {
  function RxCollection(database, name, schema) {
    var pouchSettings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    var migrationStrategies = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    var methods = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
    var attachments = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
    var options = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
    var statics = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : {};
    this._isInMemory = false;
    this.destroyed = false;
    this.database = database;
    this.name = name;
    this.schema = schema;
    this._migrationStrategies = migrationStrategies;
    this._pouchSettings = pouchSettings;
    this._methods = methods; // orm of documents

    this._attachments = attachments; // orm of attachments

    this.options = options;
    this._atomicUpsertQueues = new Map();
    this._statics = statics;
    this._docCache = _docCache["default"].create();
    this._queryCache = _queryCache["default"].create(); // defaults

    this.synced = false;
    this.hooks = {};
    this._subs = [];
    this._repStates = [];
    this.pouch = null; // this is needed to preserve this name

    _applyHookFunctions(this);
  }

  var _proto = RxCollection.prototype;

  _proto.prepare = function prepare() {
    var _this = this;

    this.pouch = this.database._spawnPouchDB(this.name, this.schema.version, this._pouchSettings);

    if (this.schema.doKeyCompression()) {
      this._keyCompressor = _overwritable["default"].createKeyCompressor(this.schema);
    } // we trigger the non-blocking things first and await them later so we can do stuff in the mean time


    var spawnedPouchPromise = this.pouch.info(); // resolved when the pouchdb is useable

    var createIndexesPromise = _prepareCreateIndexes(this, spawnedPouchPromise);

    this._dataMigrator = _dataMigrator["default"].create(this, this._migrationStrategies);
    this._crypter = _crypter["default"].create(this.database.password, this.schema);
    this._observable$ = this.database.$.pipe((0, _operators.filter)(function (event) {
      return event.data.col === _this.name;
    }));
    this._changeEventBuffer = _changeEventBuffer["default"].create(this);

    this._subs.push(this._observable$.pipe((0, _operators.filter)(function (cE) {
      return !cE.data.isLocal;
    })).subscribe(function (cE) {
      // when data changes, send it to RxDocument in docCache
      var doc = _this._docCache.get(cE.data.doc);

      if (doc) doc._handleChangeEvent(cE);
    }));

    return Promise.all([spawnedPouchPromise, createIndexesPromise]);
  };
  /**
   * merge the prototypes of schema, orm-methods and document-base
   * so we do not have to assing getters/setters and orm methods to each document-instance
   */


  _proto.getDocumentPrototype = function getDocumentPrototype() {
    if (!this._getDocumentPrototype) {
      var schemaProto = this.schema.getDocumentPrototype();
      var ormProto = getDocumentOrmPrototype(this);
      var baseProto = _rxDocument["default"].basePrototype;
      var proto = {};
      [schemaProto, ormProto, baseProto].forEach(function (obj) {
        var props = Object.getOwnPropertyNames(obj);
        props.forEach(function (key) {
          var desc = Object.getOwnPropertyDescriptor(obj, key);
          /**
           * When enumerable is true, it will show on console.dir(instance)
           * To not polute the output, only getters and methods are enumerable
           */

          var enumerable = true;
          if (key.startsWith('_') || key.endsWith('_') || key.startsWith('$') || key.endsWith('$')) enumerable = false;

          if (typeof desc.value === 'function') {
            // when getting a function, we automatically do a .bind(this)
            Object.defineProperty(proto, key, {
              get: function get() {
                return desc.value.bind(this);
              },
              enumerable: enumerable,
              configurable: false
            });
          } else {
            desc.enumerable = enumerable;
            desc.configurable = false;
            if (desc.writable) desc.writable = false;
            Object.defineProperty(proto, key, desc);
          }
        });
      });
      this._getDocumentPrototype = proto;
    }

    return this._getDocumentPrototype;
  };

  _proto.getDocumentConstructor = function getDocumentConstructor() {
    if (!this._getDocumentConstructor) {
      this._getDocumentConstructor = _rxDocument["default"].createRxDocumentConstructor(this.getDocumentPrototype());
    }

    return this._getDocumentConstructor;
  };
  /**
   * checks if a migration is needed
   * @return {Promise<boolean>}
   */


  _proto.migrationNeeded = function migrationNeeded() {
    return (0, _dataMigrator.mustMigrate)(this._dataMigrator);
  };
  /**
   * @param {number} [batchSize=10] amount of documents handled in parallel
   * @return {Observable} emits the migration-status
   */


  _proto.migrate = function migrate() {
    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    return this._dataMigrator.migrate(batchSize);
  };
  /**
   * does the same thing as .migrate() but returns promise
   * @param {number} [batchSize=10] amount of documents handled in parallel
   * @return {Promise} resolves when finished
   */


  _proto.migratePromise = function migratePromise() {
    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    return this._dataMigrator.migratePromise(batchSize);
  };
  /**
   * wrappers for Pouch.put/get to handle keycompression etc
   */


  _proto._handleToPouch = function _handleToPouch(docData) {
    var data = (0, _util.clone)(docData);
    data = this._crypter.encrypt(data);
    data = this.schema.swapPrimaryToId(data);
    if (this.schema.doKeyCompression()) data = this._keyCompressor.compress(data);
    return data;
  };

  _proto._handleFromPouch = function _handleFromPouch(docData) {
    var noDecrypt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var data = (0, _util.clone)(docData);
    data = this.schema.swapIdToPrimary(data);
    if (this.schema.doKeyCompression()) data = this._keyCompressor.decompress(data);
    if (noDecrypt) return data;
    data = this._crypter.decrypt(data);
    return data;
  };
  /**
   * every write on the pouchdb
   * is tunneld throught this function
   * @param {object} obj
   * @param {boolean} [overwrite=false] if true, it will overwrite existing document
   * @return {Promise}
   */


  _proto._pouchPut =
  /*#__PURE__*/
  function () {
    var _pouchPut2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee(obj) {
      var _this2 = this;

      var overwrite,
          ret,
          exist,
          _args = arguments;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              overwrite = _args.length > 1 && _args[1] !== undefined ? _args[1] : false;
              obj = this._handleToPouch(obj);
              ret = null;
              _context.prev = 3;
              _context.next = 6;
              return this.database.lockedRun(function () {
                return _this2.pouch.put(obj);
              });

            case 6:
              ret = _context.sent;
              _context.next = 22;
              break;

            case 9:
              _context.prev = 9;
              _context.t0 = _context["catch"](3);

              if (!(overwrite && _context.t0.status === 409)) {
                _context.next = 21;
                break;
              }

              _context.next = 14;
              return this.database.lockedRun(function () {
                return _this2.pouch.get(obj._id);
              });

            case 14:
              exist = _context.sent;
              obj._rev = exist._rev;
              _context.next = 18;
              return this.database.lockedRun(function () {
                return _this2.pouch.put(obj);
              });

            case 18:
              ret = _context.sent;
              _context.next = 22;
              break;

            case 21:
              throw _context.t0;

            case 22:
              return _context.abrupt("return", ret);

            case 23:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this, [[3, 9]]);
    }));

    return function _pouchPut(_x) {
      return _pouchPut2.apply(this, arguments);
    };
  }();
  /**
   * get document from pouchdb by its _id
   * @param  {[type]} key [description]
   * @return {[type]}     [description]
   */


  _proto._pouchGet = function _pouchGet(key) {
    var _this3 = this;

    return this.pouch.get(key).then(function (doc) {
      return _this3._handleFromPouch(doc);
    });
  };
  /**
   * wrapps pouch-find
   * @param {RxQuery} rxQuery
   * @param {?number} limit overwrites the limit
   * @param {?boolean} noDecrypt if true, decryption will not be made
   * @return {Object[]} array with documents-data
   */


  _proto._pouchFind = function _pouchFind(rxQuery, limit) {
    var _this4 = this;

    var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var compressedQueryJSON = rxQuery.keyCompress();
    if (limit) compressedQueryJSON.limit = limit;
    return this.database.lockedRun(function () {
      return _this4.pouch.find(compressedQueryJSON);
    }).then(function (docsCompressed) {
      var docs = docsCompressed.docs.map(function (doc) {
        return _this4._handleFromPouch(doc, noDecrypt);
      });
      return docs;
    });
  };
  /**
   * create a RxDocument-instance from the jsonData
   * @param {Object} json documentData
   * @return {RxDocument}
   */


  _proto._createDocument = function _createDocument(json) {
    // return from cache if exsists
    var id = json[this.schema.primaryPath];

    var cacheDoc = this._docCache.get(id);

    if (cacheDoc) return cacheDoc;

    var doc = _rxDocument["default"].createWithConstructor(this.getDocumentConstructor(), this, json);

    this._docCache.set(id, doc);

    this._runHooksSync('post', 'create', json, doc);

    (0, _hooks.runPluginHooks)('postCreateRxDocument', doc);
    return doc;
  };
  /**
   * create RxDocument from the docs-array
   * @return {Promise<RxDocument[]>} documents
   */


  _proto._createDocuments = function _createDocuments(docsJSON) {
    var _this5 = this;

    return docsJSON.map(function (json) {
      return _this5._createDocument(json);
    });
  };
  /**
   * returns observable
   */


  _proto.$emit = function $emit(changeEvent) {
    return this.database.$emit(changeEvent);
  };
  /**
   * @param {Object|RxDocument} json data or RxDocument if temporary
   * @param {RxDocument} doc which was created
   * @return {Promise<RxDocument>}
   */


  _proto.insert = function insert(json) {
    var _this6 = this;

    // inserting a temporary-document
    var tempDoc = null;

    if (_rxDocument["default"].isInstanceOf(json)) {
      tempDoc = json;

      if (!json._isTemporary) {
        throw _rxError["default"].newRxError('COL1', {
          data: json
        });
      }

      json = json.toJSON();
    }

    json = (0, _util.clone)(json);
    json = this.schema.fillObjectWithDefaults(json);

    if (json._id) {
      throw _rxError["default"].newRxError('COL2', {
        data: json
      });
    } // fill _id


    if (this.schema.primaryPath === '_id' && !json._id) json._id = (0, _util.generateId)();
    var newDoc = tempDoc;
    return this._runHooks('pre', 'insert', json).then(function () {
      _this6.schema.validate(json);

      return _this6._pouchPut(json);
    }).then(function (insertResult) {
      json[_this6.schema.primaryPath] = insertResult.id;
      json._rev = insertResult.rev;

      if (tempDoc) {
        tempDoc._dataSync$.next(json);
      } else newDoc = _this6._createDocument(json);

      return _this6._runHooks('post', 'insert', json, newDoc);
    }).then(function () {
      // event
      var emitEvent = _rxChangeEvent["default"].create('INSERT', _this6.database, _this6, newDoc, json);

      _this6.$emit(emitEvent);

      return newDoc;
    });
  };
  /**
   * same as insert but overwrites existing document with same primary
   * @return {Promise<RxDocument>}
   */


  _proto.upsert = function upsert(json) {
    var _this7 = this;

    json = (0, _util.clone)(json);
    var primary = json[this.schema.primaryPath];

    if (!primary) {
      throw _rxError["default"].newRxError('COL3', {
        primaryPath: this.schema.primaryPath,
        data: json
      });
    }

    return this.findOne(primary).exec().then(function (existing) {
      if (existing) {
        json._rev = existing._rev;
        return existing.atomicUpdate(function () {
          return json;
        }).then(function () {
          return existing;
        });
      } else {
        return _this7.insert(json);
      }
    });
  };
  /**
   * upserts to a RxDocument, uses atomicUpdate if document already exists
   * @param  {object}  json
   * @return {Promise}
   */


  _proto.atomicUpsert = function atomicUpsert(json) {
    var _this8 = this;

    json = (0, _util.clone)(json);
    var primary = json[this.schema.primaryPath];

    if (!primary) {
      throw _rxError["default"].newRxError('COL4', {
        data: json
      });
    } // ensure that it wont try 2 parallel runs


    var queue;

    if (!this._atomicUpsertQueues.has(primary)) {
      queue = Promise.resolve();
    } else {
      queue = this._atomicUpsertQueues.get(primary);
    }

    queue = queue.then(function () {
      return _atomicUpsertEnsureRxDocumentExists(_this8, primary, json);
    }).then(function (wasInserted) {
      if (!wasInserted.inserted) {
        return _atomicUpsertUpdate(wasInserted.doc, json).then(function () {
          return (0, _util.nextTick)();
        }) // tick here so the event can propagate
        .then(function () {
          return wasInserted.doc;
        });
      } else return wasInserted.doc;
    });

    this._atomicUpsertQueues.set(primary, queue);

    return queue;
  };
  /**
   * takes a mongoDB-query-object and returns the documents
   * @param  {object} queryObj
   * @return {RxDocument[]} found documents
   */


  _proto.find = function find(queryObj) {
    if (typeof queryObj === 'string') {
      throw _rxError["default"].newRxError('COL5', {
        queryObj: queryObj
      });
    }

    var query = _rxQuery["default"].create('find', queryObj, this);

    return query;
  };

  _proto.findOne = function findOne(queryObj) {
    var query;

    if (typeof queryObj === 'string') {
      query = _rxQuery["default"].create('findOne', {
        _id: queryObj
      }, this);
    } else query = _rxQuery["default"].create('findOne', queryObj, this);

    if (typeof queryObj === 'number' || Array.isArray(queryObj)) {
      throw _rxError["default"].newRxTypeError('COL6', {
        queryObj: queryObj
      });
    }

    return query;
  };
  /**
   * export to json
   * @param {boolean} decrypted if true, all encrypted values will be decrypted
   */


  _proto.dump = function dump() {
    throw _rxError["default"].pluginMissing('json-dump');
  };
  /**
   * imports the json-data into the collection
   * @param {Array} exportedJSON should be an array of raw-data
   */


  _proto.importDump = function importDump() {
    throw _rxError["default"].pluginMissing('json-dump');
  };
  /**
   * waits for external changes to the database
   * and ensures they are emitted to the internal RxChangeEvent-Stream
   * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
   */


  _proto.watchForChanges = function watchForChanges() {
    throw _rxError["default"].pluginMissing('watch-for-changes');
  };
  /**
   * sync with another database
   */


  _proto.sync = function sync() {
    throw _rxError["default"].pluginMissing('replication');
  };
  /**
   * Create a replicated in-memory-collection
   */


  _proto.inMemory = function inMemory() {
    throw _rxError["default"].pluginMissing('in-memory');
  };
  /**
   * HOOKS
   */


  _proto.addHook = function addHook(when, key, fun) {
    var parallel = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

    if (typeof fun !== 'function') {
      throw _rxError["default"].newRxTypeError('COL7', {
        key: key,
        when: when
      });
    }

    if (!HOOKS_WHEN.includes(when)) {
      throw _rxError["default"].newRxTypeError('COL8', {
        key: key,
        when: when
      });
    }

    if (!HOOKS_KEYS.includes(key)) {
      throw _rxError["default"].newRxError('COL9', {
        key: key
      });
    }

    if (when === 'post' && key === 'create' && parallel === true) {
      throw _rxError["default"].newRxError('COL10', {
        when: when,
        key: key,
        parallel: parallel
      });
    } // bind this-scope to hook-function


    var boundFun = fun.bind(this);
    var runName = parallel ? 'parallel' : 'series';
    this.hooks[key] = this.hooks[key] || {};
    this.hooks[key][when] = this.hooks[key][when] || {
      series: [],
      parallel: []
    };
    this.hooks[key][when][runName].push(boundFun);
  };

  _proto.getHooks = function getHooks(when, key) {
    try {
      return this.hooks[key][when];
    } catch (e) {
      return {
        series: [],
        parallel: []
      };
    }
  };
  /**
   * @return {Promise<void>}
   */


  _proto._runHooks = function _runHooks(when, key, data, instance) {
    var hooks = this.getHooks(when, key);
    if (!hooks) return Promise.resolve(); // run parallel: false

    var tasks = hooks.series.map(function (hook) {
      return function () {
        return hook(data, instance);
      };
    });
    return (0, _util.promiseSeries)(tasks) // run parallel: true
    .then(function () {
      return Promise.all(hooks.parallel.map(function (hook) {
        return hook(data, instance);
      }));
    });
  };
  /**
   * does the same as ._runHooks() but with non-async-functions
   */


  _proto._runHooksSync = function _runHooksSync(when, key, data, instance) {
    var hooks = this.getHooks(when, key);
    if (!hooks) return;
    hooks.series.forEach(function (hook) {
      return hook(data, instance);
    });
  };
  /**
   * creates a temporaryDocument which can be saved later
   * @param {Object} docData
   * @return {RxDocument}
   */


  _proto.newDocument = function newDocument() {
    var docData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    docData = this.schema.fillObjectWithDefaults(docData);

    var doc = _rxDocument["default"].createWithConstructor(this.getDocumentConstructor(), this, docData);

    doc._isTemporary = true;

    this._runHooksSync('post', 'create', docData, doc);

    return doc;
  };
  /**
   * returns a promise that is resolved when the collection gets destroyed
   * @return {Promise}
   */


  _proto.destroy = function destroy() {
    if (this.destroyed) return;
    this._onDestroyCall && this._onDestroyCall();

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });

    this._changeEventBuffer && this._changeEventBuffer.destroy();

    this._queryCache.destroy();

    this._repStates.forEach(function (sync) {
      return sync.cancel();
    });

    delete this.database.collections[this.name];
    this.destroyed = true;
  };
  /**
   * remove all data
   * @return {Promise}
   */


  _proto.remove = function remove() {
    return this.database.removeCollection(this.name);
  };

  (0, _createClass2["default"])(RxCollection, [{
    key: "$",
    get: function get() {
      return this._observable$;
    }
  }, {
    key: "insert$",
    get: function get() {
      return this.$.pipe((0, _operators.filter)(function (cE) {
        return cE.data.op === 'INSERT';
      }));
    }
  }, {
    key: "update$",
    get: function get() {
      return this.$.pipe((0, _operators.filter)(function (cE) {
        return cE.data.op === 'UPDATE';
      }));
    }
  }, {
    key: "remove$",
    get: function get() {
      return this.$.pipe((0, _operators.filter)(function (cE) {
        return cE.data.op === 'REMOVE';
      }));
    }
    /**
     * only emits the change-events that change something with the documents
     */

  }, {
    key: "docChanges$",
    get: function get() {
      if (!this.__docChanges$) {
        this.__docChanges$ = this.$.pipe((0, _operators.filter)(function (cEvent) {
          return ['INSERT', 'UPDATE', 'REMOVE'].includes(cEvent.data.op);
        }));
      }

      return this.__docChanges$;
    }
  }, {
    key: "onDestroy",
    get: function get() {
      var _this9 = this;

      if (!this._onDestroy) this._onDestroy = new Promise(function (res) {
        return _this9._onDestroyCall = res;
      });
      return this._onDestroy;
    }
  }]);
  return RxCollection;
}();
/**
 * checks if the migrationStrategies are ok, throws if not
 * @param  {RxSchema} schema
 * @param  {Object} migrationStrategies
 * @throws {Error|TypeError} if not ok
 * @return {boolean}
 */


exports.RxCollection = RxCollection;

var checkMigrationStrategies = function checkMigrationStrategies(schema, migrationStrategies) {
  // migrationStrategies must be object not array
  if ((0, _typeof2["default"])(migrationStrategies) !== 'object' || Array.isArray(migrationStrategies)) {
    throw _rxError["default"].newRxTypeError('COL11', {
      schema: schema
    });
  } // for every previousVersion there must be strategy


  if (schema.previousVersions.length !== Object.keys(migrationStrategies).length) {
    throw _rxError["default"].newRxError('COL12', {
      have: Object.keys(migrationStrategies),
      should: schema.previousVersions
    });
  } // every strategy must have number as property and be a function


  schema.previousVersions.map(function (vNr) {
    return {
      v: vNr,
      s: migrationStrategies[vNr + 1 + '']
    };
  }).filter(function (strat) {
    return typeof strat.s !== 'function';
  }).forEach(function (strat) {
    throw _rxError["default"].newRxTypeError('COL13', {
      version: strat.v,
      type: (0, _typeof2["default"])(strat),
      schema: schema
    });
  });
  return true;
};

var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
var hooksApplied = false;
/**
 * adds the hook-functions to the collections prototype
 * this runs only once
 */

function _applyHookFunctions(collection) {
  if (hooksApplied) return; // already run

  hooksApplied = true;
  var colProto = Object.getPrototypeOf(collection);
  HOOKS_KEYS.forEach(function (key) {
    HOOKS_WHEN.map(function (when) {
      var fnName = when + (0, _util.ucfirst)(key);

      colProto[fnName] = function (fun, parallel) {
        return this.addHook(when, key, fun, parallel);
      };
    });
  });
}
/**
 * returns all possible properties of a RxCollection-instance
 * @return {string[]} property-names
 */


var _properties = null;

function properties() {
  if (!_properties) {
    var pseudoInstance = new RxCollection();
    var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
    var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
    _properties = ownProperties.concat(prototypeProperties);
  }

  return _properties;
}
/**
 * checks if the given static methods are allowed
 * @param  {{}} statics [description]
 * @throws if not allowed
 */


var checkOrmMethods = function checkOrmMethods(statics) {
  Object.entries(statics).forEach(function (_ref) {
    var k = _ref[0],
        v = _ref[1];

    if (typeof k !== 'string') {
      throw _rxError["default"].newRxTypeError('COL14', {
        name: k
      });
    }

    if (k.startsWith('_')) {
      throw _rxError["default"].newRxTypeError('COL15', {
        name: k
      });
    }

    if (typeof v !== 'function') {
      throw _rxError["default"].newRxTypeError('COL16', {
        name: k,
        type: (0, _typeof2["default"])(k)
      });
    }

    if (properties().includes(k) || _rxDocument["default"].properties().includes(k)) {
      throw _rxError["default"].newRxError('COL17', {
        name: k
      });
    }
  });
};
/**
 * @return {Promise}
 */


function _atomicUpsertUpdate(doc, json) {
  return doc.atomicUpdate(function (innerDoc) {
    json._rev = innerDoc._rev;
    innerDoc._data = json;
    return innerDoc._data;
  }).then(function () {
    return doc;
  });
}
/**
 * ensures that the given document exists
 * @param  {string}  primary
 * @param  {any}  json
 * @return {Promise<{ doc: RxDocument, inserted: boolean}>} promise that resolves with new doc and flag if inserted
 */


function _atomicUpsertEnsureRxDocumentExists(rxCollection, primary, json) {
  return rxCollection.findOne(primary).exec().then(function (doc) {
    if (!doc) {
      return rxCollection.insert(json).then(function (newDoc) {
        return {
          doc: newDoc,
          inserted: true
        };
      });
    } else {
      return {
        doc: doc,
        inserted: false
      };
    }
  });
}
/**
 * returns the prototype-object
 * that contains the orm-methods,
 * used in the proto-merge
 * @return {{}}
 */


function getDocumentOrmPrototype(rxCollection) {
  var proto = {};
  Object.entries(rxCollection._methods).forEach(function (_ref2) {
    var k = _ref2[0],
        v = _ref2[1];
    proto[k] = v;
  });
  return proto;
}
/**
 * creates the indexes in the pouchdb
 */


function _prepareCreateIndexes(rxCollection, spawnedPouchPromise) {
  return Promise.all(rxCollection.schema.indexes.map(function (indexAr) {
    var compressedIdx = indexAr.map(function (key) {
      if (!rxCollection.schema.doKeyCompression()) return key;else return rxCollection._keyCompressor.transformKey('', '', key.split('.'));
    });
    return spawnedPouchPromise.then(function () {
      return rxCollection.pouch.createIndex({
        index: {
          fields: compressedIdx
        }
      });
    });
  }));
}
/**
 * creates and prepares a new collection
 * @param  {RxDatabase}  database
 * @param  {string}  name
 * @param  {RxSchema}  schema
 * @param  {?Object}  [pouchSettings={}]
 * @param  {?Object}  [migrationStrategies={}]
 * @return {Promise<RxCollection>} promise with collection
 */


function create(_ref3) {
  var database = _ref3.database,
      name = _ref3.name,
      schema = _ref3.schema,
      _ref3$pouchSettings = _ref3.pouchSettings,
      pouchSettings = _ref3$pouchSettings === void 0 ? {} : _ref3$pouchSettings,
      _ref3$migrationStrate = _ref3.migrationStrategies,
      migrationStrategies = _ref3$migrationStrate === void 0 ? {} : _ref3$migrationStrate,
      _ref3$autoMigrate = _ref3.autoMigrate,
      autoMigrate = _ref3$autoMigrate === void 0 ? true : _ref3$autoMigrate,
      _ref3$statics = _ref3.statics,
      statics = _ref3$statics === void 0 ? {} : _ref3$statics,
      _ref3$methods = _ref3.methods,
      methods = _ref3$methods === void 0 ? {} : _ref3$methods,
      _ref3$attachments = _ref3.attachments,
      attachments = _ref3$attachments === void 0 ? {} : _ref3$attachments,
      _ref3$options = _ref3.options,
      options = _ref3$options === void 0 ? {} : _ref3$options;
  (0, _util.validateCouchDBString)(name); // ensure it is a schema-object

  if (!_rxSchema["default"].isInstanceOf(schema)) schema = _rxSchema["default"].create(schema);
  checkMigrationStrategies(schema, migrationStrategies); // check ORM-methods

  checkOrmMethods(statics);
  checkOrmMethods(methods);
  checkOrmMethods(attachments);
  Object.keys(methods).filter(function (funName) {
    return schema.topLevelFields.includes(funName);
  }).forEach(function (funName) {
    throw _rxError["default"].newRxError('COL18', {
      funName: funName
    });
  });
  var collection = new RxCollection(database, name, schema, pouchSettings, migrationStrategies, methods, attachments, options, statics);
  return collection.prepare().then(function () {
    // ORM add statics
    Object.entries(statics).forEach(function (_ref4) {
      var funName = _ref4[0],
          fun = _ref4[1];
      return collection.__defineGetter__(funName, function () {
        return fun.bind(collection);
      });
    });
    var ret = Promise.resolve();
    if (autoMigrate) ret = collection.migratePromise();
    return ret;
  }).then(function () {
    (0, _hooks.runPluginHooks)('createRxCollection', collection);
    return collection;
  });
}

function isInstanceOf(obj) {
  return obj instanceof RxCollection;
}

var _default = {
  create: create,
  properties: properties,
  isInstanceOf: isInstanceOf,
  RxCollection: RxCollection
};
exports["default"] = _default;
