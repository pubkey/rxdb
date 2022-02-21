import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import objectPath from 'object-path';
import { createRxDocumentConstructor, basePrototype } from '../rx-document';
import { createDocCache } from '../doc-cache';
import { newRxError, newRxTypeError } from '../rx-error';
import { flatClone, getDefaultRxDocumentMeta, getFromObjectOrThrow } from '../util';
import { isRxDatabase } from '../rx-database';
import { filter, map, distinctUntilChanged, startWith, mergeMap } from 'rxjs/operators';
import { findLocalDocument, writeSingleLocal } from '../rx-storage-helper';
import { overwritable } from '../overwritable';
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

function _getKeyObjectStorageInstanceByParent(parent) {
  if (isRxDatabase(parent)) {
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
      var data = flatClone(objPath);
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

    if (Object.is(this.get(objPath), value)) {
      return;
    }

    objectPath.set(this._data, objPath, value);
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
        throw getFromObjectOrThrow(res.error, newData._id);
      }

      newData = flatClone(newData);
      newData._rev = docResult._rev;
    });
  },
  remove: function remove() {
    var _this2 = this;

    var storageInstance = _getKeyObjectStorageInstanceByParent(this.parent);

    var writeData = {
      _id: this.id,
      _deleted: true,
      _meta: getDefaultRxDocumentMeta(),
      _attachments: {}
    };
    return writeSingleLocal(storageInstance, {
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
  var _this3 = this;

  return this.getLocal(id).then(function (existing) {
    if (existing) {
      throw newRxError('LD7', {
        id: id,
        data: data
      });
    } // create new one


    var docData = Object.assign({}, data, {
      _id: id,
      _deleted: false,
      _meta: getDefaultRxDocumentMeta(),
      _attachments: {}
    });
    return writeSingleLocal(_getKeyObjectStorageInstanceByParent(_this3), {
      document: docData
    }).then(function (res) {
      docData = flatClone(docData);
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

  return this.getLocal(id).then(function (existing) {
    if (!existing) {
      // create new one
      var docPromise = _this4.insertLocal(id, data);

      return docPromise;
    } else {
      // update existing
      var newData = Object.assign({
        _id: id,
        _rev: existing._data._rev,
        _deleted: false,
        _attachments: {},
        _meta: getDefaultRxDocumentMeta()
      }, data);
      return existing.atomicUpdate(function () {
        newData._rev = existing._data._rev;
        return newData;
      }).then(function () {
        return existing;
      });
    }
  });
}

function getLocal(id) {
  var _this5 = this;

  var storageInstance = _getKeyObjectStorageInstanceByParent(this);

  var docCache = _getDocCache(this); // check in doc-cache


  var found = docCache.get(id);

  if (found) {
    return Promise.resolve(found);
  } // if not found, check in storage instance


  return findLocalDocument(storageInstance, id, false).then(function (docData) {
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

  return this.$.pipe(startWith(null), mergeMap(function (cE) {
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
  }), mergeMap(function (changeEventOrDoc) {
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
  }), filter(function (filterFlagged) {
    return filterFlagged.use;
  }), map(function (filterFlagged) {
    return filterFlagged.doc;
  }));
}

export var RxDBLocalDocumentsPlugin = {
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
//# sourceMappingURL=local-documents.js.map