import _assertThisInitialized from "@babel/runtime/helpers/assertThisInitialized";
import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";

/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */
import { Subject, fromEvent as ObservableFromEvent } from 'rxjs';
import { filter, map, mergeMap, first } from 'rxjs/operators';
import { RxCollectionBase } from '../rx-collection';
import { clone, randomCouchString, adapterObject } from '../util';
import Core from '../core';
import Crypter from '../crypter';
import { createChangeEventBuffer } from '../change-event-buffer';
import { createRxSchema } from '../rx-schema';
import { PouchDB } from '../pouch-db';
import { newRxError } from '../rx-error'; // add the watch-for-changes-plugin

import RxDBWatchForChangesPlugin from '../plugins/watch-for-changes';
Core.plugin(RxDBWatchForChangesPlugin);
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

  function InMemoryRxCollection(parentCollection) {
    var _this;

    var pouchSettings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _this = _RxCollectionBase.call(this, parentCollection.database, parentCollection.name, toCleanSchema(parentCollection.schema), pouchSettings, // pouchSettings
    {}, parentCollection._methods) || this;
    _this._eventCounter = 0;
    _this._isInMemory = true;
    _this._parentCollection = parentCollection;

    _this._parentCollection.onDestroy.then(function () {
      return _this.destroy();
    });

    _this._crypter = Crypter.create(_this.database.password, _this.schema);
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
    Object.entries(parentCollection.statics).forEach(function (_ref) {
      var funName = _ref[0],
          fun = _ref[1];
      Object.defineProperty(_assertThisInitialized(_this), funName, {
        get: function get() {
          return fun.bind(_assertThisInitialized(_this));
        }
      });
    });
    _this.pouch = new PouchDB('rxdb-in-memory-' + randomCouchString(10), adapterObject('memory'));
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

    return setIndexes(this.schema, this.pouch).then(function () {
      _this2._subs.push(_this2._observable$.subscribe(function (cE) {
        // when data changes, send it to RxDocument in docCache
        var doc = _this2._docCache.get(cE.data.doc);

        if (doc) doc._handleChangeEvent(cE);
      }));
    }) // initial sync parent's docs to own
    .then(function () {
      return replicateExistingDocuments(_this2._parentCollection, _this2);
    }).then(function () {
      /**
       * call watchForChanges() on both sides,
       * to ensure none-rxdb-changes like replication
       * will fire into the change-event-stream
       */
      _this2._parentCollection.watchForChanges();

      _this2.watchForChanges();
      /**
       * create an ongoing replications between both sides
       */


      var thisToParentSub = streamChangedDocuments(_this2).pipe(mergeMap(function (doc) {
        return applyChangedDocumentToPouch(_this2._parentCollection, doc).then(function () {
          return doc['_rev'];
        });
      })).subscribe(function (changeRev) {
        _this2._nonPersistentRevisions["delete"](changeRev);

        _this2._nonPersistentRevisionsSubject.next(_this2._nonPersistentRevisions.size);
      });

      _this2._subs.push(thisToParentSub);

      var parentToThisSub = streamChangedDocuments(_this2._parentCollection).subscribe(function (doc) {
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

    if (this._nonPersistentRevisions.size === 0) return Promise.resolve();
    return this._nonPersistentRevisionsSubject.pipe(filter(function () {
      return _this3._nonPersistentRevisions.size === 0;
    }), first()).toPromise();
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
    if (this._changeEventBuffer.hasChangeWithRevision(changeEvent.data.v && changeEvent.data.v._rev)) return;

    this._observable$.next(changeEvent); // run compaction each 10 events


    this._eventCounter++;

    if (this._eventCounter === 10) {
      this._eventCounter = 0;
      this.pouch.compact();
    }
  }
  /**
   * @overwrite
   * Replication on the inMemory is dangerous,
   * replicate with it's parent instead
   */
  ;

  _proto.sync = function sync() {
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
  var newSchemaJson = clone(rxSchema.jsonID);
  newSchemaJson.keyCompression = false;
  delete newSchemaJson.properties._id;
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
    if (docs.length === 0) return Promise.resolve([]); // nothing to replicate
    else {
        return toCollection.pouch.bulkDocs({
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
 * @param prevFilter can be used to filter changes before doing anything
 * @return observable that emits document-data
 */

export function streamChangedDocuments(rxCollection) {
  var prevFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (i) {
    return true;
  };
  if (!rxCollection._doNotEmitSet) rxCollection._doNotEmitSet = new Set();
  var observable = ObservableFromEvent(rxCollection.pouch.changes({
    since: 'now',
    live: true,
    include_docs: true
  }), 'change').pipe(map(function (changeAr) {
    return changeAr[0];
  }), // rxjs emits an array for whatever reason
  filter(function (change) {
    // changes on the doNotEmit-list shell not be fired
    var emitFlag = change.id + ':' + change.doc._rev;
    if (rxCollection._doNotEmitSet.has(emitFlag)) return false;else return true;
  }), filter(function (change) {
    return prevFilter(change);
  }), map(function (change) {
    return rxCollection._handleFromPouch(change.doc);
  }));
  return observable;
}
/**
 * writes the doc-data into the pouchdb of the collection
 * without changeing the revision
 */

export function applyChangedDocumentToPouch(rxCollection, docData) {
  if (!rxCollection._doNotEmitSet) rxCollection._doNotEmitSet = new Set();

  var transformedDoc = rxCollection._handleToPouch(docData);

  return rxCollection.pouch.get(transformedDoc._id).then(function (oldDoc) {
    return transformedDoc._rev = oldDoc._rev;
  })["catch"](function () {
    // doc not found, do not use a revision
    delete transformedDoc._rev;
  }).then(function () {
    return rxCollection.pouch.bulkDocs({
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

export function spawnInMemory() {
  var _this5 = this;

  if (!INIT_DONE) {
    INIT_DONE = true; // ensure memory-adapter is added

    if (!PouchDB.adapters || !PouchDB.adapters.memory) throw newRxError('IM1');
  }

  if (collectionCacheMap.has(this)) {
    // already exists for this collection -> wait until synced
    return collectionPromiseCacheMap.get(this).then(function () {
      return collectionCacheMap.get(_this5);
    });
  }

  var col = new InMemoryRxCollection(this);
  var preparePromise = col.prepareChild();
  collectionCacheMap.set(this, col);
  collectionPromiseCacheMap.set(this, preparePromise);
  return preparePromise.then(function () {
    return col;
  });
}
export var rxdb = true;
export var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.inMemory = spawnInMemory;
  }
};
export var overwritable = {};
export default {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  spawnInMemory: spawnInMemory
};
//# sourceMappingURL=in-memory.js.map