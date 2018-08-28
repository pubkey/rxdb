import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";

/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */
import objectPath from 'object-path';
import RxDocument from '../rx-document';
import RxDatabase from '../rx-database';
import RxCollection from '../rx-collection';
import RxChangeEvent from '../rx-change-event';
import DocCache from '../doc-cache';
import RxError from '../rx-error';
import { clone } from '../util';
import { filter, map, distinctUntilChanged } from 'rxjs/operators';
var DOC_CACHE_BY_PARENT = new WeakMap();

var _getDocCache = function _getDocCache(parent) {
  if (!DOC_CACHE_BY_PARENT.has(parent)) {
    DOC_CACHE_BY_PARENT.set(parent, DocCache.create());
  }

  return DOC_CACHE_BY_PARENT.get(parent);
};

var CHANGE_SUB_BY_PARENT = new WeakMap();

var _getChangeSub = function _getChangeSub(parent) {
  if (!CHANGE_SUB_BY_PARENT.has(parent)) {
    var sub = parent.$.pipe(filter(function (cE) {
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
var RxDocumentParent = RxDocument.createRxDocumentConstructor();
export var RxLocalDocument =
/*#__PURE__*/
function (_RxDocumentParent) {
  _inheritsLoose(RxLocalDocument, _RxDocumentParent);

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
var RxLocalDocumentPrototype = {
  toPouchJson: function toPouchJson() {
    var data = clone(this._data);
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
        var newData = clone(changeEvent.data.v);

        this._dataSync$.next(clone(newData));

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
    throw RxError.newRxError('LD1', {
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
      throw RxError.newRxTypeError('LD2', {
        objPath: objPath
      });
    }

    var valueObj = objectPath.get(this._data, objPath);
    valueObj = clone(valueObj);
    return valueObj;
  },
  get$: function get$(path) {
    if (path.includes('.item.')) {
      throw RxError.newRxError('LD3', {
        path: path
      });
    }

    if (path === this.primaryPath) throw RxError.newRxError('LD4');
    return this._dataSync$.pipe(map(function (data) {
      return objectPath.get(data, path);
    }), distinctUntilChanged()).asObservable();
  },
  set: function set(objPath, value) {
    if (!value) {
      // object path not set, overwrite whole data
      var data = clone(objPath);
      data._rev = this._data._rev;
      this._data = data;
      return this;
    }

    if (objPath === '_id') {
      throw RxError.newRxError('LD5', {
        objPath: objPath,
        value: value
      });
    }

    if (Object.is(this.get(objPath), value)) return;
    objectPath.set(this._data, objPath, value);
    return this;
  },
  _saveData: function () {
    var _saveData2 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee(newData) {
      var res, changeEvent;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              newData = clone(newData);
              newData._id = LOCAL_PREFIX + this.id;
              _context.next = 4;
              return this.parentPouch.put(newData);

            case 4:
              res = _context.sent;
              newData._rev = res.rev;

              this._dataSync$.next(newData);

              changeEvent = RxChangeEvent.create('UPDATE', RxDatabase.isInstanceOf(this.parent) ? this.parent : this.parent.database, RxCollection.isInstanceOf(this.parent) ? this.parent : null, this, clone(this._data), true);
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

      var changeEvent = RxChangeEvent.create('REMOVE', RxDatabase.isInstanceOf(_this2.parent) ? _this2.parent : _this2.parent.database, RxCollection.isInstanceOf(_this2.parent) ? _this2.parent : null, _this2, clone(_this2._data), true);

      _this2.$emit(changeEvent);
    });
  }
};
var INIT_DONE = false;

var _init = function _init() {
  if (INIT_DONE) return;else INIT_DONE = true; // add functions of RxDocument

  var docBaseProto = RxDocument.basePrototype;
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
      throw RxError.newRxError('LD6', {
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
  if (RxDatabase.isInstanceOf(parent)) return parent._adminPouch; // database
  else return parent.pouch; // collection
};
/**
 * save the local-document-data
 * throws if already exists
 * @return {Promise<RxLocalDocument>}
 */


var insertLocal = function insertLocal(id, data) {
  var _this3 = this;

  if (RxCollection.isInstanceOf(this) && this._isInMemory) return this._parentCollection.insertLocal(id, data);
  data = clone(data);
  return this.getLocal(id).then(function (existing) {
    if (existing) {
      throw RxError.newRxError('LD7', {
        id: id,
        data: data
      });
    } // create new one


    var pouch = _getPouchByParent(_this3);

    var saveData = clone(data);
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
  var _ref = _asyncToGenerator(
  /*#__PURE__*/
  _regeneratorRuntime.mark(function _callee2(id, data) {
    var existing, doc;
    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!(RxCollection.isInstanceOf(this) && this._isInMemory)) {
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
  var _ref2 = _asyncToGenerator(
  /*#__PURE__*/
  _regeneratorRuntime.mark(function _callee3(id) {
    var pouch, docCache, found, docData, doc;
    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!(RxCollection.isInstanceOf(this) && this._isInMemory)) {
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

export var rxdb = true;
export var prototypes = {
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
export var overwritable = {};
export default {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};