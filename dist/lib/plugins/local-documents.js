"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.overwritable = exports.prototypes = exports.rxdb = exports.RxLocalDocument = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

var _objectPath = _interopRequireDefault(require("object-path"));

var _rxDocument = _interopRequireDefault(require("../rx-document"));

var _rxDatabase = _interopRequireDefault(require("../rx-database"));

var _rxCollection = _interopRequireDefault(require("../rx-collection"));

var _rxChangeEvent = _interopRequireDefault(require("../rx-change-event"));

var _docCache = _interopRequireDefault(require("../doc-cache"));

var _rxError = _interopRequireDefault(require("../rx-error"));

var _util = require("../util");

var _operators = require("rxjs/operators");

/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */
var DOC_CACHE_BY_PARENT = new WeakMap();

var _getDocCache = function _getDocCache(parent) {
  if (!DOC_CACHE_BY_PARENT.has(parent)) {
    DOC_CACHE_BY_PARENT.set(parent, _docCache["default"].create());
  }

  return DOC_CACHE_BY_PARENT.get(parent);
};

var CHANGE_SUB_BY_PARENT = new WeakMap();

var _getChangeSub = function _getChangeSub(parent) {
  if (!CHANGE_SUB_BY_PARENT.has(parent)) {
    var sub = parent.$.pipe((0, _operators.filter)(function (cE) {
      return cE.data.isLocal;
    })).subscribe(function (cE) {
      var docCache = _getDocCache(parent);

      var doc = docCache.get(cE.data.doc);
      if (doc) doc._handleChangeEvent(cE);
    });

    parent._subs.push(sub);

    CHANGE_SUB_BY_PARENT.set(parent, sub);
  }

  return CHANGE_SUB_BY_PARENT.get(parent);
};

var LOCAL_PREFIX = '_local/';

var RxDocumentParent = _rxDocument["default"].createRxDocumentConstructor();

var RxLocalDocument =
/*#__PURE__*/
function (_RxDocumentParent) {
  (0, _inheritsLoose2["default"])(RxLocalDocument, _RxDocumentParent);

  /**
   * @constructor
   * @param  {string} id
   * @param  {Object} jsonData
   * @param  {RxCollection|RxDatabase} parent
   */
  function RxLocalDocument(id, jsonData, parent) {
    var _this;

    _this = _RxDocumentParent.call(this, null, jsonData) || this;
    _this.id = id;
    _this.parent = parent;
    return _this;
  }

  return RxLocalDocument;
}(RxDocumentParent);

