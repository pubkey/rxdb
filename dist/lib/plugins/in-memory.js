"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spawnInMemory = spawnInMemory;
exports["default"] = exports.overwritable = exports.prototypes = exports.rxdb = exports.InMemoryRxCollection = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _rxCollection = _interopRequireDefault(require("../rx-collection"));

var _rxChangeEvent = _interopRequireDefault(require("../rx-change-event"));

var _util = require("../util");

var _crypter = _interopRequireDefault(require("../crypter"));

var _changeEventBuffer = _interopRequireDefault(require("../change-event-buffer"));

var _rxSchema = _interopRequireDefault(require("../rx-schema"));

var _pouchDb = _interopRequireDefault(require("../pouch-db"));

var _rxError = _interopRequireDefault(require("../rx-error"));

/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */
var collectionCacheMap = new WeakMap();
var collectionPromiseCacheMap = new WeakMap();
var BULK_DOC_OPTIONS = {
  new_edits: false
};

var InMemoryRxCollection =
/*#__PURE__*/
function (_RxCollection$RxColle) {
  (0, _inheritsLoose2["default"])(InMemoryRxCollection, _RxCollection$RxColle);

  function InMemoryRxCollection(parentCollection, pouchSettings) {
    var _this;

    _this = _RxCollection$RxColle.call(this, parentCollection.database, parentCollection.name, toCleanSchema(parentCollection.schema), pouchSettings, // pouchSettings
    {}, parentCollection._methods) || this;
    _this._isInMemory = true;
    _this._parentCollection = parentCollection;

    _this._parentCollection.onDestroy.then(function () {
      return _this.destroy();
    });

    _this._changeStreams = [];
    /**
     * runs on parentCollection.destroy()
     * Cleans up everything to free up memory
     */

    _this.onDestroy.then(function () {
      _this._changeStreams.forEach(function (stream) {
        return stream.cancel();
      });

      _this.pouch.destroy();
    }); // add orm functions and options from parent


    _this.options = parentCollection.options;
    Object.entries(parentCollection._statics).forEach(function (_ref) {
      var funName = _ref[0],
          fun = _ref[1];
      return _this.__defineGetter__(funName, function () {
        return fun.bind((0, _assertThisInitialized2["default"])((0, _assertThisInitialized2["default"])(_this)));
      });
    });
    return _this;
  }

  var _proto = InMemoryRxCollection.prototype;

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
              this._crypter = _crypter["default"].create(this.database.password, this.schema);
              this.pouch = new _pouchDb["default"]('rxdb-in-memory-' + (0, _util.randomCouchString)(10), (0, _util.adapterObject)('memory'), {});
              this._observable$ = new _rxjs.Subject();
              this._changeEventBuffer = _changeEventBuffer["default"].create(this); // INDEXES

              _context.next = 6;
              return Promise.all(this.schema.indexes.map(function (indexAr) {
                return _this2.pouch.createIndex({
                  index: {
                    fields: indexAr
                  }
                });
              }));

            case 6:
              this._subs.push(this._observable$.subscribe(function (cE) {
                // when data changes, send it to RxDocument in docCache
                var doc = _this2._docCache.get(cE.data.doc);

                if (doc) doc._handleChangeEvent(cE);
              }));

              _context.next = 9;
              return this._initialSync();

            case 9:
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
   * this does the initial sync
   * so that the in-memory-collection has the same docs as the original
   * @return {Promise}
   */


  _proto._initialSync =
  /*#__PURE__*/
  function () {
    var _initialSync2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee3() {
      var _this3 = this;

      var allRows, fromParentStream;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return this._parentCollection.pouch.allDocs({
                attachments: false,
                include_docs: true
              });

            case 2:
              allRows = _context3.sent;
              _context3.next = 5;
              return this.pouch.bulkDocs({
                docs: allRows.rows.map(function (row) {
                  return row.doc;
                }).filter(function (doc) {
                  return !doc.language;
                }) // do not replicate design-docs
                .map(function (doc) {
                  return _this3._parentCollection._handleFromPouch(doc);
                }) // swap back primary because disableKeyCompression:true
                .map(function (doc) {
                  return _this3._parentCollection.schema.swapPrimaryToId(doc);
                })
              }, BULK_DOC_OPTIONS);

            case 5:
              this._parentCollection.watchForChanges();

              this.watchForChanges();
              /**
               * Sync from parent to inMemory.
               * We do not think in the other direction because writes will always go
               * to the parent. See _pouchPut()
               *
               * @type {[type]}
               */

              fromParentStream = this._parentCollection.pouch.changes({
                since: 'now',
                include_docs: true,
                live: true
              }).on('change',
              /*#__PURE__*/
              function () {
                var _ref2 = (0, _asyncToGenerator2["default"])(
                /*#__PURE__*/
                _regenerator["default"].mark(function _callee2(change) {
                  var doc, foundBefore, res, cE;
                  return _regenerator["default"].wrap(function _callee2$(_context2) {
                    while (1) {
                      switch (_context2.prev = _context2.next) {
                        case 0:
                          doc = _this3._parentCollection._handleFromPouch(change.doc);
                          doc = _this3.schema.swapPrimaryToId(doc);

                          if (!doc._deleted) {
                            _context2.next = 15;
                            break;
                          }

                          _context2.next = 5;
                          return _this3.pouch.get(doc._id)["catch"](function () {
                            return null;
                          });

                        case 5:
                          foundBefore = _context2.sent;
                          doc._rev = foundBefore._rev;
                          _context2.next = 9;
                          return _this3.pouch.put(doc);

                        case 9:
                          res = _context2.sent;
                          doc._rev = res.rev; // because pouch.put will not emit the event, do it manually

                          cE = _rxChangeEvent["default"].fromPouchChange(doc, _this3);

                          _this3.$emit(cE);

                          _context2.next = 17;
                          break;

                        case 15:
                          _context2.next = 17;
                          return _this3.pouch.bulkDocs({
                            docs: [doc]
                          }, BULK_DOC_OPTIONS);

                        case 17:
                        case "end":
                          return _context2.stop();
                      }
                    }
                  }, _callee2, this);
                }));

                return function (_x) {
                  return _ref2.apply(this, arguments);
                };
              }());

              this._changeStreams.push(fromParentStream);

            case 9:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    return function _initialSync() {
      return _initialSync2.apply(this, arguments);
    };
  }();
  /**
   * @overwrite
   */


  _proto.$emit = function $emit(changeEvent) {
    if (this._changeEventBuffer.hasChangeWithRevision(changeEvent.data.v && changeEvent.data.v._rev)) return;

    this._observable$.next(changeEvent); // run compaction each 10 events


    if (!this._eventCounter) this._eventCounter = 0;
    this._eventCounter++;

    if (this._eventCounter === 10) {
      this._eventCounter = 0;
      this.pouch.compact();
    }
  };
  /**
   * When a write is done to the inMemory-collection,
   * we write to the parent and wait for the replication-event
   * This ensures that writes are really persistend when done,
   * and also makes it only nessesary to replicate one side
   * @overwrite
   */


  _proto._pouchPut =
  /*#__PURE__*/
  function () {
    var _pouchPut2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee4(obj) {
      var overwrite,
          ret,
          changeRev,
          _args4 = arguments;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              overwrite = _args4.length > 1 && _args4[1] !== undefined ? _args4[1] : false;
              _context4.next = 3;
              return this._parentCollection._pouchPut(obj, overwrite);

            case 3:
              ret = _context4.sent;
              changeRev = ret.rev; // wait until the change is replicated from parent to inMemory

              _context4.next = 7;
              return this.$.pipe((0, _operators.filter)(function (cE) {
                if (obj._deleted) {
                  // removes have a different revision because they cannot be handled via bulkDocs
                  // so we check for equal height and _id
                  var isRevHeight = (0, _util.getHeightOfRevision)(cE.data.v._rev);
                  var mustRevHeight = (0, _util.getHeightOfRevision)(obj._rev) + 1;
                  if (isRevHeight === mustRevHeight && obj._id === cE.data.doc) return true;else return false;
                } else {
                  // use the one with the same revision
                  return cE.data.v && cE.data.v._rev === changeRev;
                }
              }), (0, _operators.first)()).toPromise();

            case 7:
              return _context4.abrupt("return", ret);

            case 8:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, this);
    }));

    return function _pouchPut(_x2) {
      return _pouchPut2.apply(this, arguments);
    };
  }();

  return InMemoryRxCollection;
}(_rxCollection["default"].RxCollection);

