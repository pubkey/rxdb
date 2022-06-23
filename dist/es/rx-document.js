import objectPath from 'object-path';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { clone, trimDots, getHeightOfRevision, pluginMissing, flatClone, PROMISE_RESOLVE_NULL, PROMISE_RESOLVE_VOID, ensureNotFalsy, createRevision } from './util';
import { newRxError, newRxTypeError, isBulkWriteConflictError } from './rx-error';
import { runPluginHooks } from './hooks';
import { getDocumentDataOfRxChangeEvent } from './rx-change-event';
import { overwritable } from './overwritable';
import { getSchemaByObjectPath } from './rx-schema-helper';
import { throwIfIsStorageWriteError } from './rx-storage-helper';

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

    return _this._dataSync$.asObservable().pipe(map(function (docData) {
      return overwritable.deepFreezeWhenDevMode(docData);
    }));
  },

  _handleChangeEvent: function _handleChangeEvent(changeEvent) {
    if (changeEvent.documentId !== this.primary) {
      return;
    } // ensure that new _rev is higher then current


    var docData = getDocumentDataOfRxChangeEvent(changeEvent);
    var newRevNr = getHeightOfRevision(docData._rev);
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

        this._isDeleted$.next(true);

        break;
    }
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

    var schemaObj = getSchemaByObjectPath(this.collection.schema.jsonSchema, path);

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
    var schemaObj = getSchemaByObjectPath(this.collection.schema.jsonSchema, path);
    var value = this.get(path);

    if (!value) {
      return PROMISE_RESOLVE_NULL;
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
    var valueObj = objectPath.get(this._data, objPath); // direct return if array or non-object

    if (typeof valueObj !== 'object' || Array.isArray(valueObj)) {
      return overwritable.deepFreezeWhenDevMode(valueObj);
    }
    /**
     * TODO find a way to deep-freeze together with defineGetterSetter
     * so we do not have to do a deep clone here.
     */


    valueObj = clone(valueObj);
    defineGetterSetter(this.collection.schema, valueObj, objPath, this);
    return valueObj;
  },
  toJSON: function toJSON() {
    var withMetaFields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

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
  toMutableJSON: function toMutableJSON() {
    var withMetaFields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    return clone(this.toJSON(withMetaFields));
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
      _this2._atomicQueue = _this2._atomicQueue.then(function () {
        try {
          var _temp6 = function _temp6(_result3) {
            if (_exit2) return _result3;
            res(_this2);
          };

          var _exit2 = false;
          var done = false; // we need a hacky while loop to stay incide the chain-link of _atomicQueue
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

                var isConflict = isBulkWriteConflictError(useError);

                if (isConflict) {
                  // conflict error -> retrying
                  newData._rev = createRevision(newData, isConflict.documentInDb);
                } else {
                  rej(useError);
                  _exit2 = true;
                }
              });

              if (_temp && _temp.then) return _temp.then(function () {});
            }

            var oldData = _this2._dataSync$.getValue(); // always await because mutationFunction might be async


            var newData;

            var _temp2 = _catch(function () {
              return Promise.resolve(mutationFunction(clone(oldData), _this2)).then(function (_mutationFunction) {
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

      newData = flatClone(newData); // deleted documents cannot be changed

      if (_this4._isDeleted$.getValue()) {
        throw newRxError('DOC11', {
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


      newData._meta = Object.assign({}, oldData._meta, newData._meta); // ensure modifications are ok

      if (overwritable.isDevMode()) {
        _this4.collection.schema.validateChange(oldData, newData);
      }

      return Promise.resolve(_this4.collection._runHooks('pre', 'save', newData, _this4)).then(function () {
        newData._rev = createRevision(newData, oldData);

        _this4.collection.schema.validate(newData);

        return Promise.resolve(_this4.collection.storageInstance.bulkWrite([{
          previous: oldData,
          document: newData
        }])).then(function (writeResult) {
          var isError = writeResult.error[_this4.primary];
          throwIfIsStorageWriteError(_this4.collection, _this4.primary, newData, isError);
          return _this4.collection._runHooks('post', 'save', newData, _this4);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  },

  /**
   * saves the temporary document and makes a non-temporary out of it
   * Saving a temporary doc is basically the same as RxCollection.insert()
   * @return false if nothing to save
   */
  save: function save() {
    var _this5 = this;

    // .save() cannot be called on non-temporary-documents
    if (!this._isTemporary) {
      throw newRxError('DOC17', {
        id: this.primary,
        document: this
      });
    }

    return this.collection.insert(this).then(function () {
      _this5._isTemporary = false;

      _this5.collection._docCache.set(_this5.primary, _this5); // internal events


      _this5._dataSync$.next(_this5._data);

      return true;
    });
  },

  /**
   * remove the document,
   * this not not equal to a pouchdb.remove(),
   * instead we keep the values and only set _deleted: true
   */
  remove: function remove() {
    var _this6 = this;

    var collection = this.collection;

    if (this.deleted) {
      return Promise.reject(newRxError('DOC13', {
        document: this,
        id: this.primary
      }));
    }

    var deletedData = flatClone(this._data);
    return collection._runHooks('pre', 'remove', deletedData, this).then(function () {
      try {
        deletedData._deleted = true;
        deletedData._rev = createRevision(deletedData, _this6._data);
        return Promise.resolve(collection.storageInstance.bulkWrite([{
          previous: _this6._data,
          document: deletedData
        }])).then(function (writeResult) {
          var isError = writeResult.error[_this6.primary];
          throwIfIsStorageWriteError(collection, _this6.primary, deletedData, isError);
          return ensureNotFalsy(writeResult.success[_this6.primary]);
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }).then(function () {
      return _this6.collection._runHooks('post', 'remove', deletedData, _this6);
    }).then(function () {
      return _this6;
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
    this._isDeleted$ = new BehaviorSubject(false);
    this._atomicQueue = PROMISE_RESOLVE_VOID;
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
  var pathProperties = getSchemaByObjectPath(schema.jsonSchema, objPath);
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
  var primary = jsonData[collection.schema.primaryPath];

  if (primary && primary.startsWith('_design')) {
    return null;
  }

  var doc = new constructor(collection, jsonData);
  runPluginHooks('createRxDocument', doc);
  return doc;
}
export function isRxDocument(obj) {
  if (typeof obj === 'undefined') return false;
  return !!obj.isInstanceOfRxDocument;
}
//# sourceMappingURL=rx-document.js.map