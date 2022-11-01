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
var _objectPath = _interopRequireDefault(require("object-path"));
var _rxjs = require("rxjs");
var _operators = require("rxjs/operators");
var _util = require("./util");
var _rxError = require("./rx-error");
var _hooks = require("./hooks");
var _rxChangeEvent = require("./rx-change-event");
var _overwritable = require("./overwritable");
var _rxSchemaHelper = require("./rx-schema-helper");
var _rxStorageHelper = require("./rx-storage-helper");
function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }
        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }
    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }
    pact.s = state;
    pact.v = value;
    var observer = pact.o;
    if (observer) {
      observer(pact);
    }
  }
}
var _Pact = /*#__PURE__*/function () {
  function _Pact() {}
  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;
    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;
      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }
        return result;
      } else {
        return this;
      }
    }
    this.o = function (_this) {
      try {
        var value = _this.v;
        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };
    return result;
  };
  return _Pact;
}();
function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}
function _for(test, update, body) {
  var stage;
  for (;;) {
    var shouldContinue = test();
    if (_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }
    if (!shouldContinue) {
      return result;
    }
    if (shouldContinue.then) {
      stage = 0;
      break;
    }
    var result = body();
    if (result && result.then) {
      if (_isSettledPact(result)) {
        result = result.s;
      } else {
        stage = 1;
        break;
      }
    }
    if (update) {
      var updateValue = update();
      if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
        stage = 2;
        break;
      }
    }
  }
  var pact = new _Pact();
  var reject = _settle.bind(null, pact, 2);
  (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
  return pact;
  function _resumeAfterBody(value) {
    result = value;
    do {
      if (update) {
        updateValue = update();
        if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
          updateValue.then(_resumeAfterUpdate).then(void 0, reject);
          return;
        }
      }
      shouldContinue = test();
      if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.v) {
        _settle(pact, 1, result);
        return;
      }
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }
      result = body();
      if (_isSettledPact(result)) {
        result = result.v;
      }
    } while (!result || !result.then);
    result.then(_resumeAfterBody).then(void 0, reject);
  }
  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      result = body();
      if (result && result.then) {
        result.then(_resumeAfterBody).then(void 0, reject);
      } else {
        _resumeAfterBody(result);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
  function _resumeAfterUpdate() {
    if (shouldContinue = test()) {
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _resumeAfterTest(shouldContinue);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
}
var basePrototype = {
  /**
   * TODO
   * instead of appliying the _this-hack
   * we should make these accessors functions instead of getters.
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
    return _this._dataSync$.pipe((0, _operators.map)(function (d) {
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
    }

    // ensure that new _rev is higher then current
    var docData = (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent);
    var newRevNr = (0, _util.getHeightOfRevision)(docData._rev);
    var currentRevNr = (0, _util.getHeightOfRevision)(this._data._rev);
    if (currentRevNr > newRevNr) return;
    switch (changeEvent.operation) {
      case 'INSERT':
        break;
      case 'UPDATE':
        this._dataSync$.next(changeEvent.documentData);
        break;
      case 'DELETE':
        // remove from docCache to assure new upserted RxDocuments will be a new instance
        this.collection._docCache["delete"](this.primary);
        this._dataSync$.next(changeEvent.documentData);
        break;
    }
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
    if (path === this.primaryPath) throw (0, _rxError.newRxError)('DOC2');

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
      return _util.PROMISE_RESOLVE_NULL;
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
    var valueObj = _objectPath["default"].get(this._data, objPath);

    // direct return if array or non-object
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
    var withMetaFields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    if (!withMetaFields) {
      var data = (0, _util.flatClone)(this._data);
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
    return (0, _util.clone)(this.toJSON(withMetaFields));
  },
  /**
   * updates document
   * @overwritten by plugin (optional)
   * @param updateObj mongodb-like syntax
   */
  update: function update(_updateObj) {
    throw (0, _util.pluginMissing)('update');
  },
  updateCRDT: function updateCRDT(_updateObj) {
    throw (0, _util.pluginMissing)('crdt');
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
  atomicUpdate: function atomicUpdate(mutationFunction,
  // used by some plugins that wrap the method
  _context) {
    var _this2 = this;
    return new Promise(function (res, rej) {
      _this2._atomicQueue = _this2._atomicQueue.then(function () {
        try {
          var _temp6 = function _temp6(_result3) {
            if (_exit2) return _result3;
            res(_this2);
          };
          var _exit2 = false;
          var done = false;
          // we need a hacky while loop to stay incide the chain-link of _atomicQueue
          // while still having the option to run a retry on conflicts
          var _temp7 = _for(function () {
            return !_exit2 && !done;
          }, void 0, function () {
            function _temp3(_result) {
              if (_exit2) return _result;
              var _temp = _catch(function () {
                return Promise.resolve(_this2._saveData(newData, oldData)).then(function () {
                  done = true;
                });
              }, function (err) {
                var useError = err.parameters && err.parameters.error ? err.parameters.error : err;
                /**
                 * conflicts cannot happen by just using RxDB in one process
                 * There are two ways they still can appear which is
                 * replication and multi-tab usage
                 * Because atomicUpdate has a mutation function,
                 * we can just re-run the mutation until there is no conflict
                 */
                var isConflict = (0, _rxError.isBulkWriteConflictError)(useError);
                if (isConflict) {} else {
                  rej(useError);
                  _exit2 = true;
                }
              });
              if (_temp && _temp.then) return _temp.then(function () {});
            }
            var oldData = _this2._dataSync$.getValue();
            // always await because mutationFunction might be async
            var newData;
            var _temp2 = _catch(function () {
              return Promise.resolve(mutationFunction((0, _util.clone)(oldData), _this2)).then(function (_mutationFunction) {
                newData = _mutationFunction;
                if (_this2.collection) {
                  newData = _this2.collection.schema.fillObjectWithDefaults(newData);
                }
              });
            }, function (err) {
              rej(err);
              _exit2 = true;
            });
            return _temp2 && _temp2.then ? _temp2.then(_temp3) : _temp3(_temp2);
          });
          return Promise.resolve(_temp7 && _temp7.then ? _temp7.then(_temp6) : _temp6(_temp7));
        } catch (e) {
          return Promise.reject(e);
        }
      });
    });
  },
  /**
   * patches the given properties
   */
  atomicPatch: function atomicPatch(patch) {
    return this.atomicUpdate(function (docData) {
      Object.entries(patch).forEach(function (_ref) {
        var k = _ref[0],
          v = _ref[1];
        docData[k] = v;
      });
      return docData;
    });
  },
  /**
   * saves the new document-data
   * and handles the events
   */
  _saveData: function _saveData(newData, oldData) {
    try {
      var _this4 = this;
      newData = (0, _util.flatClone)(newData);

      // deleted documents cannot be changed
      if (_this4._data._deleted) {
        throw (0, _rxError.newRxError)('DOC11', {
          id: _this4.primary,
          document: _this4
        });
      }

      /**
       * Meta values must always be merged
       * instead of overwritten.
       * This ensures that different plugins do not overwrite
       * each others meta properties.
       */
      newData._meta = Object.assign({}, oldData._meta, newData._meta);

      // ensure modifications are ok
      if (_overwritable.overwritable.isDevMode()) {
        _this4.collection.schema.validateChange(oldData, newData);
      }
      return Promise.resolve(_this4.collection._runHooks('pre', 'save', newData, _this4)).then(function () {
        return Promise.resolve(_this4.collection.storageInstance.bulkWrite([{
          previous: oldData,
          document: newData
        }], 'rx-document-save-data')).then(function (writeResult) {
          var isError = writeResult.error[_this4.primary];
          (0, _rxStorageHelper.throwIfIsStorageWriteError)(_this4.collection, _this4.primary, newData, isError);
          return _this4.collection._runHooks('post', 'save', newData, _this4);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  },
  /**
   * remove the document,
   * this not not equal to a pouchdb.remove(),
   * instead we keep the values and only set _deleted: true
   */
  remove: function remove() {
    var _this5 = this;
    var collection = this.collection;
    if (this.deleted) {
      return Promise.reject((0, _rxError.newRxError)('DOC13', {
        document: this,
        id: this.primary
      }));
    }
    var deletedData = (0, _util.flatClone)(this._data);
    return collection._runHooks('pre', 'remove', deletedData, this).then(function () {
      try {
        deletedData._deleted = true;
        return Promise.resolve(collection.storageInstance.bulkWrite([{
          previous: _this5._data,
          document: deletedData
        }], 'rx-document-remove')).then(function (writeResult) {
          var isError = writeResult.error[_this5.primary];
          (0, _rxStorageHelper.throwIfIsStorageWriteError)(collection, _this5.primary, deletedData, isError);
          return (0, _util.ensureNotFalsy)(writeResult.success[_this5.primary]);
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }).then(function () {
      return _this5.collection._runHooks('post', 'remove', deletedData, _this5);
    }).then(function () {
      return _this5;
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
    this.collection = collection;

    // assume that this is always equal to the doc-data in the database
    this._dataSync$ = new _rxjs.BehaviorSubject(jsonData);
    this._atomicQueue = _util.PROMISE_RESOLVE_VOID;

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
    var fullPath = (0, _util.trimDots)(objPath + '.' + key);

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
  var primary = jsonData[collection.schema.primaryPath];
  if (primary && primary.startsWith('_design')) {
    return null;
  }
  var doc = new constructor(collection, jsonData);
  (0, _hooks.runPluginHooks)('createRxDocument', doc);
  return doc;
}
function isRxDocument(obj) {
  if (typeof obj === 'undefined') return false;
  return !!obj.isInstanceOfRxDocument;
}
//# sourceMappingURL=rx-document.js.map