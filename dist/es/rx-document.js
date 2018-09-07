import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import objectPath from 'object-path';
import { clone, trimDots, getHeightOfRevision } from './util';
import RxChangeEvent from './rx-change-event';
import RxError from './rx-error';
import { runPluginHooks } from './hooks';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
export function createRxDocumentConstructor() {
  var proto = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : basePrototype;

  var constructor = function RxDocument(collection, jsonData) {
    this.collection = collection; // if true, this is a temporary document

    this._isTemporary = false; // assume that this is always equal to the doc-data in the database

    this._dataSync$ = new BehaviorSubject(clone(jsonData));
    this._deleted$ = new BehaviorSubject(false);
    this._atomicQueue = Promise.resolve();
  };

  constructor.prototype = proto;
  return constructor;
}
export var basePrototype = {
  /**
   * because of the prototype-merge,
   * we can not use the native instanceof operator
   */
  get isInstanceOfRxDocument() {
    return true;
  },

  get _data() {
    return this._dataSync$.getValue();
  },

  get primaryPath() {
    return this.collection.schema.primaryPath;
  },

  get primary() {
    return this._data[this.primaryPath];
  },

  get revision() {
    return this._data._rev;
  },

  get deleted$() {
    return this._deleted$.asObservable();
  },

  get deleted() {
    return this._deleted$.getValue();
  },

  /**
   * returns the observable which emits the plain-data of this document
   * @return {Observable}
   */
  get $() {
    return this._dataSync$.asObservable();
  },

  /**
   * @param {ChangeEvent}
   */
  _handleChangeEvent: function _handleChangeEvent(changeEvent) {
    if (changeEvent.data.doc !== this.primary) return; // ensure that new _rev is higher then current

    var newRevNr = getHeightOfRevision(changeEvent.data.v._rev);
    var currentRevNr = getHeightOfRevision(this._data._rev);
    if (currentRevNr > newRevNr) return;

    switch (changeEvent.data.op) {
      case 'INSERT':
        break;

      case 'UPDATE':
        var newData = clone(changeEvent.data.v);

        this._dataSync$.next(clone(newData));

        break;

      case 'REMOVE':
        // remove from docCache to assure new upserted RxDocuments will be a new instance
        this.collection._docCache["delete"](this.primary);

        this._deleted$.next(true);

        break;
    }
  },

  /**
   * emits the changeEvent to the upper instance (RxCollection)
   * @param  {RxChangeEvent} changeEvent
   */
  $emit: function $emit(changeEvent) {
    return this.collection.$emit(changeEvent);
  },

  /**
   * returns observable of the value of the given path
   * @param {string} path
   * @return {Observable}
   */
  get$: function get$(path) {
    if (path.includes('.item.')) {
      throw RxError.newRxError('DOC1', {
        path: path
      });
    }

    if (path === this.primaryPath) throw RxError.newRxError('DOC2'); // final fields cannot be modified and so also not observed

    if (this.collection.schema.finalFields.includes(path)) {
      throw RxError.newRxError('DOC3', {
        path: path
      });
    }

    var schemaObj = this.collection.schema.getSchemaByObjectPath(path);

    if (!schemaObj) {
      throw RxError.newRxError('DOC4', {
        path: path
      });
    }

    return this._dataSync$.pipe(map(function (data) {
      return objectPath.get(data, path);
    }), distinctUntilChanged()).asObservable();
  },

  /**
   * populate the given path
   * @param  {string}  path
   * @return {Promise<RxDocument>}
   */
  populate: function populate(path) {
    var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
    var value = this.get(path);

    if (!schemaObj) {
      throw RxError.newRxError('DOC5', {
        path: path
      });
    }

    if (!schemaObj.ref) {
      throw RxError.newRxError('DOC6', {
        path: path,
        schemaObj: schemaObj
      });
    }

    var refCollection = this.collection.database.collections[schemaObj.ref];

    if (!refCollection) {
      throw RxError.newRxError('DOC7', {
        ref: schemaObj.ref,
        path: path,
        schemaObj: schemaObj
      });
    }

    if (schemaObj.type === 'array') return Promise.all(value.map(function (id) {
      return refCollection.findOne(id).exec();
    }));else return refCollection.findOne(value).exec();
  },

  /**
   * get data by objectPath
   * @param {string} objPath
   * @return {object} valueObj
   */
  get: function get(objPath) {
    if (!this._data) return undefined;
    var valueObj = objectPath.get(this._data, objPath);
    valueObj = clone(valueObj); // direct return if array or non-object

    if (typeof valueObj !== 'object' || Array.isArray(valueObj)) return valueObj;
    defineGetterSetter(this.collection.schema, valueObj, objPath, this);
    return valueObj;
  },
  toJSON: function toJSON() {
    return clone(this._data);
  },

  /**
   * set data by objectPath
   * This can only be called on temporary documents
   * @param {string} objPath
   * @param {object} value
   */
  set: function set(objPath, value) {
    // setters can only be used on temporary documents
    if (!this._isTemporary) {
      throw RxError.newRxTypeError('DOC16', {
        objPath: objPath,
        value: value
      });
    }

    if (typeof objPath !== 'string') {
      throw RxError.newRxTypeError('DOC15', {
        objPath: objPath,
        value: value
      });
    } // if equal, do nothing


    if (Object.is(this.get(objPath), value)) return; // throw if nested without root-object

    var pathEls = objPath.split('.');
    pathEls.pop();
    var rootPath = pathEls.join('.');

    if (typeof objectPath.get(this._data, rootPath) === 'undefined') {
      throw RxError.newRxError('DOC10', {
        childpath: objPath,
        rootPath: rootPath
      });
    }

    objectPath.set(this._data, objPath, value);
    return this;
  },

  /**
   * updates document
   * @overwritten by plugin (optinal)
   * @param  {object} updateObj mongodb-like syntax
   */
  update: function update() {
    throw RxError.pluginMissing('update');
  },
  putAttachment: function putAttachment() {
    throw RxError.pluginMissing('attachments');
  },
  getAttachment: function getAttachment() {
    throw RxError.pluginMissing('attachments');
  },
  allAttachments: function allAttachments() {
    throw RxError.pluginMissing('attachments');
  },

  get allAttachments$() {
    throw RxError.pluginMissing('attachments');
  },

  /**
   * runs an atomic update over the document
   * @param  {function(any)} fun that takes the document-data and returns a new data-object
   * @return {Promise<RxDocument>}
   */
  atomicUpdate: function atomicUpdate(fun) {
    var _this2 = this;

    this._atomicQueue = this._atomicQueue.then(
    /*#__PURE__*/
    _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee() {
      var oldData, newData;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              oldData = clone(_this2._dataSync$.getValue()); // use await here because it's unknown if a promise is returned

              _context.next = 3;
              return fun(clone(_this2._dataSync$.getValue()), _this2);

            case 3:
              newData = _context.sent;
              return _context.abrupt("return", _this2._saveData(newData, oldData));

            case 5:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    })));
    return this._atomicQueue.then(function () {
      return _this2;
    });
  },
  atomicSet: function atomicSet(key, value) {
    return this.atomicUpdate(function (docData) {
      objectPath.set(docData, key, value);
      return docData;
    });
  },

  /**
   * saves the new document-data
   * and handles the events
   * @param {any} newData
   * @param {any} oldData
   * @return {Promise}
   */
  _saveData: function _saveData(newData, oldData) {
    var _this3 = this;

    newData = clone(newData); // deleted documents cannot be changed

    if (this._deleted$.getValue()) {
      throw RxError.newRxError('DOC11', {
        id: this.primary,
        document: this
      });
    } // ensure modifications are ok


    this.collection.schema.validateChange(newData, oldData);
    return this.collection._runHooks('pre', 'save', newData, this).then(function () {
      _this3.collection.schema.validate(newData);

      return _this3.collection._pouchPut(clone(newData));
    }).then(function (ret) {
      if (!ret.ok) {
        throw RxError.newRxError('DOC12', {
          data: ret
        });
      }

      newData._rev = ret.rev; // emit event

      var changeEvent = RxChangeEvent.create('UPDATE', _this3.collection.database, _this3.collection, _this3, newData);

      _this3.$emit(changeEvent);

      return _this3.collection._runHooks('post', 'save', newData, _this3);
    });
  },

  /**
   * saves the temporary document and makes a non-temporary out of it
   * Saving a temporary doc is basically the same as RxCollection.insert()
   * @return {boolean} false if nothing to save
   */
  save: function save() {
    var _this4 = this;

    // .save() cannot be called on non-temporary-documents
    if (!this._isTemporary) {
      throw RxError.newRxError('DOC17', {
        id: this.primary,
        document: this
      });
    }

    return this.collection.insert(this).then(function () {
      _this4._isTemporary = false;

      _this4.collection._docCache.set(_this4.primary, _this4); // internal events


      _this4._dataSync$.next(clone(_this4._data));

      return true;
    });
  },

  /**
   * remove the document,
   * this not not equal to a pouchdb.remove(),
   * instead we keep the values and only set _deleted: true
   * @return {Promise<RxDocument>}
   */
  remove: function remove() {
    var _this5 = this;

    if (this.deleted) {
      throw RxError.newRxError('DOC13', {
        document: this,
        id: this.primary
      });
    }

    var deletedData = clone(this._data);
    return this.collection._runHooks('pre', 'remove', deletedData, this).then(function () {
      deletedData._deleted = true;
      /**
       * because pouch.remove will also empty the object,
       * we set _deleted: true and use pouch.put
       */

      return _this5.collection._pouchPut(deletedData);
    }).then(function () {
      _this5.$emit(RxChangeEvent.create('REMOVE', _this5.collection.database, _this5.collection, _this5, _this5._data));

      return _this5.collection._runHooks('post', 'remove', deletedData, _this5);
    }).then(function () {
      return _this5;
    });
  },
  destroy: function destroy() {
    throw RxError.newRxError('DOC14');
  }
};
var pseudoConstructor = createRxDocumentConstructor(basePrototype);
var pseudoRxDocument = new pseudoConstructor();
export function defineGetterSetter(schema, valueObj) {
  var objPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var thisObj = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  if (valueObj === null) return;
  var pathProperties = schema.getSchemaByObjectPath(objPath);
  if (typeof pathProperties === 'undefined') return;
  if (pathProperties.properties) pathProperties = pathProperties.properties;
  Object.keys(pathProperties).forEach(function (key) {
    var fullPath = trimDots(objPath + '.' + key); // getter - value

    valueObj.__defineGetter__(key, function () {
      var _this = thisObj ? thisObj : this;

      return _this.get(fullPath);
    }); // getter - observable$


    Object.defineProperty(valueObj, key + '$', {
      get: function get() {
        var _this = thisObj ? thisObj : this;

        return _this.get$(fullPath);
      },
      enumerable: false,
      configurable: false
    }); // getter - populate_

    Object.defineProperty(valueObj, key + '_', {
      get: function get() {
        var _this = thisObj ? thisObj : this;

        return _this.populate(fullPath);
      },
      enumerable: false,
      configurable: false
    }); // setter - value

    valueObj.__defineSetter__(key, function (val) {
      var _this = thisObj ? thisObj : this;

      return _this.set(fullPath, val);
    });
  });
}
export function createWithConstructor(constructor, collection, jsonData) {
  if (jsonData[collection.schema.primaryPath] && jsonData[collection.schema.primaryPath].startsWith('_design')) return null;
  var doc = new constructor(collection, jsonData);
  runPluginHooks('createRxDocument', doc);
  return doc;
}
/**
 * returns all possible properties of a RxDocument
 * @return {string[]} property-names
 */

var _properties;

export function properties() {
  if (!_properties) {
    var reserved = ['deleted', 'synced'];
    var ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
    var prototypeProperties = Object.getOwnPropertyNames(basePrototype);
    _properties = ownProperties.concat(prototypeProperties, reserved);
  }

  return _properties;
}
export function isInstanceOf(obj) {
  if (typeof obj === 'undefined') return false;
  return !!obj.isInstanceOfRxDocument;
}
export default {
  createWithConstructor: createWithConstructor,
  properties: properties,
  createRxDocumentConstructor: createRxDocumentConstructor,
  basePrototype: basePrototype,
  isInstanceOf: isInstanceOf
};