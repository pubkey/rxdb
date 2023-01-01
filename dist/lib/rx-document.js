"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.basePrototype = void 0;
exports.beforeDocumentUpdateWrite = beforeDocumentUpdateWrite;
exports.createRxDocumentConstructor = createRxDocumentConstructor;
exports.createWithConstructor = createWithConstructor;
exports.defineGetterSetter = defineGetterSetter;
exports.isRxDocument = isRxDocument;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _objectPath = _interopRequireDefault(require("object-path"));
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
    return _this.$.pipe((0, _operators.map)(function (d) {
      return d._deleted;
    }));
  },
  get deleted() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this._data._deleted;
  },
  getLatest: function getLatest() {
    var latestDocData = this.collection._docCache.getLatestDocumentData(this.primary);
    return this.collection._docCache.getCachedRxDocument(latestDocData);
  },
  /**
   * returns the observable which emits the plain-data of this document
   */
  get $() {
    var _this2 = this;
    var _this = this;
    return _this.collection.$.pipe((0, _operators.filter)(function (changeEvent) {
      return !changeEvent.isLocal;
    }), (0, _operators.filter)(function (changeEvent) {
      return changeEvent.documentId === _this2.primary;
    }), (0, _operators.map)(function (changeEvent) {
      return (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent);
    }), (0, _operators.startWith)(_this.collection._docCache.getLatestDocumentData(this.primary)), (0, _operators.distinctUntilChanged)(function (prev, curr) {
      return prev._rev === curr._rev;
    }), (0, _operators.shareReplay)(_utils.RXJS_SHARE_REPLAY_DEFAULTS));
  },
  /**
   * returns observable of the value of the given path
   */
  get$: function get$(path) {
    if (_overwritable.overwritable.isDevMode()) {
      if (path.includes('.item.')) {
        throw (0, _rxError.newRxError)('DOC1', {
          path: path
        });
      }
      if (path === this.primaryPath) {
        throw (0, _rxError.newRxError)('DOC2');
      }

      // final fields cannot be modified and so also not observed
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
    }
    return this.$.pipe((0, _operators.map)(function (data) {
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
      return _utils.PROMISE_RESOLVE_NULL;
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
      return refCollection.findByIds(value).exec().then(function (res) {
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
    var valueObj = _objectPath["default"].get(this._data, objPath);

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
  toJSON: function toJSON() {
    var withMetaFields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
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
  toMutableJSON: function toMutableJSON() {
    var withMetaFields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    return (0, _utils.clone)(this.toJSON(withMetaFields));
  },
  /**
   * updates document
   * @overwritten by plugin (optional)
   * @param updateObj mongodb-like syntax
   */
  update: function update(_updateObj) {
    throw (0, _utils.pluginMissing)('update');
  },
  incrementalUpdate: function incrementalUpdate(_updateObj) {
    throw (0, _utils.pluginMissing)('update');
  },
  updateCRDT: function updateCRDT(_updateObj) {
    throw (0, _utils.pluginMissing)('crdt');
  },
  putAttachment: function putAttachment() {
    throw (0, _utils.pluginMissing)('attachments');
  },
  getAttachment: function getAttachment() {
    throw (0, _utils.pluginMissing)('attachments');
  },
  allAttachments: function allAttachments() {
    throw (0, _utils.pluginMissing)('attachments');
  },
  get allAttachments$() {
    throw (0, _utils.pluginMissing)('attachments');
  },
  modify: function () {
    var _modify = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(mutationFunction,
    // used by some plugins that wrap the method
    _context) {
      var oldData, newData;
      return _regenerator["default"].wrap(function _callee$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            oldData = this._data;
            _context2.next = 3;
            return (0, _incrementalWrite.modifierFromPublicToInternal)(mutationFunction)(oldData);
          case 3:
            newData = _context2.sent;
            return _context2.abrupt("return", this._saveData(newData, oldData));
          case 5:
          case "end":
            return _context2.stop();
        }
      }, _callee, this);
    }));
    function modify(_x, _x2) {
      return _modify.apply(this, arguments);
    }
    return modify;
  }(),
  /**
   * runs an incremental update over the document
   * @param function that takes the document-data and returns a new data-object
   */
  incrementalModify: function incrementalModify(mutationFunction,
  // used by some plugins that wrap the method
  _context) {
    var _this3 = this;
    return this.collection.incrementalWriteQueue.addWrite(this._data, (0, _incrementalWrite.modifierFromPublicToInternal)(mutationFunction)).then(function (result) {
      return _this3.collection._docCache.getCachedRxDocument(result);
    });
  },
  patch: function patch(_patch) {
    var oldData = this._data;
    var newData = (0, _utils.clone)(oldData);
    Object.entries(_patch).forEach(function (_ref) {
      var k = _ref[0],
        v = _ref[1];
      newData[k] = v;
    });
    return this._saveData(newData, oldData);
  },
  /**
   * patches the given properties
   */
  incrementalPatch: function incrementalPatch(patch) {
    return this.incrementalModify(function (docData) {
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
      var writeResult, isError;
      return _regenerator["default"].wrap(function _callee2$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            newData = (0, _utils.flatClone)(newData);

            // deleted documents cannot be changed
            if (!this._data._deleted) {
              _context3.next = 3;
              break;
            }
            throw (0, _rxError.newRxError)('DOC11', {
              id: this.primary,
              document: this
            });
          case 3:
            _context3.next = 5;
            return beforeDocumentUpdateWrite(this.collection, newData, oldData);
          case 5:
            _context3.next = 7;
            return this.collection.storageInstance.bulkWrite([{
              previous: oldData,
              document: newData
            }], 'rx-document-save-data');
          case 7:
            writeResult = _context3.sent;
            isError = writeResult.error[this.primary];
            (0, _rxStorageHelper.throwIfIsStorageWriteError)(this.collection, this.primary, newData, isError);
            _context3.next = 12;
            return this.collection._runHooks('post', 'save', newData, this);
          case 12:
            return _context3.abrupt("return", this.collection._docCache.getCachedRxDocument((0, _utils.getFromObjectOrThrow)(writeResult.success, this.primary)));
          case 13:
          case "end":
            return _context3.stop();
        }
      }, _callee2, this);
    }));
    function _saveData(_x3, _x4) {
      return _saveData2.apply(this, arguments);
    }
    return _saveData;
  }(),
  /**
   * Remove the document.
   * Notice that there is no hard delete,
   * instead deleted documents get flagged with _deleted=true.
   */
  remove: function remove() {
    var _this4 = this;
    var collection = this.collection;
    if (this.deleted) {
      return Promise.reject((0, _rxError.newRxError)('DOC13', {
        document: this,
        id: this.primary
      }));
    }
    var deletedData = (0, _utils.flatClone)(this._data);
    var removedDocData;
    return collection._runHooks('pre', 'remove', deletedData, this).then( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      var writeResult, isError;
      return _regenerator["default"].wrap(function _callee3$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            deletedData._deleted = true;
            _context4.next = 3;
            return collection.storageInstance.bulkWrite([{
              previous: _this4._data,
              document: deletedData
            }], 'rx-document-remove');
          case 3:
            writeResult = _context4.sent;
            isError = writeResult.error[_this4.primary];
            (0, _rxStorageHelper.throwIfIsStorageWriteError)(collection, _this4.primary, deletedData, isError);
            return _context4.abrupt("return", (0, _utils.getFromObjectOrThrow)(writeResult.success, _this4.primary));
          case 7:
          case "end":
            return _context4.stop();
        }
      }, _callee3);
    }))).then(function (removed) {
      removedDocData = removed;
      return _this4.collection._runHooks('post', 'remove', deletedData, _this4);
    }).then(function () {
      return _this4.collection._docCache.getCachedRxDocument(removedDocData);
    });
  },
  incrementalRemove: function incrementalRemove() {
    var _this5 = this;
    return this.incrementalModify( /*#__PURE__*/function () {
      var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(docData) {
        return _regenerator["default"].wrap(function _callee4$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 2;
              return _this5.collection._runHooks('pre', 'remove', docData, _this5);
            case 2:
              docData._deleted = true;
              return _context5.abrupt("return", docData);
            case 4:
            case "end":
              return _context5.stop();
          }
        }, _callee4);
      }));
      return function (_x5) {
        return _ref4.apply(this, arguments);
      };
    }()).then( /*#__PURE__*/function () {
      var _ref5 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(newDoc) {
        return _regenerator["default"].wrap(function _callee5$(_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 2;
              return _this5.collection._runHooks('post', 'remove', newDoc._data, newDoc);
            case 2:
              return _context6.abrupt("return", newDoc);
            case 3:
            case "end":
              return _context6.stop();
          }
        }, _callee5);
      }));
      return function (_x6) {
        return _ref5.apply(this, arguments);
      };
    }());
  },
  destroy: function destroy() {
    throw (0, _rxError.newRxError)('DOC14');
  }
};
exports.basePrototype = basePrototype;
function createRxDocumentConstructor() {
  var proto = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : basePrototype;
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
function defineGetterSetter(schema, valueObj) {
  var objPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var thisObj = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  if (valueObj === null) return;
  var pathProperties = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema.jsonSchema, objPath);
  if (typeof pathProperties === 'undefined') return;
  if (pathProperties.properties) pathProperties = pathProperties.properties;
  Object.keys(pathProperties).forEach(function (key) {
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
      get: function get() {
        var _this = thisObj ? thisObj : this;
        return _this.get$(fullPath);
      },
      enumerable: false,
      configurable: false
    });
    // getter - populate_
    Object.defineProperty(valueObj, key + '_', {
      get: function get() {
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