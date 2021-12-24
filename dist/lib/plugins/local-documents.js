"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxLocalDocument = exports.RxDBLocalDocumentsPlugin = void 0;

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

var _objectPath = _interopRequireDefault(require("object-path"));

var _rxDocument = require("../rx-document");

var _docCache = require("../doc-cache");

var _rxError = require("../rx-error");

var _util = require("../util");

var _rxDatabase = require("../rx-database");

var _rxCollection = require("../rx-collection");

var _operators = require("rxjs/operators");

var _rxStorageHelper = require("../rx-storage-helper");

var _overwritable = require("../overwritable");

var DOC_CACHE_BY_PARENT = new WeakMap();

var _getDocCache = function _getDocCache(parent) {
  if (!DOC_CACHE_BY_PARENT.has(parent)) {
    DOC_CACHE_BY_PARENT.set(parent, (0, _docCache.createDocCache)());
  }

  return DOC_CACHE_BY_PARENT.get(parent);
};

var CHANGE_SUB_BY_PARENT = new WeakMap();

var _getChangeSub = function _getChangeSub(parent) {
  if (!CHANGE_SUB_BY_PARENT.has(parent)) {
    var sub = parent.$.pipe((0, _operators.filter)(function (cE) {
      return cE.isLocal;
    })).subscribe(function (cE) {
      var docCache = _getDocCache(parent);

      var doc = docCache.get(cE.documentId);

      if (doc) {
        doc._handleChangeEvent(cE);
      }
    });

    parent._subs.push(sub);

    CHANGE_SUB_BY_PARENT.set(parent, sub);
  }

  return CHANGE_SUB_BY_PARENT.get(parent);
};

var RxDocumentParent = (0, _rxDocument.createRxDocumentConstructor)();