exports.InMemoryRxCollection = InMemoryRxCollection;

function toCleanSchema(rxSchema) {
  var newSchemaJson = (0, _util.clone)(rxSchema.jsonID);
  newSchemaJson.disableKeyCompression = true;
  delete newSchemaJson.properties._id;
  delete newSchemaJson.properties._rev;
  delete newSchemaJson.properties._attachments;

  var removeEncryption = function removeEncryption(schema, complete) {
    delete schema.encrypted;
    Object.values(schema).filter(function (val) {
      return (0, _typeof2["default"])(val) === 'object';
    }).forEach(function (val) {
      return removeEncryption(val, complete);
    });
  };

  removeEncryption(newSchemaJson, newSchemaJson);
  return _rxSchema["default"].create(newSchemaJson);
}

var INIT_DONE = false;
/**
 * called in the proto of RxCollection
 * @return {Promise<RxCollection>}
 */

function spawnInMemory() {
  return _spawnInMemory.apply(this, arguments);
}

function _spawnInMemory() {
  _spawnInMemory = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee5() {
    var col, preparePromise;
    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            if (INIT_DONE) {
              _context5.next = 4;
              break;
            }

            INIT_DONE = true; // ensure memory-adapter is added

            if (!(!_pouchDb["default"].adapters || !_pouchDb["default"].adapters.memory)) {
              _context5.next = 4;
              break;
            }

            throw _rxError["default"].newRxError('IM1');

          case 4:
            if (!collectionCacheMap.has(this)) {
              _context5.next = 8;
              break;
            }

            _context5.next = 7;
            return collectionPromiseCacheMap.get(this);

          case 7:
            return _context5.abrupt("return", collectionCacheMap.get(this));

          case 8:
            col = new InMemoryRxCollection(this);
            preparePromise = col.prepare();
            collectionCacheMap.set(this, col);
            collectionPromiseCacheMap.set(this, preparePromise);
            _context5.next = 14;
            return preparePromise;

          case 14:
            return _context5.abrupt("return", col);

          case 15:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));
  return _spawnInMemory.apply(this, arguments);
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.inMemory = spawnInMemory;
  }
};
exports.prototypes = prototypes;
var overwritable = {};
exports.overwritable = overwritable;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  spawnInMemory: spawnInMemory
};
exports["default"] = _default;
