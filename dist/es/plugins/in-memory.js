import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _assertThisInitialized from "@babel/runtime/helpers/assertThisInitialized";
import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import _regeneratorRuntime from "@babel/runtime/regenerator";

/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */
import { Subject, fromEvent as ObservableFromEvent, firstValueFrom } from 'rxjs';
import { filter, map, mergeMap, delay } from 'rxjs/operators';
import { RxCollectionBase } from '../rx-collection';
import { clone, PROMISE_RESOLVE_VOID, randomCouchString } from '../util';
import { PouchDB, getRxStoragePouch, pouchSwapIdToPrimary, pouchSwapPrimaryToId } from '../plugins/pouchdb';
import { createCrypter } from '../crypter';
import { createChangeEventBuffer } from '../change-event-buffer';
import { createRxSchema } from '../rx-schema';
import { newRxError } from '../rx-error';
import { getDocumentDataOfRxChangeEvent } from '../rx-change-event';
import { _handleFromStorageInstance, _handleToStorageInstance } from '../rx-collection-helper';
var collectionCacheMap = new WeakMap();
var collectionPromiseCacheMap = new WeakMap();
var BULK_DOC_OPTIONS = {
  new_edits: true
};
var BULK_DOC_OPTIONS_FALSE = {
  new_edits: false
};
export var InMemoryRxCollection = /*#__PURE__*/function (_RxCollectionBase) {
  _inheritsLoose(InMemoryRxCollection, _RxCollectionBase);

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
    _this._crypter = createCrypter(_this.database.password, _this.schema);
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
      Object.defineProperty(_assertThisInitialized(_this), funName, {
        get: function get() {
          return fun.bind(_assertThisInitialized(_this));
        }
      });
    });
    _this._observable$ = new Subject();
    _this._changeEventBuffer = createChangeEventBuffer(_assertThisInitialized(_this));
    var parentProto = Object.getPrototypeOf(parentCollection);
    _this._oldPouchPut = parentProto._pouchPut.bind(_assertThisInitialized(_this));
    _this._nonPersistentRevisions = new Set();
    _this._nonPersistentRevisionsSubject = new Subject(); // emits Set.size() when Set is changed

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
      var thisToParentSub = streamChangedDocuments(_this2).pipe(mergeMap(function (doc) {
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
      return PROMISE_RESOLVE_VOID;
    }

    return firstValueFrom(this._nonPersistentRevisionsSubject.pipe(filter(function () {
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
    var doc = getDocumentDataOfRxChangeEvent(changeEvent);

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
    throw newRxError('IM2');
  };

  return InMemoryRxCollection;
}(RxCollectionBase);
/**
 * returns a version of the schema that:
 * - disabled the keyCompression
 * - has no encryption
 * - has no attachments
 */

function toCleanSchema(rxSchema) {
  var newSchemaJson = clone(rxSchema.jsonSchema);
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
  return createRxSchema(newSchemaJson);
}
/**
 * replicates all documents from the parent to the inMemoryCollection
 * @return Promise that resolves with an array of the docs data
 */


export function replicateExistingDocuments(fromCollection, toCollection) {
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
      return _handleFromStorageInstance(fromCollection, doc);
    }) // swap back primary because keyCompression:false
    .map(function (doc) {
      var primaryKey = fromCollection.schema.primaryPath;
      return pouchSwapPrimaryToId(primaryKey, doc);
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

export function setIndexes(schema, pouch) {
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

export function streamChangedDocuments(rxCollection) {
  var prevFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (_i) {
    return true;
  };

  if (!rxCollection._doNotEmitSet) {
    rxCollection._doNotEmitSet = new Set();
  }

  var observable = ObservableFromEvent(rxCollection.storageInstance.internals.pouch.changes({
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
  delay(0), map(function (changeAr) {
    return changeAr[0];
  }), // rxjs emits an array for whatever reason
  filter(function (change) {
    // changes on the doNotEmit-list shell not be fired
    var emitFlag = change.id + ':' + change.doc._rev;

    if (rxCollection._doNotEmitSet.has(emitFlag)) {
      return false;
    } else {
      return true;
    }
  }), filter(function (change) {
    return prevFilter(change);
  }), map(function (change) {
    return _handleFromStorageInstance(rxCollection, change.doc);
  }), map(function (d) {
    var primaryKey = rxCollection.schema.primaryPath;
    return pouchSwapIdToPrimary(primaryKey, d);
  }));
  return observable;
}
/**
 * writes the doc-data into the pouchdb of the collection
 * without changeing the revision
 */

export function applyChangedDocumentToPouch(rxCollection, docData) {
  if (!rxCollection._doNotEmitSet) {
    rxCollection._doNotEmitSet = new Set();
  }

  var primaryKey = rxCollection.schema.primaryPath;

  var transformedDoc = _handleToStorageInstance(rxCollection, docData);

  transformedDoc = pouchSwapPrimaryToId(primaryKey, transformedDoc);
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
/**
 * called in the proto of RxCollection
 */

export function inMemory() {
  return _inMemory.apply(this, arguments);
}

function _inMemory() {
  _inMemory = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
    var _this5 = this;

    var col, preparePromise;
    return _regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (INIT_DONE) {
              _context.next = 4;
              break;
            }

            INIT_DONE = true; // ensure memory-adapter is added

            if (!(!PouchDB.adapters || !PouchDB.adapters.memory)) {
              _context.next = 4;
              break;
            }

            throw newRxError('IM1');

          case 4:
            if (!collectionCacheMap.has(this)) {
              _context.next = 6;
              break;
            }

            return _context.abrupt("return", collectionPromiseCacheMap.get(this).then(function () {
              return collectionCacheMap.get(_this5);
            }));

          case 6:
            col = new InMemoryRxCollection(this);
            _context.next = 9;
            return prepareInMemoryRxCollection(col);

          case 9:
            preparePromise = col.prepareChild();
            collectionCacheMap.set(this, col);
            collectionPromiseCacheMap.set(this, preparePromise);
            return _context.abrupt("return", preparePromise.then(function () {
              return col;
            }));

          case 13:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));
  return _inMemory.apply(this, arguments);
}

export function prepareInMemoryRxCollection(_x) {
  return _prepareInMemoryRxCollection.apply(this, arguments);
}

function _prepareInMemoryRxCollection() {
  _prepareInMemoryRxCollection = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(instance) {
    var memoryStorage;
    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            memoryStorage = getRxStoragePouch('memory', {});
            _context2.next = 3;
            return memoryStorage.createStorageInstance({
              databaseName: 'rxdb-in-memory',
              collectionName: randomCouchString(10),
              schema: instance.schema.jsonSchema,
              options: instance.pouchSettings
            });

          case 3:
            instance.storageInstance = _context2.sent;
            instance.pouch = instance.storageInstance.internals.pouch;

          case 5:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _prepareInMemoryRxCollection.apply(this, arguments);
}

export var rxdb = true;
export var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.inMemory = inMemory;
  }
};
export var RxDBInMemoryPlugin = {
  name: 'in-memory',
  rxdb: rxdb,
  prototypes: prototypes
};
//# sourceMappingURL=in-memory.js.map