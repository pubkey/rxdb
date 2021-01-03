import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import objectPath from 'object-path';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { clone, trimDots, getHeightOfRevision, pluginMissing, now, nextTick } from './util';
import { createUpdateEvent, createDeleteEvent } from './rx-change-event';
import { newRxError, newRxTypeError, isPouchdbConflictError } from './rx-error';
import { runPluginHooks } from './hooks';
export var basePrototype = {
  /**
   * TODO
   * instead of appliying the _this-hack
   * we should make these accesors functions instead of getters.
   */
  get _data() {
    var _this = this;
    /**
     * Might be undefined when vuejs-devtools are used
     * @link https://github.com/pubkey/rxdb/issues/1126
     */


    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }

    return _this._dataSync$.getValue();
  },

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

    return _this._deleted$.asObservable();
  },

  get deleted() {
    var _this = this;

    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }

    return _this._deleted$.getValue();
  },

  /**
   * returns the observable which emits the plain-data of this document
   */
  get $() {
    var _this = this;

    return _this._dataSync$.asObservable();
  },

  _handleChangeEvent: function _handleChangeEvent(changeEvent) {
    if (changeEvent.documentId !== this.primary) return; // ensure that new _rev is higher then current

    var newRevNr = getHeightOfRevision(changeEvent.documentData._rev);
    var currentRevNr = getHeightOfRevision(this._data._rev);
    if (currentRevNr > newRevNr) return;

    switch (changeEvent.operation) {
      case 'INSERT':
        break;

      case 'UPDATE':
        var newData = changeEvent.documentData;

        this._dataSync$.next(newData);

        break;

      case 'DELETE':
        // remove from docCache to assure new upserted RxDocuments will be a new instance
        this.collection._docCache["delete"](this.primary);

        this._deleted$.next(true);

        break;
    }
  },

  /**
   * emits the changeEvent to the upper instance (RxCollection)
   */
  $emit: function $emit(changeEvent) {
    return this.collection.$emit(changeEvent);
  },

  /**
   * returns observable of the value of the given path
   */
  get$: function get$(path) {
    if (path.includes('.item.')) {
      throw newRxError('DOC1', {
        path: path
      });
    }

    if (path === this.primaryPath) throw newRxError('DOC2'); // final fields cannot be modified and so also not observed

    if (this.collection.schema.finalFields.includes(path)) {
      throw newRxError('DOC3', {
        path: path
      });
    }

    var schemaObj = this.collection.schema.getSchemaByObjectPath(path);

    if (!schemaObj) {
      throw newRxError('DOC4', {
        path: path
      });
    }

    return this._dataSync$.pipe(map(function (data) {
      return objectPath.get(data, path);
    }), distinctUntilChanged());
  },

  /**
   * populate the given path
   */
  populate: function populate(path) {
    var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
    var value = this.get(path);

    if (!value) {
      return Promise.resolve(null);
    }

    if (!schemaObj) {
      throw newRxError('DOC5', {
        path: path
      });
    }

    if (!schemaObj.ref) {
      throw newRxError('DOC6', {
        path: path,
        schemaObj: schemaObj
      });
    }

    var refCollection = this.collection.database.collections[schemaObj.ref];

    if (!refCollection) {
      throw newRxError('DOC7', {
        ref: schemaObj.ref,
        path: path,
        schemaObj: schemaObj
      });
    }

    if (schemaObj.type === 'array') {
      return refCollection.findByIds(value).then(function (res) {
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
  get: function get(objPath) {
    if (!this._data) return undefined;
    var valueObj = objectPath.get(this._data, objPath);
    valueObj = clone(valueObj); // direct return if array or non-object

    if (typeof valueObj !== 'object' || Array.isArray(valueObj)) return valueObj;
    defineGetterSetter(this.collection.schema, valueObj, objPath, this);
    return valueObj;
  },
  toJSON: function toJSON() {
    var withRevAndAttachments = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    var data = clone(this._data);

    if (!withRevAndAttachments) {
      delete data._rev;
      delete data._attachments;
    }

    return data;
  },

  /**
   * set data by objectPath
   * This can only be called on temporary documents
   */
  set: function set(objPath, value) {
    // setters can only be used on temporary documents
    if (!this._isTemporary) {
      throw newRxTypeError('DOC16', {
        objPath: objPath,
        value: value
      });
    }

    if (typeof objPath !== 'string') {
      throw newRxTypeError('DOC15', {
        objPath: objPath,
        value: value
      });
    } // if equal, do nothing


    if (Object.is(this.get(objPath), value)) return; // throw if nested without root-object

    var pathEls = objPath.split('.');
    pathEls.pop();
    var rootPath = pathEls.join('.');

    if (typeof objectPath.get(this._data, rootPath) === 'undefined') {
      throw newRxError('DOC10', {
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
   * @param updateObj mongodb-like syntax
   */
  update: function update(_updateObj) {
    throw pluginMissing('update');
  },
  putAttachment: function putAttachment() {
    throw pluginMissing('attachments');
  },
  getAttachment: function getAttachment() {
    throw pluginMissing('attachments');
  },
  allAttachments: function allAttachments() {
    throw pluginMissing('attachments');
  },

  get allAttachments$() {
    throw pluginMissing('attachments');
  },

  /**
   * runs an atomic update over the document
   * @param function that takes the document-data and returns a new data-object
   */
  atomicUpdate: function atomicUpdate(mutationFunction) {
    var _this2 = this;

    return new Promise(function (res, rej) {
      _this2._atomicQueue = _this2._atomicQueue.then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
        var done, oldData, newData;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                done = false; // we need a hacky while loop to stay incide the chain-link of _atomicQueue
                // while still having the option to run a retry on conflicts

              case 1:
                if (done) {
                  _context.next = 24;
                  break;
                }

                oldData = _this2._dataSync$.getValue();
                _context.prev = 3;
                _context.next = 6;
                return mutationFunction(clone(_this2._dataSync$.getValue()), _this2);

              case 6:
                newData = _context.sent;

                if (_this2.collection) {
                  newData = _this2.collection.schema.fillObjectWithDefaults(newData);
                }

                _context.next = 10;
                return _this2._saveData(newData, oldData);

              case 10:
                done = true;
                _context.next = 22;
                break;

              case 13:
                _context.prev = 13;
                _context.t0 = _context["catch"](3);

                if (!isPouchdbConflictError(_context.t0)) {
                  _context.next = 20;
                  break;
                }

                _context.next = 18;
                return nextTick();

              case 18:
                _context.next = 22;
                break;

              case 20:
                rej(_context.t0);
                return _context.abrupt("return");

              case 22:
                _context.next = 1;
                break;

              case 24:
                res(_this2);

              case 25:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[3, 13]]);
      })));
    });
  },

  /**
   * patches the given properties
   */
  atomicPatch: function atomicPatch(patch) {
    return this.atomicUpdate(function (docData) {
      Object.entries(patch).forEach(function (_ref2) {
        var k = _ref2[0],
            v = _ref2[1];
        docData[k] = v;
      });
      return docData;
    });
  },

  /**
   * @deprecated use atomicPatch instead because it is better typed
   * and does not allow any keys and values
   */
  atomicSet: function atomicSet(key, value) {
    return this.atomicUpdate(function (docData) {
      objectPath.set(docData, key, value);
      return docData;
    });
  },

  /**
   * saves the new document-data
   * and handles the events
   */
  _saveData: function _saveData(newData, oldData) {
    var _this3 = this;

    newData = newData; // deleted documents cannot be changed

    if (this._deleted$.getValue()) {
      throw newRxError('DOC11', {
        id: this.primary,
        document: this
      });
    } // ensure modifications are ok


    this.collection.schema.validateChange(oldData, newData);
    var startTime;
    return this.collection._runHooks('pre', 'save', newData, this).then(function () {
      _this3.collection.schema.validate(newData);

      startTime = now();
      return _this3.collection._pouchPut(newData);
    }).then(function (ret) {
      var endTime = now();

      if (!ret.ok) {
        throw newRxError('DOC12', {
          data: ret
        });
      }

      newData._rev = ret.rev; // emit event

      var changeEvent = createUpdateEvent(_this3.collection, newData, oldData, startTime, endTime, _this3);

      _this3.$emit(changeEvent);

      return _this3.collection._runHooks('post', 'save', newData, _this3);
    });
  },

  /**
   * saves the temporary document and makes a non-temporary out of it
   * Saving a temporary doc is basically the same as RxCollection.insert()
   * @return false if nothing to save
   */
  save: function save() {
    var _this4 = this;

    // .save() cannot be called on non-temporary-documents
    if (!this._isTemporary) {
      throw newRxError('DOC17', {
        id: this.primary,
        document: this
      });
    }

    return this.collection.insert(this).then(function () {
      _this4._isTemporary = false;

      _this4.collection._docCache.set(_this4.primary, _this4); // internal events


      _this4._dataSync$.next(_this4._data);

      return true;
    });
  },

  /**
   * remove the document,
   * this not not equal to a pouchdb.remove(),
   * instead we keep the values and only set _deleted: true
   */
  remove: function remove() {
    var _this5 = this;

    if (this.deleted) {
      return Promise.reject(newRxError('DOC13', {
        document: this,
        id: this.primary
      }));
    }

    var deletedData = clone(this._data);
    var startTime;
    return this.collection._runHooks('pre', 'remove', deletedData, this).then(function () {
      deletedData._deleted = true;
      startTime = now();
      /**
       * because pouch.remove will also empty the object,
       * we set _deleted: true and use pouch.put
       */

      return _this5.collection._pouchPut(deletedData);
    }).then(function () {
      var endTime = now();

      _this5.$emit(createDeleteEvent(_this5.collection, deletedData, _this5._data, startTime, endTime, _this5));

      return _this5.collection._runHooks('post', 'remove', deletedData, _this5);
    }).then(function () {
      return _this5;
    });
  },
  destroy: function destroy() {
    throw newRxError('DOC14');
  }
};
export function createRxDocumentConstructor() {
  var proto = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : basePrototype;

  var constructor = function RxDocumentConstructor(collection, jsonData) {
    this.collection = collection; // if true, this is a temporary document

    this._isTemporary = false; // assume that this is always equal to the doc-data in the database

    this._dataSync$ = new BehaviorSubject(jsonData);
    this._deleted$ = new BehaviorSubject(false);
    this._atomicQueue = Promise.resolve();
    /**
     * because of the prototype-merge,
     * we can not use the native instanceof operator
     */

    this.isInstanceOfRxDocument = true;
  };

  constructor.prototype = proto;
  return constructor;
}
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
export function isInstanceOf(obj) {
  if (typeof obj === 'undefined') return false;
  return !!obj.isInstanceOfRxDocument;
}
//# sourceMappingURL=rx-document.js.map