exports.RxLocalDocument = RxLocalDocument;
var RxLocalDocumentPrototype = {
  toPouchJson: function toPouchJson() {
    var data = (0, _util.clone)(this._data);
    data._id = LOCAL_PREFIX + this.id;
  },

  get isLocal() {
    return true;
  },

  get parentPouch() {
    return _getPouchByParent(this.parent);
  },

  //
  // overwrites
  //
  _handleChangeEvent: function _handleChangeEvent(changeEvent) {
    if (changeEvent.data.doc !== this.primary) return;

    switch (changeEvent.data.op) {
      case 'UPDATE':
        var newData = (0, _util.clone)(changeEvent.data.v);

        this._dataSync$.next((0, _util.clone)(newData));

        break;

      case 'REMOVE':
        // remove from docCache to assure new upserted RxDocuments will be a new instance
        var docCache = _getDocCache(this.parent);

        docCache["delete"](this.primary);

        this._deleted$.next(true);

        break;
    }
  },

  get allAttachments$() {
    // this is overwritten here because we cannot re-set getters on the prototype
    throw _rxError["default"].newRxError('LD1', {
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
    if (!this._data) return undefined;

    if (typeof objPath !== 'string') {
      throw _rxError["default"].newRxTypeError('LD2', {
        objPath: objPath
      });
    }

    var valueObj = _objectPath["default"].get(this._data, objPath);

    valueObj = (0, _util.clone)(valueObj);
    return valueObj;
  },
  get$: function get$(path) {
    if (path.includes('.item.')) {
      throw _rxError["default"].newRxError('LD3', {
        path: path
      });
    }

    if (path === this.primaryPath) throw _rxError["default"].newRxError('LD4');
    return this._dataSync$.pipe((0, _operators.map)(function (data) {
      return _objectPath["default"].get(data, path);
    }), (0, _operators.distinctUntilChanged)()).asObservable();
  },
  set: function set(objPath, value) {
    if (!value) {
      // object path not set, overwrite whole data
      var data = (0, _util.clone)(objPath);
      data._rev = this._data._rev;
      this._data = data;
      return this;
    }

    if (objPath === '_id') {
      throw _rxError["default"].newRxError('LD5', {
        objPath: objPath,
        value: value
      });
    }

    if (Object.is(this.get(objPath), value)) return;

    _objectPath["default"].set(this._data, objPath, value);

    return this;
  },
  _saveData: function () {
    var _saveData2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee(newData) {
      var res, changeEvent;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              newData = (0, _util.clone)(newData);
              newData._id = LOCAL_PREFIX + this.id;
              _context.next = 4;
              return this.parentPouch.put(newData);

            case 4:
              res = _context.sent;
              newData._rev = res.rev;

              this._dataSync$.next(newData);

              changeEvent = _rxChangeEvent["default"].create('UPDATE', _rxDatabase["default"].isInstanceOf(this.parent) ? this.parent : this.parent.database, _rxCollection["default"].isInstanceOf(this.parent) ? this.parent : null, this, (0, _util.clone)(this._data), true);
              this.$emit(changeEvent);

            case 9:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function _saveData(_x) {
      return _saveData2.apply(this, arguments);
    };
  }(),

  /**
   * @return {Promise}
   */
  remove: function remove() {
    var _this2 = this;

    var removeId = LOCAL_PREFIX + this.id;
    return this.parentPouch.remove(removeId, this._data._rev).then(function () {
      _getDocCache(_this2.parent)["delete"](_this2.id);

      var changeEvent = _rxChangeEvent["default"].create('REMOVE', _rxDatabase["default"].isInstanceOf(_this2.parent) ? _this2.parent : _this2.parent.database, _rxCollection["default"].isInstanceOf(_this2.parent) ? _this2.parent : null, _this2, (0, _util.clone)(_this2._data), true);

      _this2.$emit(changeEvent);
    });
  }
};
var INIT_DONE = false;

var _init = function _init() {
  if (INIT_DONE) return;else INIT_DONE = true; // add functions of RxDocument

  var docBaseProto = _rxDocument["default"].basePrototype;
  var props = Object.getOwnPropertyNames(docBaseProto);
  props.forEach(function (key) {
    var exists = Object.getOwnPropertyDescriptor(RxLocalDocumentPrototype, key);
    if (exists) return;
    var desc = Object.getOwnPropertyDescriptor(docBaseProto, key);
    Object.defineProperty(RxLocalDocumentPrototype, key, desc);
  });
  /**
   * overwrite things that not work on local documents
   * with throwing function
   */

  var getThrowingFun = function getThrowingFun(k) {
    return function () {
      throw _rxError["default"].newRxError('LD6', {
        functionName: k
      });
    };
  };

  ['populate', 'update', 'putAttachment', 'getAttachment', 'allAttachments'].forEach(function (k) {
    return RxLocalDocumentPrototype[k] = getThrowingFun(k);
  });
};

RxLocalDocument.create = function (id, data, parent) {
  _init();

  _getChangeSub(parent);

  var newDoc = new RxLocalDocument(id, data, parent);
  newDoc.__proto__ = RxLocalDocumentPrototype;

  _getDocCache(parent).set(id, newDoc);

  return newDoc;
};

var _getPouchByParent = function _getPouchByParent(parent) {
  if (_rxDatabase["default"].isInstanceOf(parent)) return parent._adminPouch; // database
  else return parent.pouch; // collection
};
/**
 * save the local-document-data
 * throws if already exists
 * @return {Promise<RxLocalDocument>}
 */


var insertLocal = function insertLocal(id, data) {
  var _this3 = this;

  if (_rxCollection["default"].isInstanceOf(this) && this._isInMemory) return this._parentCollection.insertLocal(id, data);
  data = (0, _util.clone)(data);
  return this.getLocal(id).then(function (existing) {
    if (existing) {
      throw _rxError["default"].newRxError('LD7', {
        id: id,
        data: data
      });
    } // create new one


    var pouch = _getPouchByParent(_this3);

    var saveData = (0, _util.clone)(data);
    saveData._id = LOCAL_PREFIX + id;
    return pouch.put(saveData);
  }).then(function (res) {
    data._rev = res.rev;
    var newDoc = RxLocalDocument.create(id, data, _this3);
    return newDoc;
  });
};
/**
 * save the local-document-data
 * overwrites existing if exists
 * @return {RxLocalDocument}
 */


var upsertLocal =
/*#__PURE__*/
function () {
  var _ref = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee2(id, data) {
    var existing, doc;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!(_rxCollection["default"].isInstanceOf(this) && this._isInMemory)) {
              _context2.next = 2;
              break;
            }

            return _context2.abrupt("return", this._parentCollection.upsertLocal(id, data));

          case 2:
            _context2.next = 4;
            return this.getLocal(id);

          case 4:
            existing = _context2.sent;

            if (existing) {
              _context2.next = 10;
              break;
            }

            // create new one
            doc = this.insertLocal(id, data);
            return _context2.abrupt("return", doc);

          case 10:
            // update existing
            data._rev = existing._data._rev;
            _context2.next = 13;
            return existing.atomicUpdate(function () {
              return data;
            });

          case 13:
            return _context2.abrupt("return", existing);

          case 14:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function upsertLocal(_x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();

var getLocal =
/*#__PURE__*/
function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee3(id) {
    var pouch, docCache, found, docData, doc;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!(_rxCollection["default"].isInstanceOf(this) && this._isInMemory)) {
              _context3.next = 2;
              break;
            }

            return _context3.abrupt("return", this._parentCollection.getLocal(id));

          case 2:
            pouch = _getPouchByParent(this);
            docCache = _getDocCache(this); // check in doc-cache

            found = docCache.get(id); // check in pouch

            if (found) {
              _context3.next = 19;
              break;
            }

            _context3.prev = 6;
            _context3.next = 9;
            return pouch.get(LOCAL_PREFIX + id);

          case 9:
            docData = _context3.sent;

            if (docData) {
              _context3.next = 12;
              break;
            }

            return _context3.abrupt("return", null);

          case 12:
            doc = RxLocalDocument.create(id, docData, this);
            return _context3.abrupt("return", doc);

          case 16:
            _context3.prev = 16;
            _context3.t0 = _context3["catch"](6);
            return _context3.abrupt("return", null);

          case 19:
            return _context3.abrupt("return", found);

          case 20:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, this, [[6, 16]]);
  }));

  return function getLocal(_x4) {
    return _ref2.apply(this, arguments);
  };
}();

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.insertLocal = insertLocal;
    proto.upsertLocal = upsertLocal;
    proto.getLocal = getLocal;
  },
  RxDatabase: function RxDatabase(proto) {
    proto.insertLocal = insertLocal;
    proto.upsertLocal = upsertLocal;
    proto.getLocal = getLocal;
  }
};
exports.prototypes = prototypes;
var overwritable = {};
exports.overwritable = overwritable;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
exports["default"] = _default;
