"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.properties = properties;
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

var _dataMigrator = _interopRequireDefault(require("./data-migrator"));

var _crypter = _interopRequireDefault(require("./crypter"));

var _docCache = _interopRequireDefault(require("./doc-cache"));

var _queryCache = _interopRequireDefault(require("./query-cache"));

var _changeEventBuffer = _interopRequireDefault(require("./change-event-buffer"));

var _overwritable = _interopRequireDefault(require("./overwritable"));

var _hooks = require("./hooks");

var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];

var RxCollection =
/*#__PURE__*/
function () {
  function RxCollection(database, name, schema) {
    var _this = this;

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
    // not initialized.

    this.length = -1; // set HOOKS-functions dynamically

    HOOKS_KEYS.forEach(function (key) {
      HOOKS_WHEN.map(function (when) {
        var fnName = when + (0, _util.ucfirst)(key);

        _this[fnName] = function (fun, parallel) {
          return _this.addHook(when, key, fun, parallel);
        };
      });
    });
  }

  var _proto = RxCollection.prototype;

  _proto.prepare =
  /*#__PURE__*/
  function () {
    var _prepare = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee() {
      var _this2 = this;

      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              this._dataMigrator = _dataMigrator["default"].create(this, this._migrationStrategies);
              this._crypter = _crypter["default"].create(this.database.password, this.schema);
              this.pouch = this.database._spawnPouchDB(this.name, this.schema.version, this._pouchSettings); // ensure that we wait until db is useable

              _context.next = 5;
              return this.database.lockedRun(function () {
                return _this2.pouch.info();
              });

            case 5:
              this._observable$ = this.database.$.pipe((0, _operators.filter)(function (event) {
                return event.data.col === _this2.name;
              }));
              this._changeEventBuffer = _changeEventBuffer["default"].create(this); // INDEXES

              _context.next = 9;
              return Promise.all(this.schema.indexes.map(function (indexAr) {
                var compressedIdx = indexAr.map(function (key) {
                  if (!_this2.schema.doKeyCompression()) return key;else return _this2._keyCompressor._transformKey('', '', key.split('.'));
                });
                return _this2.database.lockedRun(function () {
                  return _this2.pouch.createIndex({
                    index: {
                      fields: compressedIdx
                    }
                  });
                });
              }));

            case 9:
              this._subs.push(this._observable$.pipe((0, _operators.filter)(function (cE) {
                return !cE.data.isLocal;
              })).subscribe(function (cE) {
                // when data changes, send it to RxDocument in docCache
                var doc = _this2._docCache.get(cE.data.doc);

                if (doc) doc._handleChangeEvent(cE); // console.info(cE);

                var op = cE.data.op;

                switch (op) {
                  case 'INSERT':
                    _this2.length += 1;
                    break;

                  case 'REMOVE':
                    if (_this2.length < 1) break;
                    _this2.length -= 1;
                    break;
                }
              })); // update initial length -> starts at 0


              this.pouch.allDocs().then(function (entries) {
                _this2.length = entries ? entries.rows.length : 0;
              });

            case 11:
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

  _proto.getDocumentOrmPrototype = function getDocumentOrmPrototype() {
    var proto = {};
    Object.entries(this._methods).forEach(function (_ref) {
      var k = _ref[0],
          v = _ref[1];
      proto[k] = v;
    });
    return proto;
  };
  /**
   * merge the prototypes of schema, orm-methods and document-base
   * so we do not have to assing getters/setters and orm methods to each document-instance
   */


  _proto.getDocumentPrototype = function getDocumentPrototype() {
    if (!this._getDocumentPrototype) {
      var schemaProto = this.schema.getDocumentPrototype();
      var ormProto = this.getDocumentOrmPrototype();
      var baseProto = _rxDocument["default"].basePrototype;
      var proto = {};
      [schemaProto, ormProto, baseProto].forEach(function (obj) {
        var props = Object.getOwnPropertyNames(obj);
        props.forEach(function (key) {
          var desc = Object.getOwnPropertyDescriptor(obj, key);
          desc.enumerable = false;
          desc.configurable = false;
          if (desc.writable) desc.writable = false;
          Object.defineProperty(proto, key, desc);
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
   * @return {boolean}
   */


  _proto.migrationNeeded = function migrationNeeded() {
    if (this.schema.version === 0) return false;
    return this._dataMigrator._getOldCollections().then(function (oldCols) {
      return oldCols.length > 0;
    });
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
    _regenerator["default"].mark(function _callee2(obj) {
      var _this3 = this;

      var overwrite,
          ret,
          exist,
          _args2 = arguments;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              overwrite = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : false;
              obj = this._handleToPouch(obj);
              ret = null;
              _context2.prev = 3;
              _context2.next = 6;
              return this.database.lockedRun(function () {
                return _this3.pouch.put(obj);
              });

            case 6:
              ret = _context2.sent;
              _context2.next = 22;
              break;

            case 9:
              _context2.prev = 9;
              _context2.t0 = _context2["catch"](3);

              if (!(overwrite && _context2.t0.status === 409)) {
                _context2.next = 21;
                break;
              }

              _context2.next = 14;
              return this.database.lockedRun(function () {
                return _this3.pouch.get(obj._id);
              });

            case 14:
              exist = _context2.sent;
              obj._rev = exist._rev;
              _context2.next = 18;
              return this.database.lockedRun(function () {
                return _this3.pouch.put(obj);
              });

            case 18:
              ret = _context2.sent;
              _context2.next = 22;
              break;

            case 21:
              throw _context2.t0;

            case 22:
              return _context2.abrupt("return", ret);

            case 23:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this, [[3, 9]]);
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
    var _this4 = this;

    return this.pouch.get(key).then(function (doc) {
      return _this4._handleFromPouch(doc);
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
    var _this5 = this;

    var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var compressedQueryJSON = rxQuery.keyCompress();
    if (limit) compressedQueryJSON.limit = limit;
    return this.database.lockedRun(function () {
      return _this5.pouch.find(compressedQueryJSON);
    }).then(function (docsCompressed) {
      var docs = docsCompressed.docs.map(function (doc) {
        return _this5._handleFromPouch(doc, noDecrypt);
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

    this._runHooksSync('post', 'create', doc);

    return doc;
  };
  /**
   * create RxDocument from the docs-array
   * @return {Promise<RxDocument[]>} documents
   */


  _proto._createDocuments = function _createDocuments(docsJSON) {
    var _this6 = this;

    return docsJSON.map(function (json) {
      return _this6._createDocument(json);
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


  _proto.insert =
  /*#__PURE__*/
  function () {
    var _insert = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee3(json) {
      var tempDoc, insertResult, newDoc, emitEvent;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              // inserting a temporary-document
              tempDoc = null;

              if (!_rxDocument["default"].isInstanceOf(json)) {
                _context3.next = 6;
                break;
              }

              tempDoc = json;

              if (json._isTemporary) {
                _context3.next = 5;
                break;
              }

              throw _rxError["default"].newRxError('COL1', {
                data: json
              });

            case 5:
              json = json.toJSON();

            case 6:
              json = (0, _util.clone)(json);
              json = this.schema.fillObjectWithDefaults(json);

              if (!json._id) {
                _context3.next = 10;
                break;
              }

              throw _rxError["default"].newRxError('COL2', {
                data: json
              });

            case 10:
              // fill _id
              if (this.schema.primaryPath === '_id' && !json._id) json._id = (0, _util.generateId)();
              _context3.next = 13;
              return this._runHooks('pre', 'insert', json);

            case 13:
              this.schema.validate(json);
              _context3.next = 16;
              return this._pouchPut(json);

            case 16:
              insertResult = _context3.sent;
              json[this.schema.primaryPath] = insertResult.id;
              json._rev = insertResult.rev;
              newDoc = tempDoc;

              if (tempDoc) {
                tempDoc._dataSync$.next(json);
              } else newDoc = this._createDocument(json);

              _context3.next = 23;
              return this._runHooks('post', 'insert', newDoc);

            case 23:
              // event
              emitEvent = _rxChangeEvent["default"].create('INSERT', this.database, this, newDoc, json);
              this.$emit(emitEvent);
              return _context3.abrupt("return", newDoc);

            case 26:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    return function insert(_x2) {
      return _insert.apply(this, arguments);
    };
  }();
  /**
   * same as insert but overwrites existing document with same primary
   */


  _proto.upsert =
  /*#__PURE__*/
  function () {
    var _upsert = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee4(json) {
      var primary, existing, newDoc;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              json = (0, _util.clone)(json);
              primary = json[this.schema.primaryPath];

              if (primary) {
                _context4.next = 4;
                break;
              }

              throw _rxError["default"].newRxError('COL3', {
                primaryPath: this.schema.primaryPath,
                data: json
              });

            case 4:
              _context4.next = 6;
              return this.findOne(primary).exec();

            case 6:
              existing = _context4.sent;

              if (!existing) {
                _context4.next = 14;
                break;
              }

              json._rev = existing._rev;
              _context4.next = 11;
              return existing.atomicUpdate(function () {
                return json;
              });

            case 11:
              return _context4.abrupt("return", existing);

            case 14:
              _context4.next = 16;
              return this.insert(json);

            case 16:
              newDoc = _context4.sent;
              return _context4.abrupt("return", newDoc);

            case 18:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, this);
    }));

    return function upsert(_x3) {
      return _upsert.apply(this, arguments);
    };
  }();
  /**
   * ensures that the given document exists
   * @param  {string}  primary
   * @param  {any}  json
   * @return {Promise<{ doc: RxDocument, inserted: boolean}>} promise that resolves with new doc and flag if inserted
   */


  _proto._atomicUpsertEnsureRxDocumentExists =
  /*#__PURE__*/
  function () {
    var _atomicUpsertEnsureRxDocumentExists2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee5(primary, json) {
      var doc, newDoc;
      return _regenerator["default"].wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 2;
              return this.findOne(primary).exec();

            case 2:
              doc = _context5.sent;

              if (doc) {
                _context5.next = 10;
                break;
              }

              _context5.next = 6;
              return this.insert(json);

            case 6:
              newDoc = _context5.sent;
              return _context5.abrupt("return", {
                doc: newDoc,
                inserted: true
              });

            case 10:
              return _context5.abrupt("return", {
                doc: doc,
                inserted: false
              });

            case 11:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));

    return function _atomicUpsertEnsureRxDocumentExists(_x4, _x5) {
      return _atomicUpsertEnsureRxDocumentExists2.apply(this, arguments);
    };
  }();
  /**
   * @return {Promise}
   */


  _proto._atomicUpsertUpdate = function _atomicUpsertUpdate(doc, json) {
    return doc.atomicUpdate(function (innerDoc) {
      json._rev = innerDoc._rev;
      innerDoc._data = json;
      return innerDoc._data;
    }).then(function () {
      return doc;
    });
  };
  /**
   * upserts to a RxDocument, uses atomicUpdate if document already exists
   * @param  {object}  json
   * @return {Promise}
   */


  _proto.atomicUpsert =
  /*#__PURE__*/
  function () {
    var _atomicUpsert = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee6(json) {
      var _this7 = this;

      var primary, queue;
      return _regenerator["default"].wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              json = (0, _util.clone)(json);
              primary = json[this.schema.primaryPath];

              if (primary) {
                _context6.next = 4;
                break;
              }

              throw _rxError["default"].newRxError('COL4', {
                data: json
              });

            case 4:
              if (!this._atomicUpsertQueues.has(primary)) {
                queue = Promise.resolve();
              } else {
                queue = this._atomicUpsertQueues.get(primary);
              }

              queue = queue.then(function () {
                return _this7._atomicUpsertEnsureRxDocumentExists(primary, json);
              }).then(function (wasInserted) {
                if (!wasInserted.inserted) {
                  return _this7._atomicUpsertUpdate(wasInserted.doc, json).then(function () {
                    return (0, _util.nextTick)();
                  }) // tick here so the event can propagate
                  .then(function () {
                    return wasInserted.doc;
                  });
                } else return wasInserted.doc;
              });

              this._atomicUpsertQueues.set(primary, queue);

              return _context6.abrupt("return", queue);

            case 8:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));

    return function atomicUpsert(_x6) {
      return _atomicUpsert.apply(this, arguments);
    };
  }();
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
    throw _rxError["default"].pluginMissing('replication');
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
    }

    var runName = parallel ? 'parallel' : 'series';
    this.hooks[key] = this.hooks[key] || {};
    this.hooks[key][when] = this.hooks[key][when] || {
      series: [],
      parallel: []
    };
    this.hooks[key][when][runName].push(fun);
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

  _proto._runHooks =
  /*#__PURE__*/
  function () {
    var _runHooks2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee7(when, key, doc) {
      var hooks, i;
      return _regenerator["default"].wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              hooks = this.getHooks(when, key);

              if (hooks) {
                _context7.next = 3;
                break;
              }

              return _context7.abrupt("return");

            case 3:
              i = 0;

            case 4:
              if (!(i < hooks.series.length)) {
                _context7.next = 10;
                break;
              }

              _context7.next = 7;
              return hooks.series[i](doc);

            case 7:
              i++;
              _context7.next = 4;
              break;

            case 10:
              _context7.next = 12;
              return Promise.all(hooks.parallel.map(function (hook) {
                return hook(doc);
              }));

            case 12:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7, this);
    }));

    return function _runHooks(_x7, _x8, _x9) {
      return _runHooks2.apply(this, arguments);
    };
  }();
  /**
   * does the same as ._runHooks() but with non-async-functions
   */


  _proto._runHooksSync = function _runHooksSync(when, key, doc) {
    var hooks = this.getHooks(when, key);
    if (!hooks) return;
    hooks.series.forEach(function (hook) {
      return hook(doc);
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

    this._runHooksSync('post', 'create', doc);

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
    key: "_keyCompressor",
    get: function get() {
      if (!this.__keyCompressor) this.__keyCompressor = _overwritable["default"].createKeyCompressor(this.schema);
      return this.__keyCompressor;
    }
  }, {
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
      var _this8 = this;

      if (!this._onDestroy) this._onDestroy = new Promise(function (res) {
        return _this8._onDestroyCall = res;
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
  Object.entries(statics).forEach(function (_ref2) {
    var k = _ref2[0],
        v = _ref2[1];

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
 * creates and prepares a new collection
 * @param  {RxDatabase}  database
 * @param  {string}  name
 * @param  {RxSchema}  schema
 * @param  {?Object}  [pouchSettings={}]
 * @param  {?Object}  [migrationStrategies={}]
 * @return {Promise.<RxCollection>} promise with collection
 */


function create(_x10) {
  return _create.apply(this, arguments);
}

function _create() {
  _create = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee8(_ref3) {
    var database, name, schema, _ref3$pouchSettings, pouchSettings, _ref3$migrationStrate, migrationStrategies, _ref3$autoMigrate, autoMigrate, _ref3$statics, statics, _ref3$methods, methods, _ref3$attachments, attachments, _ref3$options, options, collection;

    return _regenerator["default"].wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            database = _ref3.database, name = _ref3.name, schema = _ref3.schema, _ref3$pouchSettings = _ref3.pouchSettings, pouchSettings = _ref3$pouchSettings === void 0 ? {} : _ref3$pouchSettings, _ref3$migrationStrate = _ref3.migrationStrategies, migrationStrategies = _ref3$migrationStrate === void 0 ? {} : _ref3$migrationStrate, _ref3$autoMigrate = _ref3.autoMigrate, autoMigrate = _ref3$autoMigrate === void 0 ? true : _ref3$autoMigrate, _ref3$statics = _ref3.statics, statics = _ref3$statics === void 0 ? {} : _ref3$statics, _ref3$methods = _ref3.methods, methods = _ref3$methods === void 0 ? {} : _ref3$methods, _ref3$attachments = _ref3.attachments, attachments = _ref3$attachments === void 0 ? {} : _ref3$attachments, _ref3$options = _ref3.options, options = _ref3$options === void 0 ? {} : _ref3$options;
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
            collection = new RxCollection(database, name, schema, pouchSettings, migrationStrategies, methods, attachments, options, statics);
            _context8.next = 11;
            return collection.prepare();

          case 11:
            // ORM add statics
            Object.entries(statics).forEach(function (_ref4) {
              var funName = _ref4[0],
                  fun = _ref4[1];
              return collection.__defineGetter__(funName, function () {
                return fun.bind(collection);
              });
            });

            if (!autoMigrate) {
              _context8.next = 15;
              break;
            }

            _context8.next = 15;
            return collection.migratePromise();

          case 15:
            (0, _hooks.runPluginHooks)('createRxCollection', collection);
            return _context8.abrupt("return", collection);

          case 17:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));
  return _create.apply(this, arguments);
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
