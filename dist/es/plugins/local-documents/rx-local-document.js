import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import objectPath from 'object-path';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { overwritable } from '../../overwritable';
import { basePrototype, createRxDocumentConstructor } from '../../rx-document';
import { newRxError, newRxTypeError } from '../../rx-error';
import { writeSingle } from '../../rx-storage-helper';
import { flatClone, getDefaultRevision, getDefaultRxDocumentMeta, getFromObjectOrThrow } from '../../util';
import { getLocalDocStateByParent } from './local-documents-helper';
var RxDocumentParent = createRxDocumentConstructor();

var RxLocalDocumentClass = /*#__PURE__*/function (_RxDocumentParent) {
  _inheritsLoose(RxLocalDocumentClass, _RxDocumentParent);

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
      throw newRxTypeError('LD2', {
        objPath: objPath
      });
    }

    var valueObj = objectPath.get(this._data, objPath);
    valueObj = overwritable.deepFreezeWhenDevMode(valueObj);
    return valueObj;
  },
  get$: function get$(objPath) {
    objPath = 'data.' + objPath;

    if (objPath.includes('.item.')) {
      throw newRxError('LD3', {
        objPath: objPath
      });
    }

    if (objPath === this.primaryPath) {
      throw newRxError('LD4');
    }

    return this._dataSync$.pipe(map(function (data) {
      return objectPath.get(data, objPath);
    }), distinctUntilChanged());
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

      return Promise.resolve(getLocalDocStateByParent(_this3.parent)).then(function (state) {
        var oldData = _this3._dataSync$.getValue();

        newData.id = _this3.id;
        return state.storageInstance.bulkWrite([{
          previous: oldData,
          document: newData
        }]).then(function (res) {
          var docResult = res.success[newData.id];

          if (!docResult) {
            throw getFromObjectOrThrow(res.error, newData.id);
          }

          newData = flatClone(newData);
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

      return Promise.resolve(getLocalDocStateByParent(_this5.parent)).then(function (state) {
        var writeData = {
          id: _this5.id,
          data: {},
          _deleted: true,
          _meta: getDefaultRxDocumentMeta(),
          _rev: getDefaultRevision(),
          _attachments: {}
        };
        return writeSingle(state.storageInstance, {
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

  var docBaseProto = basePrototype;
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
      throw newRxError('LD6', {
        functionName: k
      });
    };
  };

  ['populate', 'update', 'putAttachment', 'getAttachment', 'allAttachments'].forEach(function (k) {
    return RxLocalDocumentPrototype[k] = getThrowingFun(k);
  });
};

export function createRxLocalDocument(id, data, parent, state) {
  _init();

  var newDoc = new RxLocalDocumentClass(id, data, parent, state);
  newDoc.__proto__ = RxLocalDocumentPrototype;
  state.docCache.set(id, newDoc);
  return newDoc;
}
//# sourceMappingURL=rx-local-document.js.map