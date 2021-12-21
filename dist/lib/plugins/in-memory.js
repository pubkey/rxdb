"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBInMemoryPlugin = exports.InMemoryRxCollection = void 0;
exports.applyChangedDocumentToPouch = applyChangedDocumentToPouch;
exports.prototypes = exports.prepareInMemoryRxCollection = exports.inMemory = void 0;
exports.replicateExistingDocuments = replicateExistingDocuments;
exports.rxdb = void 0;
exports.setIndexes = setIndexes;
exports.streamChangedDocuments = streamChangedDocuments;

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _rxCollection = require("../rx-collection");

var _util = require("../util");

var _pouchdb = require("../plugins/pouchdb");

var _crypter = require("../crypter");

var _changeEventBuffer = require("../change-event-buffer");

var _rxSchema = require("../rx-schema");

var _rxError = require("../rx-error");

var _rxChangeEvent = require("../rx-change-event");

var _rxCollectionHelper = require("../rx-collection-helper");

/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */
var prepareInMemoryRxCollection = function prepareInMemoryRxCollection(instance) {
  try {
    var memoryStorage = (0, _pouchdb.getRxStoragePouch)('memory', {});
    return Promise.resolve(memoryStorage.createStorageInstance({
      databaseName: 'rxdb-in-memory',
      collectionName: (0, _util.randomCouchString)(10),
      schema: instance.schema.jsonSchema,
      options: instance.pouchSettings,
      multiInstance: false
    })).then(function (_memoryStorage$create) {
      instance.storageInstance = _memoryStorage$create;
      instance.pouch = instance.storageInstance.internals.pouch;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.prepareInMemoryRxCollection = prepareInMemoryRxCollection;

/**
 * called in the proto of RxCollection
 */
var inMemory = function inMemory() {
  try {
    var _this6 = this;

    if (!INIT_DONE) {
      INIT_DONE = true; // ensure memory-adapter is added

      if (!_pouchdb.PouchDB.adapters || !_pouchdb.PouchDB.adapters.memory) {
        throw (0, _rxError.newRxError)('IM1');
      }
    }

    if (collectionCacheMap.has(_this6)) {
      // already exists for this collection -> wait until synced
      return Promise.resolve(collectionPromiseCacheMap.get(_this6).then(function () {
        return collectionCacheMap.get(_this6);
      }));
    }

    var col = new InMemoryRxCollection(_this6);
    return Promise.resolve(prepareInMemoryRxCollection(col)).then(function () {
      var preparePromise = col.prepareChild();
      collectionCacheMap.set(_this6, col);
      collectionPromiseCacheMap.set(_this6, preparePromise);
      return preparePromise.then(function () {
        return col;
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.inMemory = inMemory;
var collectionCacheMap = new WeakMap();
var collectionPromiseCacheMap = new WeakMap();
var BULK_DOC_OPTIONS = {
  new_edits: true
};
var BULK_DOC_OPTIONS_FALSE = {
  new_edits: false
};

var InMemoryRxCollection = /*#__PURE__*/function (_RxCollectionBase) {
  (0, _inheritsLoose2["default"])(InMemoryRxCollection, _RxCollectionBase);

  function InMemoryRxCollection(parentCollection, pouchSettings) {
    var _this;

    _this = _RxCollectionBase.call(this, parentCollection.database, parentCollection.name, toCleanSchema(parentCollection.schema), pouchSettings, // pouchSettings
    {}, parentCollection._methods) || this;
    _this._eventCounter = 0;
    _this.parentCollection = parentCollection;
    _this.pouchSettings = pouchSettings;
    _this._isInMemory = true;
    parentCollection.onDestroy.then(function () {
      return _this.destroy();
    });
    _this._crypter = (0, _crypter.createCrypter)(_this.database.password, _this.schema);
    _this._changeStreams = [];
    /**
     * runs on parentCollection.destroy()
     * Cleans up everything to free up memory
     */

    _this.onDestroy.then(function () {
      _this._changeStreams.forEach(function (stream) {
        return stream.cancel();
      }); // delete all data


      _this.storageInstance.internals.pouch.destroy();
    }); // add orm functions and options from parent


    _this.options = parentCollection.options;
    Object.entries(parentCollection.statics).forEach(function (_ref) {
      var funName = _ref[0],
          fun = _ref[1];
      Object.defineProperty((0, _assertThisInitialized2["default"])(_this), funName, {
        get: function get() {
          return fun.bind((0, _assertThisInitialized2["default"])(_this));
        }
      });
    });
    _this._observable$ = new _rxjs.Subject();
    _this._changeEventBuffer = (0, _changeEventBuffer.createChangeEventBuffer)((0, _assertThisInitialized2["default"])(_this));
    var parentProto = Object.getPrototypeOf(parentCollection);
    _this._oldPouchPut = parentProto._pouchPut.bind((0, _assertThisInitialized2["default"])(_this));
    _this._nonPersistentRevisions = new Set();
    _this._nonPersistentRevisionsSubject = new _rxjs.Subject(); // emits Set.size() when Set is changed

    return _this;
  }

  var _proto = InMemoryRxCollection.prototype;

  _proto.prepareChild = function prepareChild() {
    var _this2 = this;

    return setIndexes(this.schema, this.storageInstance.internals.pouch).then(function () {
      _this2._subs.push(_this2._observable$.subscribe(function (cE) {
        // when data changes, send it to RxDocument in docCache
        var doc = _this2._docCache.get(cE.documentId);

        if (doc) doc._handleChangeEvent(cE);
      }));
    }) // initial sync parent's docs to own
    .then(function () {
      return replicateExistingDocuments(_this2.parentCollection, _this2);
    }).then(function () {
      /**
       * create an ongoing replications between both sides
       */
      var thisToParentSub = streamChangedDocuments(_this2).pipe((0, _operators.mergeMap)(function (doc) {
        return applyChangedDocumentToPouch(_this2.parentCollection, doc).then(function () {
          return doc['_rev'];
        });
      })).subscribe(function (changeRev) {
        _this2._nonPersistentRevisions["delete"](changeRev);

        _this2._nonPersistentRevisionsSubject.next(_this2._nonPersistentRevisions.size);
      });

      _this2._subs.push(thisToParentSub);

      var parentToThisSub = streamChangedDocuments(_this2.parentCollection).subscribe(function (doc) {
        return applyChangedDocumentToPouch(_this2, doc);
      });

      _this2._subs.push(parentToThisSub);
    });
  }
  /**
   * waits until all writes are persistent
   * in the parent collection
   */
  ;

  _proto.awaitPersistence = function awaitPersistence() {
    var _this3 = this;

    if (this._nonPersistentRevisions.size === 0) {
      return _util.PROMISE_RESOLVE_VOID;
    }

    return (0, _rxjs.firstValueFrom)(this._nonPersistentRevisionsSubject.pipe((0, _operators.filter)(function () {
      return _this3._nonPersistentRevisions.size === 0;
    })));
  }
  /**
   * To know which events are replicated and which are not,
   * the _pouchPut is wrapped
   * @overwrite
   */
  ;

  _proto._pouchPut = function _pouchPut(obj, overwrite) {
    var _this4 = this;

    return this._oldPouchPut(obj, overwrite).then(function (ret) {
      _this4._nonPersistentRevisions.add(ret.rev);

      return ret;
    });
  };

  _proto.$emit = function $emit(changeEvent) {
    var doc = (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent);

    if (this._changeEventBuffer.hasChangeWithRevision(doc && doc._rev)) {
      return;
    }

    this._observable$.next(changeEvent); // run compaction each 10 events


    this._eventCounter++;

    if (this._eventCounter === 10) {
      this._eventCounter = 0;
      this.storageInstance.internals.pouch.compact();
    }
  }
  /**
   * @overwrite
   * Replication on the inMemory is dangerous,
   * replicate with it's parent instead
   */
  ;

  _proto.syncCouchDB = function syncCouchDB() {
    throw (0, _rxError.newRxError)('IM2');
  };

  return InMemoryRxCollection;
}(_rxCollection.RxCollectionBase);
/**
 * returns a version of the schema that:
 * - disabled the keyCompression
 * - has no encryption
 * - has no attachments
 */


exports.InMemoryRxCollection = InMemoryRxCollection;

function toCleanSchema(rxSchema) {
  var newSchemaJson = (0, _util.clone)(rxSchema.jsonSchema);
  newSchemaJson.keyCompression = false;
  delete newSchemaJson.properties._rev;
  delete newSchemaJson.properties._attachments;

  var removeEncryption = function removeEncryption(schema, complete) {
    delete schema.encrypted;
    Object.values(schema).filter(function (val) {
      return typeof val === 'object';
    }).forEach(function (val) {
      return removeEncryption(val, complete);
    });
  };

  removeEncryption(newSchemaJson, newSchemaJson);
  return (0, _rxSchema.createRxSchema)(newSchemaJson);
}
/**
 * replicates all documents from the parent to the inMemoryCollection
 * @return Promise that resolves with an array of the docs data
 */


function replicateExistingDocuments(fromCollection, toCollection) {
  var pouch = fromCollection.storageInstance.internals.pouch;
  return pouch.allDocs({
    attachments: false,
    include_docs: true
  }).then(function (allRows) {
    var docs = allRows.rows.map(function (row) {
      return row.doc;
    }).filter(function (doc) {
      return !doc.language;
    }) // do not replicate design-docs
    .map(function (doc) {
      return (0, _rxCollectionHelper._handleFromStorageInstance)(fromCollection, doc);
    }) // swap back primary because keyCompression:false
    .map(function (doc) {
      var primaryKey = fromCollection.schema.primaryPath;
      return (0, _pouchdb.pouchSwapPrimaryToId)(primaryKey, doc);
    });

    if (docs.length === 0) {
      // nothing to replicate
      return Promise.resolve([]);
    } else {
      return toCollection.storageInstance.internals.pouch.bulkDocs({
        docs: docs
      }, BULK_DOC_OPTIONS_FALSE).then(function () {
        return docs;
      });
    }
  });
}
/**
 * sets the indexes from the schema at the pouchdb
 */


function setIndexes(schema, pouch) {
  return Promise.all(schema.indexes.map(function (indexAr) {
    var indexName = 'idx-rxdb-' + indexAr.join(',');
    return pouch.createIndex({
      ddoc: indexName,
      name: indexName,
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
 * @param prevFilter can be used to filter changes before doing anything
 * @return observable that emits document-data
 */


function streamChangedDocuments(rxCollection) {
  var prevFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (_i) {
    return true;
  };

  if (!rxCollection._doNotEmitSet) {
    rxCollection._doNotEmitSet = new Set();
  }

  var observable = (0, _rxjs.fromEvent)(rxCollection.storageInstance.internals.pouch.changes({
    since: 'now',
    live: true,
    include_docs: true
  }), 'change').pipe(
  /**
   * we need this delay because with pouchdb 7.2.2
   * it happened that _doNotEmitSet.add() from applyChangedDocumentToPouch()
   * was called after the change was streamed downwards
   * which then leads to a wrong detection
   */
  (0, _operators.delay)(0), (0, _operators.map)(function (changeAr) {
    return changeAr[0];
  }), // rxjs emits an array for whatever reason
  (0, _operators.filter)(function (change) {
    // changes on the doNotEmit-list shell not be fired
    var emitFlag = change.id + ':' + change.doc._rev;

    if (rxCollection._doNotEmitSet.has(emitFlag)) {
      return false;
    } else {
      return true;
    }
  }), (0, _operators.filter)(function (change) {
    return prevFilter(change);
  }), (0, _operators.map)(function (change) {
    return (0, _rxCollectionHelper._handleFromStorageInstance)(rxCollection, change.doc);
  }), (0, _operators.map)(function (d) {
    var primaryKey = rxCollection.schema.primaryPath;
    return (0, _pouchdb.pouchSwapIdToPrimary)(primaryKey, d);
  }));
  return observable;
}
/**
 * writes the doc-data into the pouchdb of the collection
 * without changeing the revision
 */


function applyChangedDocumentToPouch(rxCollection, docData) {
  if (!rxCollection._doNotEmitSet) {
    rxCollection._doNotEmitSet = new Set();
  }

  var primaryKey = rxCollection.schema.primaryPath;
  var transformedDoc = (0, _rxCollectionHelper._handleToStorageInstance)(rxCollection, docData);
  transformedDoc = (0, _pouchdb.pouchSwapPrimaryToId)(primaryKey, transformedDoc);
  return rxCollection.storageInstance.internals.pouch.get(transformedDoc._id).then(function (oldDoc) {
    return transformedDoc._rev = oldDoc._rev;
  })["catch"](function () {
    // doc not found, do not use a revision
    delete transformedDoc._rev;
  }).then(function () {
    return rxCollection.storageInstance.internals.pouch.bulkDocs({
      docs: [transformedDoc]
    }, BULK_DOC_OPTIONS);
  }).then(function (bulkRet) {
    if (bulkRet.length > 0 && !bulkRet[0].ok) {
      throw new Error(JSON.stringify(bulkRet[0]));
    } // set the flag so this does not appear in the own event-stream again


    var emitFlag = transformedDoc._id + ':' + bulkRet[0].rev;

    rxCollection._doNotEmitSet.add(emitFlag); // remove from the list later to not have a memory-leak


    setTimeout(function () {
      return rxCollection._doNotEmitSet["delete"](emitFlag);
    }, 30 * 1000);
    return transformedDoc;
  });
}

var INIT_DONE = false;
var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.inMemory = inMemory;
  }
};
exports.prototypes = prototypes;
var RxDBInMemoryPlugin = {
  name: 'in-memory',
  rxdb: rxdb,
  prototypes: prototypes
};
exports.RxDBInMemoryPlugin = RxDBInMemoryPlugin;
//# sourceMappingURL=in-memory.js.map