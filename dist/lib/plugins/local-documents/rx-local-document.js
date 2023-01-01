"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxLocalDocument = createRxLocalDocument;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _objectPath = _interopRequireDefault(require("object-path"));
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
  (0, _inheritsLoose2["default"])(RxLocalDocumentClass, _RxDocumentParent);
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
    var _this3 = this;
    var _this = this;
    return _this.parent.$.pipe((0, _operators.filter)(function (changeEvent) {
      return changeEvent.isLocal;
    }), (0, _operators.filter)(function (changeEvent) {
      return changeEvent.documentId === _this3.primary;
    }), (0, _operators.map)(function (changeEvent) {
      return (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent);
    }), (0, _operators.startWith)(this._data), (0, _operators.distinctUntilChanged)(function (prev, curr) {
      return prev._rev === curr._rev;
    }), (0, _operators.shareReplay)(_utils.RXJS_SHARE_REPLAY_DEFAULTS));
  },
  getLatest: function getLatest() {
    var state = (0, _utils.getFromMapOrThrow)(_localDocumentsHelper.LOCAL_DOC_STATE_BY_PARENT_RESOLVED, this.parent);
    var latestDocData = state.docCache.getLatestDocumentData(this.primary);
    return state.docCache.getCachedRxDocument(latestDocData);
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
    if (_overwritable.overwritable.isDevMode()) {
      if (objPath.includes('.item.')) {
        throw (0, _rxError.newRxError)('LD3', {
          objPath: objPath
        });
      }
      if (objPath === this.primaryPath) {
        throw (0, _rxError.newRxError)('LD4');
      }
    }
    return this.$.pipe((0, _operators.map)(function (data) {
      return _objectPath["default"].get(data, objPath);
    }), (0, _operators.distinctUntilChanged)());
  },
  incrementalModify: function () {
    var _incrementalModify = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(mutationFunction) {
      var _this4 = this;
      var state;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return (0, _localDocumentsHelper.getLocalDocStateByParent)(this.parent);
          case 2:
            state = _context2.sent;
            return _context2.abrupt("return", state.incrementalWriteQueue.addWrite(this._data, /*#__PURE__*/function () {
              var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(docData) {
                return _regenerator["default"].wrap(function _callee$(_context) {
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
    var _saveData2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(newData) {
      var state, oldData;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return (0, _localDocumentsHelper.getLocalDocStateByParent)(this.parent);
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
                throw (0, _utils.getFromObjectOrThrow)(res.error, newData.id);
              }
              newData = (0, _utils.flatClone)(newData);
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
    var _remove = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4() {
      var state, writeData;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return (0, _localDocumentsHelper.getLocalDocStateByParent)(this.parent);
          case 2:
            state = _context4.sent;
            writeData = {
              id: this._data.id,
              data: {},
              _deleted: true,
              _meta: (0, _utils.getDefaultRxDocumentMeta)(),
              _rev: (0, _utils.getDefaultRevision)(),
              _attachments: {}
            };
            return _context4.abrupt("return", (0, _rxStorageHelper.writeSingle)(state.storageInstance, {
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
function createRxLocalDocument(data, parent) {
  _init();
  var newDoc = new RxLocalDocumentClass(data.id, data, parent);
  Object.setPrototypeOf(newDoc, RxLocalDocumentPrototype);
  newDoc.prototype = RxLocalDocumentPrototype;
  return newDoc;
}
//# sourceMappingURL=rx-local-document.js.map