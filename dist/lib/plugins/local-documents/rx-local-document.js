"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxLocalDocument = createRxLocalDocument;

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

var _objectPath = _interopRequireDefault(require("object-path"));

var _operators = require("rxjs/operators");

var _overwritable = require("../../overwritable");

var _rxDocument = require("../../rx-document");

var _rxError = require("../../rx-error");

var _rxStorageHelper = require("../../rx-storage-helper");

var _util = require("../../util");

var _localDocumentsHelper = require("./local-documents-helper");

var RxDocumentParent = (0, _rxDocument.createRxDocumentConstructor)();

var RxLocalDocumentClass = /*#__PURE__*/function (_RxDocumentParent) {
  (0, _inheritsLoose2["default"])(RxLocalDocumentClass, _RxDocumentParent);

  function RxLocalDocumentClass(id, jsonData, parent, state) {
    var _this;

    _this = _RxDocumentParent.call(this, null, jsonData) || this;
    _this.id = id;
    _this.parent = parent;
    _this.state = state;
    return _this;
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
  _handleChangeEvent: function _handleChangeEvent(changeEvent) {
    if (changeEvent.documentId !== this.primary) {
      return;
    }

    switch (changeEvent.operation) {
      case 'UPDATE':
        var newData = changeEvent.documentData;

        this._dataSync$.next(newData);

        break;

      case 'DELETE':
        // remove from docCache to assure new upserted RxDocuments will be a new instance
        var docCache = this.state.docCache;
        docCache["delete"](this.primary);

        this._isDeleted$.next(true);

        break;
    }
  },

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
    return this._dataSync$.asObservable();
  },

  $emit: function $emit(changeEvent) {
    return this.parent.$emit(changeEvent);
  },
  get: function get(objPath) {
    objPath = 'data.' + objPath;

    if (!this._data) {
      return undefined;
    }

    if (typeof objPath !== 'string') {
      throw (0, _rxError.newRxTypeError)('LD2', {
        objPath: objPath
      });
    }

    var valueObj = _objectPath["default"].get(this._data, objPath);

    valueObj = _overwritable.overwritable.deepFreezeWhenDevMode(valueObj);
    return valueObj;
  },
  get$: function get$(objPath) {
    objPath = 'data.' + objPath;

    if (objPath.includes('.item.')) {
      throw (0, _rxError.newRxError)('LD3', {
        objPath: objPath
      });
    }

    if (objPath === this.primaryPath) {
      throw (0, _rxError.newRxError)('LD4');
    }

    return this._dataSync$.pipe((0, _operators.map)(function (data) {
      return _objectPath["default"].get(data, objPath);
    }), (0, _operators.distinctUntilChanged)());
  },
  atomicPatch: function atomicPatch(patch) {
    return this.atomicUpdate(function (docData) {
      Object.entries(patch).forEach(function (_ref) {
        var k = _ref[0],
            v = _ref[1];
        docData.data[k] = v;
      });
      return docData;
    });
  },
  _saveData: function _saveData(newData) {
    try {
      var _this3 = this;

      return Promise.resolve((0, _localDocumentsHelper.getLocalDocStateByParent)(_this3.parent)).then(function (state) {
        var oldData = _this3._dataSync$.getValue();

        newData.id = _this3.id;
        return state.storageInstance.bulkWrite([{
          previous: oldData,
          document: newData
        }]).then(function (res) {
          var docResult = res.success[newData.id];

          if (!docResult) {
            throw (0, _util.getFromObjectOrThrow)(res.error, newData.id);
          }

          newData = (0, _util.flatClone)(newData);
          newData._rev = docResult._rev;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  },
  remove: function remove() {
    try {
      var _this5 = this;

      return Promise.resolve((0, _localDocumentsHelper.getLocalDocStateByParent)(_this5.parent)).then(function (state) {
        var writeData = {
          id: _this5.id,
          data: {},
          _deleted: true,
          _meta: (0, _util.getDefaultRxDocumentMeta)(),
          _rev: (0, _util.getDefaultRevision)(),
          _attachments: {}
        };
        return (0, _rxStorageHelper.writeSingle)(state.storageInstance, {
          previous: _this5._data,
          document: writeData
        }).then(function () {
          _this5.state.docCache["delete"](_this5.id);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
};
var INIT_DONE = false;

var _init = function _init() {
  if (INIT_DONE) return;else INIT_DONE = true; // add functions of RxDocument

  var docBaseProto = _rxDocument.basePrototype;
  var props = Object.getOwnPropertyNames(docBaseProto);
  props.forEach(function (key) {
    var exists = Object.getOwnPropertyDescriptor(RxLocalDocumentPrototype, key);
    if (exists) return;
    var desc = Object.getOwnPropertyDescriptor(docBaseProto, key);
    Object.defineProperty(RxLocalDocumentPrototype, key, desc);
  });
  /**
   * Overwrite things that do not work on local documents
   * with a throwing function.
   */

  var getThrowingFun = function getThrowingFun(k) {
    return function () {
      throw (0, _rxError.newRxError)('LD6', {
        functionName: k
      });
    };
  };

  ['populate', 'update', 'putAttachment', 'getAttachment', 'allAttachments'].forEach(function (k) {
    return RxLocalDocumentPrototype[k] = getThrowingFun(k);
  });
};

function createRxLocalDocument(id, data, parent, state) {
  _init();

  var newDoc = new RxLocalDocumentClass(id, data, parent, state);
  newDoc.__proto__ = RxLocalDocumentPrototype;
  state.docCache.set(id, newDoc);
  return newDoc;
}
//# sourceMappingURL=rx-local-document.js.map