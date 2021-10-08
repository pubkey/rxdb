"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.basePrototype = void 0;
exports.createRxDocumentConstructor = createRxDocumentConstructor;
exports.createWithConstructor = createWithConstructor;
exports.defineGetterSetter = defineGetterSetter;
exports.isRxDocument = isRxDocument;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _objectPath = _interopRequireDefault(require("object-path"));

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _util = require("./util");

var _rxError = require("./rx-error");

var _hooks = require("./hooks");

var _rxChangeEvent = require("./rx-change-event");

var _rxCollectionHelper = require("./rx-collection-helper");

var _overwritable = require("./overwritable");

var _rxSchemaHelper = require("./rx-schema-helper");

var basePrototype = {
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

    return _this._isDeleted$.asObservable();
  },

  get deleted() {
    var _this = this;

    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }

    return _this._isDeleted$.getValue();
  },

  /**
   * returns the observable which emits the plain-data of this document
   */
  get $() {
    var _this = this;

    return _this._dataSync$.asObservable().pipe((0, _operators.map)(function (docData) {
      return _overwritable.overwritable.deepFreezeWhenDevMode(docData);
    }));
  },

  _handleChangeEvent: function _handleChangeEvent(changeEvent) {
    if (changeEvent.documentId !== this.primary) {
      return;
    } // ensure that new _rev is higher then current


    var docData = (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent);
    var newRevNr = (0, _util.getHeightOfRevision)(docData._rev);
    var currentRevNr = (0, _util.getHeightOfRevision)(this._data._rev);
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

        this._isDeleted$.next(true);

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
      throw (0, _rxError.newRxError)('DOC1', {
        path: path
      });
    }

    if (path === this.primaryPath) throw (0, _rxError.newRxError)('DOC2'); // final fields cannot be modified and so also not observed

    if (this.collection.schema.finalFields.includes(path)) {
      throw (0, _rxError.newRxError)('DOC3', {
        path: path
      });
    }

    var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(this.collection.schema.jsonSchema, path);

    if (!schemaObj) {
      throw (0, _rxError.newRxError)('DOC4', {
        path: path
      });
    }

    return this._dataSync$.pipe((0, _operators.map)(function (data) {
      return _objectPath["default"].get(data, path);
    }), (0, _operators.distinctUntilChanged)());
  },

  /**
   * populate the given path
   */
  populate: function populate(path) {
    var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(this.collection.schema.jsonSchema, path);
    var value = this.get(path);

    if (!value) {
      return Promise.resolve(null);
    }

    if (!schemaObj) {
      throw (0, _rxError.newRxError)('DOC5', {
        path: path
      });
    }

    if (!schemaObj.ref) {
      throw (0, _rxError.newRxError)('DOC6', {
        path: path,
        schemaObj: schemaObj
      });
    }

    var refCollection = this.collection.database.collections[schemaObj.ref];

    if (!refCollection) {
      throw (0, _rxError.newRxError)('DOC7', {
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

    var valueObj = _objectPath["default"].get(this._data, objPath); // direct return if array or non-object


    if (typeof valueObj !== 'object' || Array.isArray(valueObj)) {
      return _overwritable.overwritable.deepFreezeWhenDevMode(valueObj);
    }
    /**
     * TODO find a way to deep-freeze together with defineGetterSetter
     * so we do not have to do a deep clone here.
     */


    valueObj = (0, _util.clone)(valueObj);
    defineGetterSetter(this.collection.schema, valueObj, objPath, this);
    return valueObj;
  },
  toJSON: function toJSON() {
    var withRevAndAttachments = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    if (!withRevAndAttachments) {
      var data = (0, _util.flatClone)(this._data);
      delete data._rev;
      delete data._attachments;
      return _overwritable.overwritable.deepFreezeWhenDevMode(data);
    } else {
      return _overwritable.overwritable.deepFreezeWhenDevMode(this._data);
    }
  },

  /**
   * set data by objectPath
   * This can only be called on temporary documents
   */
  set: function set(objPath, value) {
    // setters can only be used on temporary documents
    if (!this._isTemporary) {
      throw (0, _rxError.newRxTypeError)('DOC16', {
        objPath: objPath,
        value: value
      });
    }

    if (typeof objPath !== 'string') {
      throw (0, _rxError.newRxTypeError)('DOC15', {
        objPath: objPath,
        value: value
      });
    } // if equal, do nothing


    if (Object.is(this.get(objPath), value)) return; // throw if nested without root-object

    var pathEls = objPath.split('.');
    pathEls.pop();
    var rootPath = pathEls.join('.');

    if (typeof _objectPath["default"].get(this._data, rootPath) === 'undefined') {
      throw (0, _rxError.newRxError)('DOC10', {
        childpath: objPath,
        rootPath: rootPath
      });
    }

    _objectPath["default"].set(this._data, objPath, value);

    return this;
  },

  /**
   * updates document
   * @overwritten by plugin (optinal)
   * @param updateObj mongodb-like syntax
   */
  update: function update(_updateObj) {
    throw (0, _util.pluginMissing)('update');
  },
  putAttachment: function putAttachment() {
    throw (0, _util.pluginMissing)('attachments');
  },
  getAttachment: function getAttachment() {
    throw (0, _util.pluginMissing)('attachments');
  },
  allAttachments: function allAttachments() {
    throw (0, _util.pluginMissing)('attachments');
  },

  get allAttachments$() {
    throw (0, _util.pluginMissing)('attachments');
  },

  /**
   * runs an atomic update over the document
   * @param function that takes the document-data and returns a new data-object
   */
  atomicUpdate: function atomicUpdate(mutationFunction) {
    var _this2 = this;

    return new Promise(function (res, rej) {
      _this2._atomicQueue = _this2._atomicQueue.then( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var done, oldData, newData;
        return _regenerator["default"].wrap(function _callee$(_context) {
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
                return mutationFunction((0, _util.clone)(_this2._dataSync$.getValue()), _this2);

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

                if (!(0, _rxError.isPouchdbConflictError)(_context.t0)) {
                  _context.next = 20;
                  break;
                }

                _context.next = 18;
                return (0, _util.nextTick)();

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
   * saves the new document-data
   * and handles the events
   */
  _saveData: function () {
    var _saveData2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(newData, oldData) {
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              newData = newData; // deleted documents cannot be changed

              if (!this._isDeleted$.getValue()) {
                _context2.next = 3;
                break;
              }

              throw (0, _rxError.newRxError)('DOC11', {
                id: this.primary,
                document: this
              });

            case 3:
              // ensure modifications are ok
              this.collection.schema.validateChange(oldData, newData);
              _context2.next = 6;
              return this.collection._runHooks('pre', 'save', newData, this);

            case 6:
              this.collection.schema.validate(newData);
              _context2.next = 9;
              return (0, _rxCollectionHelper.writeToStorageInstance)(this.collection, {
                previous: oldData,
                document: newData
              });

            case 9:
              return _context2.abrupt("return", this.collection._runHooks('post', 'save', newData, this));

            case 10:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function _saveData(_x, _x2) {
      return _saveData2.apply(this, arguments);
    }

    return _saveData;
  }(),

  /**
   * saves the temporary document and makes a non-temporary out of it
   * Saving a temporary doc is basically the same as RxCollection.insert()
   * @return false if nothing to save
   */
  save: function save() {
    var _this3 = this;

    // .save() cannot be called on non-temporary-documents
    if (!this._isTemporary) {
      throw (0, _rxError.newRxError)('DOC17', {
        id: this.primary,
        document: this
      });
    }

    return this.collection.insert(this).then(function () {
      _this3._isTemporary = false;

      _this3.collection._docCache.set(_this3.primary, _this3); // internal events


      _this3._dataSync$.next(_this3._data);

      return true;
    });
  },

  /**
   * remove the document,
   * this not not equal to a pouchdb.remove(),
   * instead we keep the values and only set _deleted: true
   */
  remove: function remove() {
    var _this4 = this;

    if (this.deleted) {
      return Promise.reject((0, _rxError.newRxError)('DOC13', {
        document: this,
        id: this.primary
      }));
    }

    var deletedData = (0, _util.flatClone)(this._data);
    var startTime;
    return this.collection._runHooks('pre', 'remove', deletedData, this).then(function () {
      deletedData._deleted = true;
      startTime = (0, _util.now)();
      return (0, _rxCollectionHelper.writeToStorageInstance)(_this4.collection, {
        previous: _this4._data,
        document: deletedData
      });
    }).then(function () {
      return _this4.collection._runHooks('post', 'remove', deletedData, _this4);
    }).then(function () {
      return _this4;
    });
  },
  destroy: function destroy() {
    throw (0, _rxError.newRxError)('DOC14');
  }
};
exports.basePrototype = basePrototype;

function createRxDocumentConstructor() {
  var proto = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : basePrototype;

  var constructor = function RxDocumentConstructor(collection, jsonData) {
    this.collection = collection; // if true, this is a temporary document

    this._isTemporary = false; // assume that this is always equal to the doc-data in the database

    this._dataSync$ = new _rxjs.BehaviorSubject(jsonData);
    this._isDeleted$ = new _rxjs.BehaviorSubject(false);
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

function defineGetterSetter(schema, valueObj) {
  var objPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var thisObj = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  if (valueObj === null) return;
  var pathProperties = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema.jsonSchema, objPath);
  if (typeof pathProperties === 'undefined') return;
  if (pathProperties.properties) pathProperties = pathProperties.properties;
  Object.keys(pathProperties).forEach(function (key) {
    var fullPath = (0, _util.trimDots)(objPath + '.' + key); // getter - value

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

function createWithConstructor(constructor, collection, jsonData) {
  if (jsonData[collection.schema.primaryPath] && jsonData[collection.schema.primaryPath].startsWith('_design')) return null;
  var doc = new constructor(collection, jsonData);
  (0, _hooks.runPluginHooks)('createRxDocument', doc);
  return doc;
}

function isRxDocument(obj) {
  if (typeof obj === 'undefined') return false;
  return !!obj.isInstanceOfRxDocument;
}

//# sourceMappingURL=rx-document.js.map