var RxLocalDocument = /*#__PURE__*/function (_RxDocumentParent) {
  (0, _inheritsLoose2["default"])(RxLocalDocument, _RxDocumentParent);

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

function _getKeyObjectStorageInstanceByParent(parent) {
  if ((0, _rxDatabase.isRxDatabase)(parent)) {
    return parent.localDocumentsStore; // database
  } else {
    return parent.localDocumentsStore; // collection
  }
}

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
        var docCache = _getDocCache(this.parent);

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
  get$: function get$(path) {
    if (path.includes('.item.')) {
      throw (0, _rxError.newRxError)('LD3', {
        path: path
      });
    }

    if (path === this.primaryPath) throw (0, _rxError.newRxError)('LD4');
    return this._dataSync$.pipe((0, _operators.map)(function (data) {
      return _objectPath["default"].get(data, path);
    }), (0, _operators.distinctUntilChanged)());
  },
  set: function set(objPath, value) {
    if (!value) {
      // object path not set, overwrite whole data
      var data = (0, _util.flatClone)(objPath);
      data._rev = this._data._rev;
      this._data = data;
      return this;
    }

    if (objPath === '_id') {
      throw (0, _rxError.newRxError)('LD5', {
        objPath: objPath,
        value: value
      });
    }

    if (Object.is(this.get(objPath), value)) {
      return;
    }

    _objectPath["default"].set(this._data, objPath, value);

    return this;
  },
  _saveData: function _saveData(newData) {
    var oldData = this._dataSync$.getValue();

    var storageInstance = _getKeyObjectStorageInstanceByParent(this.parent);

    newData._id = this.id;
    return storageInstance.bulkWrite([{
      previous: oldData,
      document: newData
    }]).then(function (res) {
      var docResult = res.success[newData._id];

      if (!docResult) {
        throw (0, _util.getFromObjectOrThrow)(res.error, newData._id);
      }

      newData._rev = docResult._rev;
    });
  },
  remove: function remove() {
    var _this2 = this;

    var storageInstance = _getKeyObjectStorageInstanceByParent(this.parent);

    var writeData = {
      _id: this.id,
      _deleted: true,
      _attachments: {}
    };
    return (0, _rxStorageHelper.writeSingleLocal)(storageInstance, {
      previous: this._data,
      document: writeData
    }).then(function () {
      _getDocCache(_this2.parent)["delete"](_this2.id);
    });
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
   * overwrite things that not work on local documents
   * with throwing function
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


function insertLocal(id, docData) {
  var _this3 = this;

  if ((0, _rxCollection.isRxCollection)(this) && this._isInMemory) {
    return this.parentCollection.insertLocal(id, docData);
  }

  return this.getLocal(id).then(function (existing) {
    if (existing) {
      throw (0, _rxError.newRxError)('LD7', {
        id: id,
        data: docData
      });
    } // create new one


    docData = (0, _util.flatClone)(docData);
    docData._id = id;
    return (0, _rxStorageHelper.writeSingleLocal)(_getKeyObjectStorageInstanceByParent(_this3), {
      document: docData
    }).then(function (res) {
      docData._rev = res._rev;
      var newDoc = RxLocalDocument.create(id, docData, _this3);
      return newDoc;
    });
  });
}
/**
 * save the local-document-data
 * overwrites existing if exists
 */


function upsertLocal(id, data) {
  var _this4 = this;

  if ((0, _rxCollection.isRxCollection)(this) && this._isInMemory) {
    return this._parentCollection.upsertLocal(id, data);
  }

  return this.getLocal(id).then(function (existing) {
    if (!existing) {
      // create new one
      var docPromise = _this4.insertLocal(id, data);

      return docPromise;
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
  var _this5 = this;

  if ((0, _rxCollection.isRxCollection)(this) && this._isInMemory) {
    return this.parentCollection.getLocal(id);
  }

  var storageInstance = _getKeyObjectStorageInstanceByParent(this);

  var docCache = _getDocCache(this); // check in doc-cache


  var found = docCache.get(id);

  if (found) {
    return Promise.resolve(found);
  } // if not found, check in storage instance


  return (0, _rxStorageHelper.findLocalDocument)(storageInstance, id).then(function (docData) {
    if (!docData) {
      return null;
    }

    var doc = RxLocalDocument.create(id, docData, _this5);
    return doc;
  })["catch"](function () {
    return null;
  });
}

function getLocal$(id) {
  var _this6 = this;

  return this.$.pipe((0, _operators.startWith)(null), (0, _operators.mergeMap)(function (cE) {
    try {
      if (cE) {
        return Promise.resolve({
          changeEvent: cE
        });
      } else {
        return Promise.resolve(_this6.getLocal(id)).then(function (doc) {
          return {
            doc: doc
          };
        });
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }), (0, _operators.mergeMap)(function (changeEventOrDoc) {
    try {
      if (changeEventOrDoc.changeEvent) {
        var cE = changeEventOrDoc.changeEvent;

        if (!cE.isLocal || cE.documentId !== id) {
          return Promise.resolve({
            use: false
          });
        } else {
          return Promise.resolve(_this6.getLocal(id)).then(function (doc) {
            return {
              use: true,
              doc: doc
            };
          });
        }
      } else {
        return Promise.resolve({
          use: true,
          doc: changeEventOrDoc.doc
        });
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }), (0, _operators.filter)(function (filterFlagged) {
    return filterFlagged.use;
  }), (0, _operators.map)(function (filterFlagged) {
    return filterFlagged.doc;
  }));
}

var RxDBLocalDocumentsPlugin = {
  name: 'local-documents',
  rxdb: true,
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.insertLocal = insertLocal;
      proto.upsertLocal = upsertLocal;
      proto.getLocal = getLocal;
      proto.getLocal$ = getLocal$;
    },
    RxDatabase: function RxDatabase(proto) {
      proto.insertLocal = insertLocal;
      proto.upsertLocal = upsertLocal;
      proto.getLocal = getLocal;
      proto.getLocal$ = getLocal$;
    }
  },
  overwritable: {}
};
exports.RxDBLocalDocumentsPlugin = RxDBLocalDocumentsPlugin;
//# sourceMappingURL=local-documents.js.map