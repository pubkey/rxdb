"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.basePrototype = void 0;
exports.beforeDocumentUpdateWrite = beforeDocumentUpdateWrite;
exports.createRxDocumentConstructor = createRxDocumentConstructor;
exports.createWithConstructor = createWithConstructor;
exports.isRxDocument = isRxDocument;
var _operators = require("rxjs/operators");
var _index = require("./plugins/utils/index.js");
var _rxError = require("./rx-error.js");
var _hooks = require("./hooks.js");
var _rxChangeEvent = require("./rx-change-event.js");
var _overwritable = require("./overwritable.js");
var _rxSchemaHelper = require("./rx-schema-helper.js");
var _rxStorageHelper = require("./rx-storage-helper.js");
var _incrementalWrite = require("./incremental-write.js");
var basePrototype = exports.basePrototype = {
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
    return _this.$.pipe((0, _operators.map)(d => d._data._deleted));
  },
  get deleted$$() {
    var _this = this;
    var reactivity = _this.collection.database.getReactivityFactory();
    return reactivity.fromObservable(_this.deleted$, _this.getLatest().deleted, _this.collection.database);
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
    var id = this.primary;
    return _this.collection.eventBulks$.pipe((0, _operators.filter)(bulk => !bulk.isLocal), (0, _operators.map)(bulk => bulk.events.find(ev => ev.documentId === id)), (0, _operators.filter)(event => !!event), (0, _operators.map)(changeEvent => (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)((0, _index.ensureNotFalsy)(changeEvent))), (0, _operators.startWith)(_this.collection._docCache.getLatestDocumentData(id)), (0, _operators.distinctUntilChanged)((prev, curr) => prev._rev === curr._rev), (0, _operators.map)(docData => this.collection._docCache.getCachedRxDocument(docData)), (0, _operators.shareReplay)(_index.RXJS_SHARE_REPLAY_DEFAULTS));
  },
  get $$() {
    var _this = this;
    var reactivity = _this.collection.database.getReactivityFactory();
    return reactivity.fromObservable(_this.$, _this.getLatest()._data, _this.collection.database);
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
    return this.$.pipe((0, _operators.map)(data => (0, _index.getProperty)(data, path)), (0, _operators.distinctUntilChanged)());
  },
  get$$(path) {
    var obs = this.get$(path);
    var reactivity = this.collection.database.getReactivityFactory();
    return reactivity.fromObservable(obs, this.getLatest().get(path), this.collection.database);
  },
  /**
   * populate the given path
   */
  populate(path) {
    var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(this.collection.schema.jsonSchema, path);
    var value = this.get(path);
    if (!value) {
      return _index.PROMISE_RESOLVE_NULL;
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
   * @hotPath Performance here is really important,
   * run some tests before changing anything.
   */
  get(objPath) {
    return getDocumentProperty(this, objPath);
  },
  toJSON(withMetaFields = false) {
    if (!withMetaFields) {
      var data = (0, _index.flatClone)(this._data);
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
    return (0, _index.clone)(this.toJSON(withMetaFields));
  },
  /**
   * updates document
   * @overwritten by plugin (optional)
   * @param updateObj mongodb-like syntax
   */
  update(_updateObj) {
    throw (0, _index.pluginMissing)('update');
  },
  incrementalUpdate(_updateObj) {
    throw (0, _index.pluginMissing)('update');
  },
  updateCRDT(_updateObj) {
    throw (0, _index.pluginMissing)('crdt');
  },
  putAttachment() {
    throw (0, _index.pluginMissing)('attachments');
  },
  putAttachmentBase64() {
    throw (0, _index.pluginMissing)('attachments');
  },
  getAttachment() {
    throw (0, _index.pluginMissing)('attachments');
  },
  allAttachments() {
    throw (0, _index.pluginMissing)('attachments');
  },
  get allAttachments$() {
    throw (0, _index.pluginMissing)('attachments');
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
    var newData = (0, _index.clone)(oldData);
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
    newData = (0, _index.flatClone)(newData);

    // deleted documents cannot be changed
    if (this._data._deleted) {
      throw (0, _rxError.newRxError)('DOC11', {
        id: this.primary,
        document: this
      });
    }
    await beforeDocumentUpdateWrite(this.collection, newData, oldData);
    var writeRows = [{
      previous: oldData,
      document: newData
    }];
    var writeResult = await this.collection.storageInstance.bulkWrite(writeRows, 'rx-document-save-data');
    var isError = writeResult.error[0];
    (0, _rxStorageHelper.throwIfIsStorageWriteError)(this.collection, this.primary, newData, isError);
    await this.collection._runHooks('post', 'save', newData, this);
    return this.collection._docCache.getCachedRxDocument((0, _rxStorageHelper.getWrittenDocumentsFromBulkWriteResponse)(this.collection.schema.primaryPath, writeRows, writeResult)[0]);
  },
  /**
   * Remove the document.
   * Notice that there is no hard delete,
   * instead deleted documents get flagged with _deleted=true.
   */
  async remove() {
    if (this.deleted) {
      return Promise.reject((0, _rxError.newRxError)('DOC13', {
        document: this,
        id: this.primary
      }));
    }
    var removeResult = await this.collection.bulkRemove([this]);
    if (removeResult.error.length > 0) {
      var error = removeResult.error[0];
      (0, _rxStorageHelper.throwIfIsStorageWriteError)(this.collection, this.primary, this._data, error);
    }
    return removeResult.success[0];
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
  close() {
    throw (0, _rxError.newRxError)('DOC14');
  }
};
function createRxDocumentConstructor(proto = basePrototype) {
  var constructor = function RxDocumentConstructor(collection, docData) {
    this.collection = collection;

    // assume that this is always equal to the doc-data in the database
    this._data = docData;
    this._propertyCache = new Map();

    /**
     * because of the prototype-merge,
     * we can not use the native instanceof operator
     */
    this.isInstanceOfRxDocument = true;
  };
  constructor.prototype = proto;
  return constructor;
}
function createWithConstructor(constructor, collection, jsonData) {
  var doc = new constructor(collection, jsonData);
  (0, _hooks.runPluginHooks)('createRxDocument', doc);
  return doc;
}
function isRxDocument(obj) {
  return typeof obj === 'object' && obj !== null && 'isInstanceOfRxDocument' in obj;
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
  return collection._runHooks('pre', 'save', newData, oldData);
}
function getDocumentProperty(doc, objPath) {
  return (0, _index.getFromMapOrCreate)(doc._propertyCache, objPath, () => {
    var valueObj = (0, _index.getProperty)(doc._data, objPath);

    // direct return if array or non-object
    if (typeof valueObj !== 'object' || valueObj === null || Array.isArray(valueObj)) {
      return _overwritable.overwritable.deepFreezeWhenDevMode(valueObj);
    }
    var proxy = new Proxy(
    /**
     * In dev-mode, the _data is deep-frozen
     * so we have to flat clone here so that
     * the proxy can work.
     */
    (0, _index.flatClone)(valueObj), {
      /**
       * @performance is really important here
       * because people access nested properties very often
       * and might not be aware that this is internally using a Proxy
       */
      get(target, property) {
        if (typeof property !== 'string') {
          return target[property];
        }
        var lastChar = property.charAt(property.length - 1);
        if (lastChar === '$') {
          if (property.endsWith('$$')) {
            var key = property.slice(0, -2);
            return doc.get$$((0, _index.trimDots)(objPath + '.' + key));
          } else {
            var _key = property.slice(0, -1);
            return doc.get$((0, _index.trimDots)(objPath + '.' + _key));
          }
        } else if (lastChar === '_') {
          var _key2 = property.slice(0, -1);
          return doc.populate((0, _index.trimDots)(objPath + '.' + _key2));
        } else {
          /**
           * Performance shortcut
           * In most cases access to nested properties
           * will only access simple values which can be directly returned
           * without creating a new Proxy or utilizing the cache.
           */
          var plainValue = target[property];
          if (typeof plainValue === 'number' || typeof plainValue === 'string' || typeof plainValue === 'boolean') {
            return plainValue;
          }
          return getDocumentProperty(doc, (0, _index.trimDots)(objPath + '.' + property));
        }
      }
    });
    return proxy;
  });
}
;
//# sourceMappingURL=rx-document.js.map