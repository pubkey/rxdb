import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import { distinctUntilChanged, filter, map, shareReplay, startWith } from 'rxjs';
import { overwritable } from "../../overwritable.js";
import { getDocumentDataOfRxChangeEvent } from "../../rx-change-event.js";
import { basePrototype, createRxDocumentConstructor } from "../../rx-document.js";
import { newRxError, newRxTypeError } from "../../rx-error.js";
import { getWrappedStorageInstance, getWrittenDocumentsFromBulkWriteResponse, writeSingle } from "../../rx-storage-helper.js";
import { ensureNotFalsy, flatClone, getFromMapOrThrow, getProperty, RXJS_SHARE_REPLAY_DEFAULTS } from "../../plugins/utils/index.js";
import { createLocalDocumentStorageInstance, getLocalDocStateByParent, LOCAL_DOC_STATE_BY_PARENT, LOCAL_DOC_STATE_BY_PARENT_RESOLVED, RX_LOCAL_DOCUMENT_SCHEMA } from "./local-documents-helper.js";
import { isRxDatabase } from "../../rx-database.js";
import { DocumentCache } from "../../doc-cache.js";
import { IncrementalWriteQueue } from "../../incremental-write.js";
var RxDocumentParent = createRxDocumentConstructor();
var RxLocalDocumentClass = /*#__PURE__*/function (_RxDocumentParent) {
  function RxLocalDocumentClass(id, jsonData, parent) {
    var _this2;
    _this2 = _RxDocumentParent.call(this, null, jsonData) || this;
    _this2.id = id;
    _this2.parent = parent;
    return _this2;
  }
  _inheritsLoose(RxLocalDocumentClass, _RxDocumentParent);
  return RxLocalDocumentClass;
}(RxDocumentParent);
var RxLocalDocumentPrototype = {
  get isLocal() {
    return true;
  },
  //
  // overwrites
  //
  get allAttachments$() {
    // this is overwritten here because we cannot re-set getters on the prototype
    throw newRxError('LD1', {
      document: this
    });
  },
  get primaryPath() {
    return 'id';
  },
  get primary() {
    return this.id;
  },
  get $() {
    var _this = this;
    var state = getFromMapOrThrow(LOCAL_DOC_STATE_BY_PARENT_RESOLVED, this.parent);
    var id = this.primary;
    return _this.parent.eventBulks$.pipe(filter(bulk => !!bulk.isLocal), map(bulk => bulk.events.find(ev => ev.documentId === id)), filter(event => !!event), map(changeEvent => getDocumentDataOfRxChangeEvent(ensureNotFalsy(changeEvent))), startWith(state.docCache.getLatestDocumentData(this.primary)), distinctUntilChanged((prev, curr) => prev._rev === curr._rev), map(docData => state.docCache.getCachedRxDocument(docData)), shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
    ;
  },
  get $$() {
    var _this = this;
    var db = getRxDatabaseFromLocalDocument(_this);
    var reactivity = db.getReactivityFactory();
    return reactivity.fromObservable(_this.$, _this.getLatest()._data, db);
  },
  get deleted$$() {
    var _this = this;
    var db = getRxDatabaseFromLocalDocument(_this);
    var reactivity = db.getReactivityFactory();
    return reactivity.fromObservable(_this.deleted$, _this.getLatest().deleted, db);
  },
  getLatest() {
    var state = getFromMapOrThrow(LOCAL_DOC_STATE_BY_PARENT_RESOLVED, this.parent);
    var latestDocData = state.docCache.getLatestDocumentData(this.primary);
    return state.docCache.getCachedRxDocument(latestDocData);
  },
  get(objPath) {
    objPath = 'data.' + objPath;
    if (!this._data) {
      return undefined;
    }
    if (typeof objPath !== 'string') {
      throw newRxTypeError('LD2', {
        objPath
      });
    }
    var valueObj = getProperty(this._data, objPath);
    valueObj = overwritable.deepFreezeWhenDevMode(valueObj);
    return valueObj;
  },
  get$(objPath) {
    objPath = 'data.' + objPath;
    if (overwritable.isDevMode()) {
      if (objPath.includes('.item.')) {
        throw newRxError('LD3', {
          objPath
        });
      }
      if (objPath === this.primaryPath) {
        throw newRxError('LD4');
      }
    }
    return this.$.pipe(map(localDocument => localDocument._data), map(data => getProperty(data, objPath)), distinctUntilChanged());
  },
  get$$(objPath) {
    var db = getRxDatabaseFromLocalDocument(this);
    var reactivity = db.getReactivityFactory();
    return reactivity.fromObservable(this.get$(objPath), this.getLatest().get(objPath), db);
  },
  async incrementalModify(mutationFunction) {
    var state = await getLocalDocStateByParent(this.parent);
    return state.incrementalWriteQueue.addWrite(this._data, async docData => {
      docData.data = await mutationFunction(docData.data, this);
      return docData;
    }).then(result => state.docCache.getCachedRxDocument(result));
  },
  incrementalPatch(patch) {
    return this.incrementalModify(docData => {
      Object.entries(patch).forEach(([k, v]) => {
        docData[k] = v;
      });
      return docData;
    });
  },
  async _saveData(newData) {
    var state = await getLocalDocStateByParent(this.parent);
    var oldData = this._data;
    newData.id = this.id;
    var writeRows = [{
      previous: oldData,
      document: newData
    }];
    return state.storageInstance.bulkWrite(writeRows, 'local-document-save-data').then(res => {
      if (res.error[0]) {
        throw res.error[0];
      }
      var success = getWrittenDocumentsFromBulkWriteResponse(this.collection.schema.primaryPath, writeRows, res)[0];
      newData = flatClone(newData);
      newData._rev = success._rev;
    });
  },
  async remove() {
    var state = await getLocalDocStateByParent(this.parent);
    var writeData = flatClone(this._data);
    writeData._deleted = true;
    return writeSingle(state.storageInstance, {
      previous: this._data,
      document: writeData
    }, 'local-document-remove').then(writeResult => state.docCache.getCachedRxDocument(writeResult));
  }
};
var INIT_DONE = false;
var _init = () => {
  if (INIT_DONE) return;else INIT_DONE = true;

  // add functions of RxDocument
  var docBaseProto = basePrototype;
  var props = Object.getOwnPropertyNames(docBaseProto);
  props.forEach(key => {
    var exists = Object.getOwnPropertyDescriptor(RxLocalDocumentPrototype, key);
    if (exists) return;
    var desc = Object.getOwnPropertyDescriptor(docBaseProto, key);
    Object.defineProperty(RxLocalDocumentPrototype, key, desc);
  });

  /**
   * Overwrite things that do not work on local documents
   * with a throwing function.
   */
  var getThrowingFun = k => () => {
    throw newRxError('LD6', {
      functionName: k
    });
  };
  ['populate', 'update', 'putAttachment', 'putAttachmentBase64', 'getAttachment', 'allAttachments'].forEach(k => RxLocalDocumentPrototype[k] = getThrowingFun(k));
};
export function createRxLocalDocument(data, parent) {
  _init();
  var newDoc = new RxLocalDocumentClass(data.id, data, parent);
  Object.setPrototypeOf(newDoc, RxLocalDocumentPrototype);
  newDoc.prototype = RxLocalDocumentPrototype;
  return newDoc;
}
export function getRxDatabaseFromLocalDocument(doc) {
  var parent = doc.parent;
  if (isRxDatabase(parent)) {
    return parent;
  } else {
    return parent.database;
  }
}
export function createLocalDocStateByParent(parent) {
  var database = parent.database ? parent.database : parent;
  var collectionName = parent.database ? parent.name : '';
  var statePromise = (async () => {
    var storageInstance = await createLocalDocumentStorageInstance(database.token, database.storage, database.name, collectionName, database.instanceCreationOptions, database.multiInstance);
    storageInstance = getWrappedStorageInstance(database, storageInstance, RX_LOCAL_DOCUMENT_SCHEMA);
    var docCache = new DocumentCache('id', database.eventBulks$.pipe(filter(changeEventBulk => {
      var ret = false;
      if (
      // parent is database
      collectionName === '' && !changeEventBulk.collectionName ||
      // parent is collection

      collectionName !== '' && changeEventBulk.collectionName === collectionName) {
        ret = true;
      }
      return ret && changeEventBulk.isLocal;
    }), map(b => b.events)), docData => createRxLocalDocument(docData, parent));
    var incrementalWriteQueue = new IncrementalWriteQueue(storageInstance, 'id', () => {}, () => {});

    /**
     * Emit the changestream into the collections change stream
     */
    var databaseStorageToken = await database.storageToken;
    var subLocalDocs = storageInstance.changeStream().subscribe(eventBulk => {
      var events = new Array(eventBulk.events.length);
      var rawEvents = eventBulk.events;
      var collectionName = parent.database ? parent.name : undefined;
      for (var index = 0; index < rawEvents.length; index++) {
        var event = rawEvents[index];
        events[index] = {
          documentId: event.documentId,
          collectionName,
          isLocal: true,
          operation: event.operation,
          documentData: overwritable.deepFreezeWhenDevMode(event.documentData),
          previousDocumentData: overwritable.deepFreezeWhenDevMode(event.previousDocumentData)
        };
      }
      var changeEventBulk = {
        id: eventBulk.id,
        isLocal: true,
        internal: false,
        collectionName: parent.database ? parent.name : undefined,
        storageToken: databaseStorageToken,
        events,
        databaseToken: database.token,
        checkpoint: eventBulk.checkpoint,
        context: eventBulk.context
      };
      database.$emit(changeEventBulk);
    });
    parent._subs.push(subLocalDocs);
    var state = {
      database,
      parent,
      storageInstance,
      docCache,
      incrementalWriteQueue
    };
    LOCAL_DOC_STATE_BY_PARENT_RESOLVED.set(parent, state);
    return state;
  })();
  LOCAL_DOC_STATE_BY_PARENT.set(parent, statePromise);
}
//# sourceMappingURL=rx-local-document.js.map