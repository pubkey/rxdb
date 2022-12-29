import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import objectPath from 'object-path';
import { distinctUntilChanged, filter, map, shareReplay, startWith } from 'rxjs/operators';
import { overwritable } from '../../overwritable';
import { getDocumentDataOfRxChangeEvent } from '../../rx-change-event';
import { basePrototype, createRxDocumentConstructor } from '../../rx-document';
import { newRxError, newRxTypeError } from '../../rx-error';
import { writeSingle } from '../../rx-storage-helper';
import { flatClone, getDefaultRevision, getDefaultRxDocumentMeta, getFromMapOrThrow, getFromObjectOrThrow, RXJS_SHARE_REPLAY_DEFAULTS } from '../../util';
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
    var _this3 = this;
    var _this = this;
    return _this.parent.$.pipe(filter(function (changeEvent) {
      return changeEvent.isLocal;
    }), filter(function (changeEvent) {
      return changeEvent.documentId === _this3.primary;
    }), map(function (changeEvent) {
      return getDocumentDataOfRxChangeEvent(changeEvent);
    }), startWith(this._data), distinctUntilChanged(function (prev, curr) {
      return prev._rev === curr._rev;
    }), shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
  },
  getLatest: function getLatest() {
    var state = getFromMapOrThrow(LOCAL_DOC_STATE_BY_PARENT_RESOLVED, this.parent);
    var latestDocData = state.docCache.getLatestDocumentData(this.primary);
    return state.docCache.getCachedRxDocument(latestDocData);
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
    if (overwritable.isDevMode()) {
      if (objPath.includes('.item.')) {
        throw newRxError('LD3', {
          objPath: objPath
        });
      }
      if (objPath === this.primaryPath) {
        throw newRxError('LD4');
      }
    }
    return this.$.pipe(map(function (data) {
      return objectPath.get(data, objPath);
    }), distinctUntilChanged());
  },
  incrementalModify: function () {
    var _incrementalModify = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(mutationFunction) {
      var _this4 = this;
      var state;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return getLocalDocStateByParent(this.parent);
          case 2:
            state = _context2.sent;
            return _context2.abrupt("return", state.incrementalWriteQueue.addWrite(this._data, /*#__PURE__*/function () {
              var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(docData) {
                return _regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) switch (_context.prev = _context.next) {
                    case 0:
                      _context.next = 2;
                      return mutationFunction(docData.data, _this4);
                    case 2:
                      docData.data = _context.sent;
                      return _context.abrupt("return", docData);
                    case 4:
                    case "end":
                      return _context.stop();
                  }
                }, _callee);
              }));
              return function (_x2) {
                return _ref.apply(this, arguments);
              };
            }()).then(function (result) {
              return state.docCache.getCachedRxDocument(result);
            }));
          case 4:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function incrementalModify(_x) {
      return _incrementalModify.apply(this, arguments);
    }
    return incrementalModify;
  }(),
  incrementalPatch: function incrementalPatch(patch) {
    return this.incrementalModify(function (docData) {
      Object.entries(patch).forEach(function (_ref2) {
        var k = _ref2[0],
          v = _ref2[1];
        docData[k] = v;
      });
      return docData;
    });
  },
  _saveData: function () {
    var _saveData2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(newData) {
      var state, oldData;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return getLocalDocStateByParent(this.parent);
          case 2:
            state = _context3.sent;
            oldData = this._data;
            newData.id = this.id;
            return _context3.abrupt("return", state.storageInstance.bulkWrite([{
              previous: oldData,
              document: newData
            }], 'local-document-save-data').then(function (res) {
              var docResult = res.success[newData.id];
              if (!docResult) {
                throw getFromObjectOrThrow(res.error, newData.id);
              }
              newData = flatClone(newData);
              newData._rev = docResult._rev;
            }));
          case 6:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function _saveData(_x3) {
      return _saveData2.apply(this, arguments);
    }
    return _saveData;
  }(),
  remove: function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
      var state, writeData;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return getLocalDocStateByParent(this.parent);
          case 2:
            state = _context4.sent;
            writeData = {
              id: this._data.id,
              data: {},
              _deleted: true,
              _meta: getDefaultRxDocumentMeta(),
              _rev: getDefaultRevision(),
              _attachments: {}
            };
            return _context4.abrupt("return", writeSingle(state.storageInstance, {
              previous: this._data,
              document: writeData
            }, 'local-document-remove').then(function (writeResult) {
              return state.docCache.getCachedRxDocument(writeResult);
            }));
          case 5:
          case "end":
            return _context4.stop();
        }
      }, _callee4, this);
    }));
    function remove() {
      return _remove.apply(this, arguments);
    }
    return remove;
  }()
};
var INIT_DONE = false;
var _init = function _init() {
  if (INIT_DONE) return;else INIT_DONE = true;

  // add functions of RxDocument
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
export function createRxLocalDocument(data, parent) {
  _init();
  var newDoc = new RxLocalDocumentClass(data.id, data, parent);
  Object.setPrototypeOf(newDoc, RxLocalDocumentPrototype);
  newDoc.prototype = RxLocalDocumentPrototype;
  return newDoc;
}
//# sourceMappingURL=rx-local-document.js.map