"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxLocalDocument = createRxLocalDocument;
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _operators = require("rxjs/operators");
var _overwritable = require("../../overwritable");
var _rxChangeEvent = require("../../rx-change-event");
var _rxDocument = require("../../rx-document");
var _rxError = require("../../rx-error");
var _rxStorageHelper = require("../../rx-storage-helper");
var _utils = require("../../plugins/utils");
var _localDocumentsHelper = require("./local-documents-helper");
var RxDocumentParent = (0, _rxDocument.createRxDocumentConstructor)();
var RxLocalDocumentClass = /*#__PURE__*/function (_RxDocumentParent) {
  (0, _inheritsLoose2.default)(RxLocalDocumentClass, _RxDocumentParent);
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
    throw (0, _rxError.newRxError)('LD1', {
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
    return _this.parent.$.pipe((0, _operators.filter)(changeEvent => changeEvent.isLocal), (0, _operators.filter)(changeEvent => changeEvent.documentId === this.primary), (0, _operators.map)(changeEvent => (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent)), (0, _operators.startWith)(this._data), (0, _operators.distinctUntilChanged)((prev, curr) => prev._rev === curr._rev), (0, _operators.shareReplay)(_utils.RXJS_SHARE_REPLAY_DEFAULTS));
  },
  getLatest() {
    var state = (0, _utils.getFromMapOrThrow)(_localDocumentsHelper.LOCAL_DOC_STATE_BY_PARENT_RESOLVED, this.parent);
    var latestDocData = state.docCache.getLatestDocumentData(this.primary);
    return state.docCache.getCachedRxDocument(latestDocData);
  },
  get(objPath) {
    objPath = 'data.' + objPath;
    if (!this._data) {
      return undefined;
    }
    if (typeof objPath !== 'string') {
      throw (0, _rxError.newRxTypeError)('LD2', {
        objPath
      });
    }
    var valueObj = (0, _utils.getProperty)(this._data, objPath);
    valueObj = _overwritable.overwritable.deepFreezeWhenDevMode(valueObj);
    return valueObj;
  },
  get$(objPath) {
    objPath = 'data.' + objPath;
    if (_overwritable.overwritable.isDevMode()) {
      if (objPath.includes('.item.')) {
        throw (0, _rxError.newRxError)('LD3', {
          objPath
        });
      }
      if (objPath === this.primaryPath) {
        throw (0, _rxError.newRxError)('LD4');
      }
    }
    return this.$.pipe((0, _operators.map)(data => (0, _utils.getProperty)(data, objPath)), (0, _operators.distinctUntilChanged)());
  },
  async incrementalModify(mutationFunction) {
    var state = await (0, _localDocumentsHelper.getLocalDocStateByParent)(this.parent);
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
    var state = await (0, _localDocumentsHelper.getLocalDocStateByParent)(this.parent);
    var oldData = this._data;
    newData.id = this.id;
    return state.storageInstance.bulkWrite([{
      previous: oldData,
      document: newData
    }], 'local-document-save-data').then(res => {
      var docResult = res.success[newData.id];
      if (!docResult) {
        throw (0, _utils.getFromObjectOrThrow)(res.error, newData.id);
      }
      newData = (0, _utils.flatClone)(newData);
      newData._rev = docResult._rev;
    });
  },
  async remove() {
    var state = await (0, _localDocumentsHelper.getLocalDocStateByParent)(this.parent);
    var writeData = {
      id: this._data.id,
      data: {},
      _deleted: true,
      _meta: (0, _utils.getDefaultRxDocumentMeta)(),
      _rev: (0, _utils.getDefaultRevision)(),
      _attachments: {}
    };
    return (0, _rxStorageHelper.writeSingle)(state.storageInstance, {
      previous: this._data,
      document: writeData
    }, 'local-document-remove').then(writeResult => state.docCache.getCachedRxDocument(writeResult));
  }
};
var INIT_DONE = false;
var _init = () => {
  if (INIT_DONE) return;else INIT_DONE = true;

  // add functions of RxDocument
  var docBaseProto = _rxDocument.basePrototype;
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
    throw (0, _rxError.newRxError)('LD6', {
      functionName: k
    });
  };
  ['populate', 'update', 'putAttachment', 'getAttachment', 'allAttachments'].forEach(k => RxLocalDocumentPrototype[k] = getThrowingFun(k));
};
function createRxLocalDocument(data, parent) {
  _init();
  var newDoc = new RxLocalDocumentClass(data.id, data, parent);
  Object.setPrototypeOf(newDoc, RxLocalDocumentPrototype);
  newDoc.prototype = RxLocalDocumentPrototype;
  return newDoc;
}
//# sourceMappingURL=rx-local-document.js.map