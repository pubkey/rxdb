import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import { distinctUntilChanged, filter, map, shareReplay, startWith } from 'rxjs/operators';
import { overwritable } from '../../overwritable';
import { getDocumentDataOfRxChangeEvent } from '../../rx-change-event';
import { basePrototype, createRxDocumentConstructor } from '../../rx-document';
import { newRxError, newRxTypeError } from '../../rx-error';
import { writeSingle } from '../../rx-storage-helper';
import { flatClone, getDefaultRevision, getDefaultRxDocumentMeta, getFromMapOrThrow, getFromObjectOrThrow, getProperty, RXJS_SHARE_REPLAY_DEFAULTS } from '../../plugins/utils';
import { getLocalDocStateByParent, LOCAL_DOC_STATE_BY_PARENT_RESOLVED } from './local-documents-helper';
var RxDocumentParent = createRxDocumentConstructor();
var RxLocalDocumentClass = /*#__PURE__*/function (_RxDocumentParent) {
  _inheritsLoose(RxLocalDocumentClass, _RxDocumentParent);
  function RxLocalDocumentClass(id, jsonData, parent) {
    var _this2;
    _this2 = _RxDocumentParent.call(this, null, jsonData) || this;
    _this2.id = id;
    _this2.parent = parent;
    return _this2;
  }
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
    return _this.parent.$.pipe(filter(changeEvent => changeEvent.isLocal), filter(changeEvent => changeEvent.documentId === this.primary), map(changeEvent => getDocumentDataOfRxChangeEvent(changeEvent)), startWith(this._data), distinctUntilChanged((prev, curr) => prev._rev === curr._rev), shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
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
    return this.$.pipe(map(data => getProperty(data, objPath)), distinctUntilChanged());
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
    return state.storageInstance.bulkWrite([{
      previous: oldData,
      document: newData
    }], 'local-document-save-data').then(res => {
      var docResult = res.success[newData.id];
      if (!docResult) {
        throw getFromObjectOrThrow(res.error, newData.id);
      }
      newData = flatClone(newData);
      newData._rev = docResult._rev;
    });
  },
  async remove() {
    var state = await getLocalDocStateByParent(this.parent);
    var writeData = {
      id: this._data.id,
      data: {},
      _deleted: true,
      _meta: getDefaultRxDocumentMeta(),
      _rev: getDefaultRevision(),
      _attachments: {}
    };
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
  ['populate', 'update', 'putAttachment', 'getAttachment', 'allAttachments'].forEach(k => RxLocalDocumentPrototype[k] = getThrowingFun(k));
};
export function createRxLocalDocument(data, parent) {
  _init();
  var newDoc = new RxLocalDocumentClass(data.id, data, parent);
  Object.setPrototypeOf(newDoc, RxLocalDocumentPrototype);
  newDoc.prototype = RxLocalDocumentPrototype;
  return newDoc;
}
//# sourceMappingURL=rx-local-document.js.map