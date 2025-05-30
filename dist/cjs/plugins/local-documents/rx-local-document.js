"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxLocalDocument = createRxLocalDocument;
exports.getRxDatabaseFromLocalDocument = getRxDatabaseFromLocalDocument;
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _rxjs = require("rxjs");
var _overwritable = require("../../overwritable.js");
var _rxChangeEvent = require("../../rx-change-event.js");
var _rxDocument = require("../../rx-document.js");
var _rxError = require("../../rx-error.js");
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _index = require("../../plugins/utils/index.js");
var _localDocumentsHelper = require("./local-documents-helper.js");
var _rxDatabase = require("../../rx-database.js");
var RxDocumentParent = (0, _rxDocument.createRxDocumentConstructor)();
var RxLocalDocumentClass = /*#__PURE__*/function (_RxDocumentParent) {
  function RxLocalDocumentClass(id, jsonData, parent) {
    var _this2;
    _this2 = _RxDocumentParent.call(this, null, jsonData) || this;
    _this2.id = id;
    _this2.parent = parent;
    return _this2;
  }
  (0, _inheritsLoose2.default)(RxLocalDocumentClass, _RxDocumentParent);
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
    var state = (0, _index.getFromMapOrThrow)(_localDocumentsHelper.LOCAL_DOC_STATE_BY_PARENT_RESOLVED, this.parent);
    var id = this.primary;
    return _this.parent.eventBulks$.pipe((0, _rxjs.filter)(bulk => !!bulk.isLocal), (0, _rxjs.map)(bulk => bulk.events.find(ev => ev.documentId === id)), (0, _rxjs.filter)(event => !!event), (0, _rxjs.map)(changeEvent => (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)((0, _index.ensureNotFalsy)(changeEvent))), (0, _rxjs.startWith)(state.docCache.getLatestDocumentData(this.primary)), (0, _rxjs.distinctUntilChanged)((prev, curr) => prev._rev === curr._rev), (0, _rxjs.map)(docData => state.docCache.getCachedRxDocument(docData)), (0, _rxjs.shareReplay)(_index.RXJS_SHARE_REPLAY_DEFAULTS));
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
    var state = (0, _index.getFromMapOrThrow)(_localDocumentsHelper.LOCAL_DOC_STATE_BY_PARENT_RESOLVED, this.parent);
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
    var valueObj = (0, _index.getProperty)(this._data, objPath);
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
    return this.$.pipe((0, _rxjs.map)(localDocument => localDocument._data), (0, _rxjs.map)(data => (0, _index.getProperty)(data, objPath)), (0, _rxjs.distinctUntilChanged)());
  },
  get$$(objPath) {
    var db = getRxDatabaseFromLocalDocument(this);
    var reactivity = db.getReactivityFactory();
    return reactivity.fromObservable(this.get$(objPath), this.getLatest().get(objPath), db);
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
    var writeRows = [{
      previous: oldData,
      document: newData
    }];
    return state.storageInstance.bulkWrite(writeRows, 'local-document-save-data').then(res => {
      if (res.error[0]) {
        throw res.error[0];
      }
      var success = (0, _rxStorageHelper.getWrittenDocumentsFromBulkWriteResponse)(this.collection.schema.primaryPath, writeRows, res)[0];
      newData = (0, _index.flatClone)(newData);
      newData._rev = success._rev;
    });
  },
  async remove() {
    var state = await (0, _localDocumentsHelper.getLocalDocStateByParent)(this.parent);
    var writeData = (0, _index.flatClone)(this._data);
    writeData._deleted = true;
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
  ['populate', 'update', 'putAttachment', 'putAttachmentBase64', 'getAttachment', 'allAttachments'].forEach(k => RxLocalDocumentPrototype[k] = getThrowingFun(k));
};
function createRxLocalDocument(data, parent) {
  _init();
  var newDoc = new RxLocalDocumentClass(data.id, data, parent);
  Object.setPrototypeOf(newDoc, RxLocalDocumentPrototype);
  newDoc.prototype = RxLocalDocumentPrototype;
  return newDoc;
}
function getRxDatabaseFromLocalDocument(doc) {
  var parent = doc.parent;
  if ((0, _rxDatabase.isRxDatabase)(parent)) {
    return parent;
  } else {
    return parent.database;
  }
}
//# sourceMappingURL=rx-local-document.js.map