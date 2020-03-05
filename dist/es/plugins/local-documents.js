import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";

/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */
import objectPath from 'object-path';
import { createRxDocumentConstructor, basePrototype } from '../rx-document';
import { createChangeEvent } from '../rx-change-event';
import { createDocCache } from '../doc-cache';
import { newRxError, newRxTypeError } from '../rx-error';
import { clone } from '../util';
import { isInstanceOf as isRxDatabase } from '../rx-database';
import { isInstanceOf as isRxCollection } from '../rx-collection';
import { filter, map, distinctUntilChanged } from 'rxjs/operators';
var DOC_CACHE_BY_PARENT = new WeakMap();

var _getDocCache = function _getDocCache(parent) {
  if (!DOC_CACHE_BY_PARENT.has(parent)) {
    DOC_CACHE_BY_PARENT.set(parent, createDocCache());
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
var RxDocumentParent = createRxDocumentConstructor();
export var RxLocalDocument = /*#__PURE__*/function (_RxDocumentParent) {
  _inheritsLoose(RxLocalDocument, _RxDocumentParent);

  function RxLocalDocument(id, jsonData, parent) {
    var _this;

    _this = _RxDocumentParent.call(this, null, jsonData) || this;
    _this.id = id;
    _this.parent = parent;
    return _this;
  }

  return RxLocalDocument;
}(RxDocumentParent);

var _getPouchByParent = function _getPouchByParent(parent) {
  if (isRxDatabase(parent)) return parent._adminPouch; // database
  else return parent.pouch; // collection
};

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
    if (!this._data) return undefined;

    if (typeof objPath !== 'string') {
      throw newRxTypeError('LD2', {
        objPath: objPath
      });
    }

    var valueObj = objectPath.get(this._data, objPath);
    valueObj = clone(valueObj);
    return valueObj;
  },
  get$: function get$(path) {
    if (path.includes('.item.')) {
      throw newRxError('LD3', {
        path: path
      });
    }

    if (path === this.primaryPath) throw newRxError('LD4');
    return this._dataSync$.pipe(map(function (data) {
      return objectPath.get(data, path);
    }), distinctUntilChanged());
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
      throw newRxError('LD5', {
        objPath: objPath,
        value: value
      });
    }

    if (Object.is(this.get(objPath), value)) return;
    objectPath.set(this._data, objPath, value);
    return this;
  },
  _saveData: function _saveData(newData) {
    var _this2 = this;

    newData = clone(newData);
    newData._id = LOCAL_PREFIX + this.id;
    return this.parentPouch.put(newData).then(function (res) {
      newData._rev = res.rev;

      _this2._dataSync$.next(newData);

      var changeEvent = createChangeEvent('UPDATE', isRxDatabase(_this2.parent) ? _this2.parent : _this2.parent.database, isRxCollection(_this2.parent) ? _this2.parent : null, _this2, clone(_this2._data), true);

      _this2.$emit(changeEvent);
    });
  },
  remove: function remove() {
    var _this3 = this;

    var removeId = LOCAL_PREFIX + this.id;
    return this.parentPouch.remove(removeId, this._data._rev).then(function () {
      _getDocCache(_this3.parent)["delete"](_this3.id);

      var changeEvent = createChangeEvent('REMOVE', isRxDatabase(_this3.parent) ? _this3.parent : _this3.parent.database, isRxCollection(_this3.parent) ? _this3.parent : null, _this3, clone(_this3._data), true);

      _this3.$emit(changeEvent);
    });
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
   * overwrite things that not work on local documents
   * with throwing function
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

RxLocalDocument.create = function (id, data, parent) {
  _init();

  _getChangeSub(parent);

  var newDoc = new RxLocalDocument(id, data, parent);
  newDoc.__proto__ = RxLocalDocumentPrototype;

  _getDocCache(parent).set(id, newDoc);

  return newDoc;
};
/**
 * save the local-document-data
 * throws if already exists
 */


function insertLocal(id, data) {
  var _this4 = this;

  if (isRxCollection(this) && this._isInMemory) return this._parentCollection.insertLocal(id, data);
  data = clone(data);
  return this.getLocal(id).then(function (existing) {
    if (existing) {
      throw newRxError('LD7', {
        id: id,
        data: data
      });
    } // create new one


    var pouch = _getPouchByParent(_this4);

    var saveData = clone(data);
    saveData._id = LOCAL_PREFIX + id;
    return pouch.put(saveData);
  }).then(function (res) {
    data._rev = res.rev;
    var newDoc = RxLocalDocument.create(id, data, _this4);
    return newDoc;
  });
}
/**
 * save the local-document-data
 * overwrites existing if exists
 */


function upsertLocal(id, data) {
  var _this5 = this;

  if (isRxCollection(this) && this._isInMemory) return this._parentCollection.upsertLocal(id, data);
  return this.getLocal(id).then(function (existing) {
    if (!existing) {
      // create new one
      var doc = _this5.insertLocal(id, data);

      return doc;
    } else {
      // update existing
      data._rev = existing._data._rev;
      return existing.atomicUpdate(function () {
        return data;
      }).then(function () {
        return existing;
      });
    }
  });
}

function getLocal(id) {
  var _this6 = this;

  if (isRxCollection(this) && this._isInMemory) return this._parentCollection.getLocal(id);

  var pouch = _getPouchByParent(this);

  var docCache = _getDocCache(this); // check in doc-cache


  var found = docCache.get(id);
  if (found) return Promise.resolve(found); // if not found, check in pouch

  return pouch.get(LOCAL_PREFIX + id).then(function (docData) {
    if (!docData) return null;
    var doc = RxLocalDocument.create(id, docData, _this6);
    return doc;
  })["catch"](function () {
    return null;
  });
}

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
//# sourceMappingURL=local-documents.js.map