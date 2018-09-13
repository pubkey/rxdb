"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.replicateExistingDocuments = replicateExistingDocuments;
exports.setIndexes = setIndexes;
exports.streamChangedDocuments = streamChangedDocuments;
exports.applyChangedDocumentToPouch = applyChangedDocumentToPouch;
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

var _util = require("../util");

var _core = _interopRequireDefault(require("../core"));

var _crypter = _interopRequireDefault(require("../crypter"));

var _changeEventBuffer = _interopRequireDefault(require("../change-event-buffer"));

var _rxSchema = _interopRequireDefault(require("../rx-schema"));

var _pouchDb = _interopRequireDefault(require("../pouch-db"));

var _rxError = _interopRequireDefault(require("../rx-error"));

var _watchForChanges = _interopRequireDefault(require("../plugins/watch-for-changes"));

/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */
// add the watch-for-changes-plugin
_core["default"].plugin(_watchForChanges["default"]);

var collectionCacheMap = new WeakMap();
var collectionPromiseCacheMap = new WeakMap();
var BULK_DOC_OPTIONS = {
  new_edits: true
};

var InMemoryRxCollection =
/*#__PURE__*/
function (_RxCollection$RxColle) {
  (0, _inheritsLoose2["default"])(InMemoryRxCollection, _RxCollection$RxColle);

  function InMemoryRxCollection(parentCollection) {
    var _this;

    var pouchSettings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _this = _RxCollection$RxColle.call(this, parentCollection.database, parentCollection.name, toCleanSchema(parentCollection.schema), pouchSettings, // pouchSettings
    {}, parentCollection._methods) || this;
    _this._isInMemory = true;
    _this._parentCollection = parentCollection;

    _this._parentCollection.onDestroy.then(function () {
      return _this.destroy();
    });

    _this._crypter = _crypter["default"].create(_this.database.password, _this.schema);
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
    _this.pouch = new _pouchDb["default"]('rxdb-in-memory-' + (0, _util.randomCouchString)(10), (0, _util.adapterObject)('memory'), {});
    _this._observable$ = new _rxjs.Subject();
    _this._changeEventBuffer = _changeEventBuffer["default"].create((0, _assertThisInitialized2["default"])((0, _assertThisInitialized2["default"])(_this)));
    var parentProto = Object.getPrototypeOf(parentCollection);
    _this._oldPouchPut = parentProto._pouchPut.bind((0, _assertThisInitialized2["default"])((0, _assertThisInitialized2["default"])(_this)));
    _this._nonPersistentRevisions = new Set();
    _this._nonPersistentRevisionsSubject = new _rxjs.Subject(); // emits Set.size() when Set is changed

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

      var thisToParentSub, parentToThisSub;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return setIndexes(this.schema, this.pouch);

            case 2:
              this._subs.push(this._observable$.subscribe(function (cE) {
                // when data changes, send it to RxDocument in docCache
                var doc = _this2._docCache.get(cE.data.doc);

                if (doc) doc._handleChangeEvent(cE);
              }));
              /* REPLICATION BETWEEN THIS AND PARENT */
              // initial sync parent's docs to own


              _context.next = 5;
              return replicateExistingDocuments(this._parentCollection, this);

            case 5:
              /**
               * call watchForChanges() on both sides,
               * to ensure none-rxdb-changes like replication
               * will fire into the change-event-stream
               */
              this._parentCollection.watchForChanges();

              this.watchForChanges();
              /**
               * create an ongoing replications between both sides
               */

              thisToParentSub = streamChangedDocuments(this).pipe((0, _operators.mergeMap)(function (doc) {
                return applyChangedDocumentToPouch(_this2._parentCollection, doc).then(function () {
                  return doc._rev;
                });
              })).subscribe(function (changeRev) {
                _this2._nonPersistentRevisions["delete"](changeRev);

                _this2._nonPersistentRevisionsSubject.next(_this2._nonPersistentRevisions.size);
              });

              this._subs.push(thisToParentSub);

              parentToThisSub = streamChangedDocuments(this._parentCollection).subscribe(function (doc) {
                return applyChangedDocumentToPouch(_this2, doc);
              });

              this._subs.push(parentToThisSub);

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
  /**
   * waits until all writes are persistent
   * in the parent collection
   * @return {Promise}
   */


  _proto.awaitPersistence = function awaitPersistence() {
    var _this3 = this;

    if (this._nonPersistentRevisions.size === 0) return Promise.resolve();
    return this._nonPersistentRevisionsSubject.pipe((0, _operators.filter)(function () {
      return _this3._nonPersistentRevisions.size === 0;
    }), (0, _operators.first)()).toPromise();
  };
  /**
   * To know which events are replicated and which are not,
   * the _pouchPut is wrapped
   * @overwrite
   */


  _proto._pouchPut =
  /*#__PURE__*/
  function () {
    var _pouchPut2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee2(obj, overwrite) {
      var ret;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return this._oldPouchPut(obj, overwrite);

            case 2:
              ret = _context2.sent;

              this._nonPersistentRevisions.add(ret.rev);

              return _context2.abrupt("return", ret);

            case 5:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    return function _pouchPut(_x, _x2) {
      return _pouchPut2.apply(this, arguments);
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
   * @overwrite
   * Replication on the inMemory is dangerous,
   * replicate with it's parent instead
   */


  _proto.sync = function sync() {
    throw _rxError["default"].newRxError('IM2');
  };

  return InMemoryRxCollection;
}(_rxCollection["default"].RxCollection);
/**
 * returns a version of the schema that:
 * - disabled the keyCompression
 * - has no encryption
 * - has no attachments
 * @param  {RxSchema} rxSchema
 * @return {RxSchema}
 */


exports.InMemoryRxCollection = InMemoryRxCollection;

function toCleanSchema(rxSchema) {
  var newSchemaJson = (0, _util.clone)(rxSchema.jsonID);
  newSchemaJson.keyCompression = false;
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
/**
 * replicates all documents from the parent to the inMemoryCollection
 * @param  {RxCollection} fromCollection
 * @param  {RxCollection} toCollection
 * @return {Promise<{}[]>} Promise that resolves with an array of the docs data
 */


function replicateExistingDocuments(fromCollection, toCollection) {
  return fromCollection.pouch.allDocs({
    attachments: false,
    include_docs: true
  }).then(function (allRows) {
    var docs = allRows.rows.map(function (row) {
      return row.doc;
    }).filter(function (doc) {
      return !doc.language;
    }) // do not replicate design-docs
    .map(function (doc) {
      return fromCollection._handleFromPouch(doc);
    }) // swap back primary because keyCompression:false
    .map(function (doc) {
      return fromCollection.schema.swapPrimaryToId(doc);
    });
    if (docs.length === 0) return []; // nothing to replicate
    else {
        return toCollection.pouch.bulkDocs({
          docs: docs
        }, {
          new_edits: false
        }).then(function () {
          return docs;
        });
      }
  });
}
/**
 * sets the indexes from the schema at the pouchdb
 * @param {RxSchema} schema
 * @param {PouchDB} pouch
 * @return {Promise<void>}
 */


function setIndexes(schema, pouch) {
  return Promise.all(schema.indexes.map(function (indexAr) {
    return pouch.createIndex({
      index: {
        fields: indexAr
      }
    });
  }));
}
/**
 * returns an observable that streams all changes
 * as plain documents that have no encryption or keyCompression.
 * We use this to replicate changes from one collection to the other
 * @param {RxCollection} rxCollection
 * @param {Function?} prevFilter can be used to filter changes before doing anything
 * @return {Observable<any>} observable that emits document-data
 */


function streamChangedDocuments(rxCollection) {
  var prevFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {
    return true;
  };
  if (!rxCollection._doNotEmitSet) rxCollection._doNotEmitSet = new Set();
  var observable = (0, _rxjs.fromEvent)(rxCollection.pouch.changes({
    since: 'now',
    live: true,
    include_docs: true
  }), 'change').pipe((0, _operators.map)(function (changeAr) {
    return changeAr[0];
  }), // rxjs emits an array for whatever reason
  (0, _operators.filter)(function (change) {
    // changes on the doNotEmit-list shell not be fired
    var emitFlag = change.id + ':' + change.doc._rev;
    if (rxCollection._doNotEmitSet.has(emitFlag)) return false;else return true;
  }), (0, _operators.filter)(function (change) {
    return prevFilter(change);
  }), (0, _operators.map)(function (change) {
    return rxCollection._handleFromPouch(change.doc);
  }));
  return observable;
}
/**
 * writes the doc-data into the pouchdb of the collection
 * without changeing the revision
 * @param  {RxCollection} rxCollection
 * @param  {any} docData
 * @return {Promise<any>} promise that resolved with the transformed doc-data
 */


function applyChangedDocumentToPouch(_x3, _x4) {
  return _applyChangedDocumentToPouch.apply(this, arguments);
}

function _applyChangedDocumentToPouch() {
  _applyChangedDocumentToPouch = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee3(rxCollection, docData) {
    var transformedDoc, oldDoc, bulkRet, emitFlag;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!rxCollection._doNotEmitSet) rxCollection._doNotEmitSet = new Set();
            transformedDoc = rxCollection._handleToPouch(docData);
            _context3.prev = 2;
            _context3.next = 5;
            return rxCollection.pouch.get(transformedDoc._id);

          case 5:
            oldDoc = _context3.sent;
            transformedDoc._rev = oldDoc._rev;
            _context3.next = 12;
            break;

          case 9:
            _context3.prev = 9;
            _context3.t0 = _context3["catch"](2);
            // doc not found, do not use a revision
            delete transformedDoc._rev;

          case 12:
            _context3.next = 14;
            return rxCollection.pouch.bulkDocs({
              docs: [transformedDoc]
            }, BULK_DOC_OPTIONS);

          case 14:
            bulkRet = _context3.sent;

            if (!(bulkRet.length > 0 && !bulkRet[0].ok)) {
              _context3.next = 17;
              break;
            }

            throw new Error(JSON.stringify(bulkRet[0]));

          case 17:
            // set the flag so this does not appear in the own event-stream again
            emitFlag = transformedDoc._id + ':' + bulkRet[0].rev;

            rxCollection._doNotEmitSet.add(emitFlag); // remove from the list later to not have a memory-leak


            setTimeout(function () {
              return rxCollection._doNotEmitSet["delete"](emitFlag);
            }, 30 * 1000);
            return _context3.abrupt("return", transformedDoc);

          case 21:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, this, [[2, 9]]);
  }));
  return _applyChangedDocumentToPouch.apply(this, arguments);
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
  _regenerator["default"].mark(function _callee4() {
    var col, preparePromise;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (INIT_DONE) {
              _context4.next = 4;
              break;
            }

            INIT_DONE = true; // ensure memory-adapter is added

            if (!(!_pouchDb["default"].adapters || !_pouchDb["default"].adapters.memory)) {
              _context4.next = 4;
              break;
            }

            throw _rxError["default"].newRxError('IM1');

          case 4:
            if (!collectionCacheMap.has(this)) {
              _context4.next = 8;
              break;
            }

            _context4.next = 7;
            return collectionPromiseCacheMap.get(this);

          case 7:
            return _context4.abrupt("return", collectionCacheMap.get(this));

          case 8:
            col = new InMemoryRxCollection(this);
            preparePromise = col.prepare();
            collectionCacheMap.set(this, col);
            collectionPromiseCacheMap.set(this, preparePromise);
            _context4.next = 14;
            return preparePromise;

          case 14:
            return _context4.abrupt("return", col);

          case 15:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, this);
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
