import { distinctUntilChanged, filter, map, shareReplay, startWith } from 'rxjs/operators';
import { clone, trimDots, pluginMissing, flatClone, PROMISE_RESOLVE_NULL, RXJS_SHARE_REPLAY_DEFAULTS, getProperty, getFromMapOrCreate, ensureNotFalsy } from "./plugins/utils/index.js";
import { newRxError } from "./rx-error.js";
import { runPluginHooks } from "./hooks.js";
import { getDocumentDataOfRxChangeEvent } from "./rx-change-event.js";
import { overwritable } from "./overwritable.js";
import { getSchemaByObjectPath } from "./rx-schema-helper.js";
import { getWrittenDocumentsFromBulkWriteResponse, throwIfIsStorageWriteError } from "./rx-storage-helper.js";
import { modifierFromPublicToInternal } from "./incremental-write.js";
export var basePrototype = {
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
    return _this.$.pipe(map(d => d._data._deleted));
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
    return _this.collection.eventBulks$.pipe(filter(bulk => !bulk.isLocal), map(bulk => bulk.events.find(ev => ev.documentId === id)), filter(event => !!event), map(changeEvent => getDocumentDataOfRxChangeEvent(ensureNotFalsy(changeEvent))), startWith(_this.collection._docCache.getLatestDocumentData(id)), distinctUntilChanged((prev, curr) => prev._rev === curr._rev), map(docData => this.collection._docCache.getCachedRxDocument(docData)), shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
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
    if (overwritable.isDevMode()) {
      if (path.includes('.item.')) {
        throw newRxError('DOC1', {
          path
        });
      }
      if (path === this.primaryPath) {
        throw newRxError('DOC2');
      }

      // final fields cannot be modified and so also not observed
      if (this.collection.schema.finalFields.includes(path)) {
        throw newRxError('DOC3', {
          path
        });
      }
      var schemaObj = getSchemaByObjectPath(this.collection.schema.jsonSchema, path);
      if (!schemaObj) {
        throw newRxError('DOC4', {
          path
        });
      }
    }
    return this.$.pipe(map(data => getProperty(data, path)), distinctUntilChanged());
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
    var schemaObj = getSchemaByObjectPath(this.collection.schema.jsonSchema, path);
    var value = this.get(path);
    if (!value) {
      return PROMISE_RESOLVE_NULL;
    }
    if (!schemaObj) {
      throw newRxError('DOC5', {
        path
      });
    }
    if (!schemaObj.ref) {
      throw newRxError('DOC6', {
        path,
        schemaObj
      });
    }
    var refCollection = this.collection.database.collections[schemaObj.ref];
    if (!refCollection) {
      throw newRxError('DOC7', {
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
      var data = flatClone(this._data);
      delete data._rev;
      delete data._attachments;
      delete data._deleted;
      delete data._meta;
      return overwritable.deepFreezeWhenDevMode(data);
    } else {
      return overwritable.deepFreezeWhenDevMode(this._data);
    }
  },
  toMutableJSON(withMetaFields = false) {
    return clone(this.toJSON(withMetaFields));
  },
  /**
   * updates document
   * @overwritten by plugin (optional)
   * @param updateObj mongodb-like syntax
   */
  update(_updateObj) {
    throw pluginMissing('update');
  },
  incrementalUpdate(_updateObj) {
    throw pluginMissing('update');
  },
  updateCRDT(_updateObj) {
    throw pluginMissing('crdt');
  },
  putAttachment() {
    throw pluginMissing('attachments');
  },
  putAttachmentBase64() {
    throw pluginMissing('attachments');
  },
  getAttachment() {
    throw pluginMissing('attachments');
  },
  allAttachments() {
    throw pluginMissing('attachments');
  },
  get allAttachments$() {
    throw pluginMissing('attachments');
  },
  async modify(mutationFunction,
  // used by some plugins that wrap the method
  _context) {
    var oldData = this._data;
    var newData = await modifierFromPublicToInternal(mutationFunction)(oldData);
    return this._saveData(newData, oldData);
  },
  /**
   * runs an incremental update over the document
   * @param function that takes the document-data and returns a new data-object
   */
  incrementalModify(mutationFunction,
  // used by some plugins that wrap the method
  _context) {
    return this.collection.incrementalWriteQueue.addWrite(this._data, modifierFromPublicToInternal(mutationFunction)).then(result => this.collection._docCache.getCachedRxDocument(result));
  },
  patch(patch) {
    var oldData = this._data;
    var newData = clone(oldData);
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
    newData = flatClone(newData);

    // deleted documents cannot be changed
    if (this._data._deleted) {
      throw newRxError('DOC11', {
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
    throwIfIsStorageWriteError(this.collection, this.primary, newData, isError);
    await this.collection._runHooks('post', 'save', newData, this);
    return this.collection._docCache.getCachedRxDocument(getWrittenDocumentsFromBulkWriteResponse(this.collection.schema.primaryPath, writeRows, writeResult)[0]);
  },
  /**
   * Remove the document.
   * Notice that there is no hard delete,
   * instead deleted documents get flagged with _deleted=true.
   */
  async remove() {
    if (this.deleted) {
      return Promise.reject(newRxError('DOC13', {
        document: this,
        id: this.primary
      }));
    }
    var removeResult = await this.collection.bulkRemove([this]);
    if (removeResult.error.length > 0) {
      var error = removeResult.error[0];
      throwIfIsStorageWriteError(this.collection, this.primary, this._data, error);
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
    throw newRxError('DOC14');
  }
};
export function createRxDocumentConstructor(proto = basePrototype) {
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
export function createWithConstructor(constructor, collection, jsonData) {
  var doc = new constructor(collection, jsonData);
  runPluginHooks('createRxDocument', doc);
  return doc;
}
export function isRxDocument(obj) {
  return typeof obj === 'object' && obj !== null && 'isInstanceOfRxDocument' in obj;
}
export function beforeDocumentUpdateWrite(collection, newData, oldData) {
  /**
   * Meta values must always be merged
   * instead of overwritten.
   * This ensures that different plugins do not overwrite
   * each others meta properties.
   */
  newData._meta = Object.assign({}, oldData._meta, newData._meta);

  // ensure modifications are ok
  if (overwritable.isDevMode()) {
    collection.schema.validateChange(oldData, newData);
  }
  return collection._runHooks('pre', 'save', newData, oldData);
}
function getDocumentProperty(doc, objPath) {
  return getFromMapOrCreate(doc._propertyCache, objPath, () => {
    var valueObj = getProperty(doc._data, objPath);

    // direct return if array or non-object
    if (typeof valueObj !== 'object' || valueObj === null || Array.isArray(valueObj)) {
      return overwritable.deepFreezeWhenDevMode(valueObj);
    }
    var proxy = new Proxy(
    /**
     * In dev-mode, the _data is deep-frozen
     * so we have to flat clone here so that
     * the proxy can work.
     */
    flatClone(valueObj), {
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
            return doc.get$$(trimDots(objPath + '.' + key));
          } else {
            var _key = property.slice(0, -1);
            return doc.get$(trimDots(objPath + '.' + _key));
          }
        } else if (lastChar === '_') {
          var _key2 = property.slice(0, -1);
          return doc.populate(trimDots(objPath + '.' + _key2));
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
          return getDocumentProperty(doc, trimDots(objPath + '.' + property));
        }
      }
    });
    return proxy;
  });
}
;
//# sourceMappingURL=rx-document.js.map