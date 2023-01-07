"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.basePrototype = void 0;
exports.beforeDocumentUpdateWrite = beforeDocumentUpdateWrite;
exports.createRxDocumentConstructor = createRxDocumentConstructor;
exports.createWithConstructor = createWithConstructor;
exports.defineGetterSetter = defineGetterSetter;
exports.isRxDocument = isRxDocument;
var _operators = require("rxjs/operators");
var _utils = require("./plugins/utils");
var _rxError = require("./rx-error");
var _hooks = require("./hooks");
var _rxChangeEvent = require("./rx-change-event");
var _overwritable = require("./overwritable");
var _rxSchemaHelper = require("./rx-schema-helper");
var _rxStorageHelper = require("./rx-storage-helper");
var _incrementalWrite = require("./incremental-write");
var basePrototype = {
  get primaryPath() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this.collection.schema.primaryPath;
  },
  get primary() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this._data[_this.primaryPath];
  },
  get revision() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this._data._rev;
  },
  get deleted$() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this.$.pipe((0, _operators.map)(d => d._deleted));
  },
  get deleted() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this._data._deleted;
  },
  getLatest() {
    var latestDocData = this.collection._docCache.getLatestDocumentData(this.primary);
    return this.collection._docCache.getCachedRxDocument(latestDocData);
  },
  /**
   * returns the observable which emits the plain-data of this document
   */
  get $() {
    var _this = this;
    return _this.collection.$.pipe((0, _operators.filter)(changeEvent => !changeEvent.isLocal), (0, _operators.filter)(changeEvent => changeEvent.documentId === this.primary), (0, _operators.map)(changeEvent => (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent)), (0, _operators.startWith)(_this.collection._docCache.getLatestDocumentData(this.primary)), (0, _operators.distinctUntilChanged)((prev, curr) => prev._rev === curr._rev), (0, _operators.shareReplay)(_utils.RXJS_SHARE_REPLAY_DEFAULTS));
  },
  /**
   * returns observable of the value of the given path
   */
  get$(path) {
    if (_overwritable.overwritable.isDevMode()) {
      if (path.includes('.item.')) {
        throw (0, _rxError.newRxError)('DOC1', {
          path
        });
      }
      if (path === this.primaryPath) {
        throw (0, _rxError.newRxError)('DOC2');
      }

      // final fields cannot be modified and so also not observed
      if (this.collection.schema.finalFields.includes(path)) {
        throw (0, _rxError.newRxError)('DOC3', {
          path
        });
      }
      var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(this.collection.schema.jsonSchema, path);
      if (!schemaObj) {
        throw (0, _rxError.newRxError)('DOC4', {
          path
        });
      }
    }
    return this.$.pipe((0, _operators.map)(data => (0, _utils.getProperty)(data, path)), (0, _operators.distinctUntilChanged)());
  },
  /**
   * populate the given path
   */
  populate(path) {
    var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(this.collection.schema.jsonSchema, path);
    var value = this.get(path);
    if (!value) {
      return _utils.PROMISE_RESOLVE_NULL;
    }
    if (!schemaObj) {
      throw (0, _rxError.newRxError)('DOC5', {
        path
      });
    }
    if (!schemaObj.ref) {
      throw (0, _rxError.newRxError)('DOC6', {
        path,
        schemaObj
      });
    }
    var refCollection = this.collection.database.collections[schemaObj.ref];
    if (!refCollection) {
      throw (0, _rxError.newRxError)('DOC7', {
        ref: schemaObj.ref,
        path,
        schemaObj
      });
    }
    if (schemaObj.type === 'array') {
      return refCollection.findByIds(value).exec().then(res => {
        var valuesIterator = res.values();
        return Array.from(valuesIterator);
      });
    } else {
      return refCollection.findOne(value).exec();
    }
  },
  /**
   * get data by objectPath
   */
  get(objPath) {
    if (!this._data) return undefined;
    var valueObj = (0, _utils.getProperty)(this._data, objPath);

    // direct return if array or non-object
    if (typeof valueObj !== 'object' || Array.isArray(valueObj)) {
      return _overwritable.overwritable.deepFreezeWhenDevMode(valueObj);
    }

    /**
     * TODO find a way to deep-freeze together with defineGetterSetter
     * so we do not have to do a deep clone here.
     */
    valueObj = (0, _utils.clone)(valueObj);
    defineGetterSetter(this.collection.schema, valueObj, objPath, this);
    return valueObj;
  },
  toJSON(withMetaFields = false) {
    if (!withMetaFields) {
      var data = (0, _utils.flatClone)(this._data);
      delete data._rev;
      delete data._attachments;
      delete data._deleted;
      delete data._meta;
      return _overwritable.overwritable.deepFreezeWhenDevMode(data);
    } else {
      return _overwritable.overwritable.deepFreezeWhenDevMode(this._data);
    }
  },
  toMutableJSON(withMetaFields = false) {
    return (0, _utils.clone)(this.toJSON(withMetaFields));
  },
  /**
   * updates document
   * @overwritten by plugin (optional)
   * @param updateObj mongodb-like syntax
   */
  update(_updateObj) {
    throw (0, _utils.pluginMissing)('update');
  },
  incrementalUpdate(_updateObj) {
    throw (0, _utils.pluginMissing)('update');
  },
  updateCRDT(_updateObj) {
    throw (0, _utils.pluginMissing)('crdt');
  },
  putAttachment() {
    throw (0, _utils.pluginMissing)('attachments');
  },
  getAttachment() {
    throw (0, _utils.pluginMissing)('attachments');
  },
  allAttachments() {
    throw (0, _utils.pluginMissing)('attachments');
  },
  get allAttachments$() {
    throw (0, _utils.pluginMissing)('attachments');
  },
  async modify(mutationFunction,
  // used by some plugins that wrap the method
  _context) {
    var oldData = this._data;
    var newData = await (0, _incrementalWrite.modifierFromPublicToInternal)(mutationFunction)(oldData);
    return this._saveData(newData, oldData);
  },
  /**
   * runs an incremental update over the document
   * @param function that takes the document-data and returns a new data-object
   */
  incrementalModify(mutationFunction,
  // used by some plugins that wrap the method
  _context) {
    return this.collection.incrementalWriteQueue.addWrite(this._data, (0, _incrementalWrite.modifierFromPublicToInternal)(mutationFunction)).then(result => this.collection._docCache.getCachedRxDocument(result));
  },
  patch(patch) {
    var oldData = this._data;
    var newData = (0, _utils.clone)(oldData);
    Object.entries(patch).forEach(([k, v]) => {
      newData[k] = v;
    });
    return this._saveData(newData, oldData);
  },
  /**
   * patches the given properties
   */
  incrementalPatch(patch) {
    return this.incrementalModify(docData => {
      Object.entries(patch).forEach(([k, v]) => {
        docData[k] = v;
      });
      return docData;
    });
  },
  /**
   * saves the new document-data
   * and handles the events
   */
  async _saveData(newData, oldData) {
    newData = (0, _utils.flatClone)(newData);

    // deleted documents cannot be changed
    if (this._data._deleted) {
      throw (0, _rxError.newRxError)('DOC11', {
        id: this.primary,
        document: this
      });
    }
    await beforeDocumentUpdateWrite(this.collection, newData, oldData);
    var writeResult = await this.collection.storageInstance.bulkWrite([{
      previous: oldData,
      document: newData
    }], 'rx-document-save-data');
    var isError = writeResult.error[this.primary];
    (0, _rxStorageHelper.throwIfIsStorageWriteError)(this.collection, this.primary, newData, isError);
    await this.collection._runHooks('post', 'save', newData, this);
    return this.collection._docCache.getCachedRxDocument((0, _utils.getFromObjectOrThrow)(writeResult.success, this.primary));
  },
  /**
   * Remove the document.
   * Notice that there is no hard delete,
   * instead deleted documents get flagged with _deleted=true.
   */
  remove() {
    var collection = this.collection;
    if (this.deleted) {
      return Promise.reject((0, _rxError.newRxError)('DOC13', {
        document: this,
        id: this.primary
      }));
    }
    var deletedData = (0, _utils.flatClone)(this._data);
    var removedDocData;
    return collection._runHooks('pre', 'remove', deletedData, this).then(async () => {
      deletedData._deleted = true;
      var writeResult = await collection.storageInstance.bulkWrite([{
        previous: this._data,
        document: deletedData
      }], 'rx-document-remove');
      var isError = writeResult.error[this.primary];
      (0, _rxStorageHelper.throwIfIsStorageWriteError)(collection, this.primary, deletedData, isError);
      return (0, _utils.getFromObjectOrThrow)(writeResult.success, this.primary);
    }).then(removed => {
      removedDocData = removed;
      return this.collection._runHooks('post', 'remove', deletedData, this);
    }).then(() => {
      return this.collection._docCache.getCachedRxDocument(removedDocData);
    });
  },
  incrementalRemove() {
    return this.incrementalModify(async docData => {
      await this.collection._runHooks('pre', 'remove', docData, this);
      docData._deleted = true;
      return docData;
    }).then(async newDoc => {
      await this.collection._runHooks('post', 'remove', newDoc._data, newDoc);
      return newDoc;
    });
  },
  destroy() {
    throw (0, _rxError.newRxError)('DOC14');
  }
};
exports.basePrototype = basePrototype;
function createRxDocumentConstructor(proto = basePrototype) {
  var constructor = function RxDocumentConstructor(collection, docData) {
    this.collection = collection;

    // assume that this is always equal to the doc-data in the database
    this._data = docData;

    /**
     * because of the prototype-merge,
     * we can not use the native instanceof operator
     */
    this.isInstanceOfRxDocument = true;
  };
  constructor.prototype = proto;
  return constructor;
}
function defineGetterSetter(schema, valueObj, objPath = '', thisObj = false) {
  if (valueObj === null) return;
  var pathProperties = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema.jsonSchema, objPath);
  if (typeof pathProperties === 'undefined') return;
  if (pathProperties.properties) pathProperties = pathProperties.properties;
  Object.keys(pathProperties).forEach(key => {
    var fullPath = (0, _utils.trimDots)(objPath + '.' + key);

    // getter - value
    valueObj.__defineGetter__(key, function () {
      var _this = thisObj ? thisObj : this;
      if (!_this.get || typeof _this.get !== 'function') {
        /**
         * When an object gets added to the state of a vuejs-component,
         * it happens that this getter is called with another scope.
         * To prevent errors, we have to return undefined in this case
         */
        return undefined;
      }
      var ret = _this.get(fullPath);
      return ret;
    });
    // getter - observable$
    Object.defineProperty(valueObj, key + '$', {
      get: function () {
        var _this = thisObj ? thisObj : this;
        return _this.get$(fullPath);
      },
      enumerable: false,
      configurable: false
    });
    // getter - populate_
    Object.defineProperty(valueObj, key + '_', {
      get: function () {
        var _this = thisObj ? thisObj : this;
        return _this.populate(fullPath);
      },
      enumerable: false,
      configurable: false
    });
    // setter - value
    valueObj.__defineSetter__(key, function (val) {
      var _this = thisObj ? thisObj : this;
      return _this.set(fullPath, val);
    });
  });
}
function createWithConstructor(constructor, collection, jsonData) {
  var doc = new constructor(collection, jsonData);
  (0, _hooks.runPluginHooks)('createRxDocument', doc);
  return doc;
}
function isRxDocument(obj) {
  if (typeof obj === 'undefined') return false;
  return !!obj.isInstanceOfRxDocument;
}
function beforeDocumentUpdateWrite(collection, newData, oldData) {
  /**
   * Meta values must always be merged
   * instead of overwritten.
   * This ensures that different plugins do not overwrite
   * each others meta properties.
   */
  newData._meta = Object.assign({}, oldData._meta, newData._meta);

  // ensure modifications are ok
  if (_overwritable.overwritable.isDevMode()) {
    collection.schema.validateChange(oldData, newData);
  }
  return collection._runHooks('pre', 'save', newData);
}
//# sourceMappingURL=rx-document.js.map