import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import objectPath from 'object-path';
import { clone, promiseWait, trimDots, getHeightOfRevision } from './util';
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

    this._atomicQueue = this._atomicQueue.then(function () {
      return fun(clone(_this2._dataSync$.getValue()), _this2);
    }).then(function (newData) {
      return _this2._saveData(newData);
    });
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
   * @param {} newData
   */
  _saveData: function () {
    var _saveData2 = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee(newData) {
      var ret, changeEvent;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              newData = clone(newData); // deleted documents cannot be changed

              if (!this._deleted$.getValue()) {
                _context.next = 3;
                break;
              }

              throw RxError.newRxError('DOC11', {
                id: this.primary,
                document: this
              });

            case 3:
              _context.next = 5;
              return this.collection._runHooks('pre', 'save', newData, this);

            case 5:
              this.collection.schema.validate(newData);
              _context.next = 8;
              return this.collection._pouchPut(clone(newData));

            case 8:
              ret = _context.sent;

              if (ret.ok) {
                _context.next = 11;
                break;
              }

              throw RxError.newRxError('DOC12', {
                data: ret
              });

            case 11:
              newData._rev = ret.rev; // emit event

              changeEvent = RxChangeEvent.create('UPDATE', this.collection.database, this.collection, this, newData);
              this.$emit(changeEvent);
              _context.next = 16;
              return this.collection._runHooks('post', 'save', newData, this);

            case 16:
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
   * saves the temporary document and makes a non-temporary out of it
   * Saving a temporary doc is basically the same as RxCollection.insert()
   * @return {boolean} false if nothing to save
   */
  save: function save() {
    var _this3 = this;

    // .save() cannot be called on non-temporary-documents
    if (!this._isTemporary) {
      throw RxError.newRxError('DOC17', {
        id: this.primary,
        document: this
      });
    }

    return this.collection.insert(this).then(function () {
      _this3._isTemporary = false;

      _this3.collection._docCache.set(_this3.primary, _this3); // internal events


      _this3._dataSync$.next(clone(_this3._data));

      return true;
    });
  },
  remove: function () {
    var _remove = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee2() {
      var deletedData;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!this.deleted) {
                _context2.next = 2;
                break;
              }

              throw RxError.newRxError('DOC13', {
                document: this,
                id: this.primary
              });

            case 2:
              _context2.next = 4;
              return promiseWait(0);

            case 4:
              deletedData = clone(this._data);
              _context2.next = 7;
              return this.collection._runHooks('pre', 'remove', deletedData, this);

            case 7:
              deletedData._deleted = true;
              /**
               * because pouch.remove will also empty the object,
               * we set _deleted: true and use pouch.put
               */

              _context2.next = 10;
              return this.collection._pouchPut(deletedData);

            case 10:
              this.$emit(RxChangeEvent.create('REMOVE', this.collection.database, this.collection, this, this._data));
              _context2.next = 13;
              return this.collection._runHooks('post', 'remove', deletedData, this);

            case 13:
              _context2.next = 15;
              return promiseWait(0);

            case 15:
              return _context2.abrupt("return", this);

            case 16:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    return function remove() {
      return _remove.apply(this, arguments);
    };
  }(),
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