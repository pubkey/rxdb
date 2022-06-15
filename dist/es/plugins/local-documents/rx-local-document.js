import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import objectPath from 'object-path';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { overwritable } from '../../overwritable';
import { basePrototype, createRxDocumentConstructor } from '../../rx-document';
import { isBulkWriteConflictError, newRxError, newRxTypeError } from '../../rx-error';
import { writeSingle } from '../../rx-storage-helper';
import { clone, createRevision, flatClone, getDefaultRevision, getDefaultRxDocumentMeta, getFromObjectOrThrow } from '../../util';
import { getLocalDocStateByParent } from './local-documents-helper';

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

var RxDocumentParent = createRxDocumentConstructor();

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

var RxLocalDocumentClass = /*#__PURE__*/function (_RxDocumentParent) {
  _inheritsLoose(RxLocalDocumentClass, _RxDocumentParent);

  function RxLocalDocumentClass(id, jsonData, parent, state) {
    var _this;

    _this = _RxDocumentParent.call(this, null, jsonData) || this;
    _this.id = id;
    _this.parent = parent;
    _this.state = state;
    return _this;
  }

  return RxLocalDocumentClass;
}(RxDocumentParent);

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

var RxLocalDocumentPrototype = {
  get isLocal() {
    return true;
  },

  //
  // overwrites
  //
  _handleChangeEvent: function _handleChangeEvent(changeEvent) {
    if (changeEvent.documentId !== this.primary) {
      return;
    }

    switch (changeEvent.operation) {
      case 'UPDATE':
        var newData = changeEvent.documentData;

        this._dataSync$.next(newData);

        break;

      case 'DELETE':
        // remove from docCache to assure new upserted RxDocuments will be a new instance
        var docCache = this.state.docCache;
        docCache["delete"](this.primary);

        this._isDeleted$.next(true);

        break;
    }
  },

  get allAttachments$() {
    // this is overwritten here because we cannot re-set getters on the prototype
    throw newRxError('LD1', {
      document: this
    });
  },

  get primaryPath() {
    return 'id';
  },

  get primary() {
    return this.id;
  },

  get $() {
    return this._dataSync$.asObservable();
  },

  $emit: function $emit(changeEvent) {
    return this.parent.$emit(changeEvent);
  },
  get: function get(objPath) {
    objPath = 'data.' + objPath;

    if (!this._data) {
      return undefined;
    }

    if (typeof objPath !== 'string') {
      throw newRxTypeError('LD2', {
        objPath: objPath
      });
    }

    var valueObj = objectPath.get(this._data, objPath);
    valueObj = overwritable.deepFreezeWhenDevMode(valueObj);
    return valueObj;
  },
  get$: function get$(objPath) {
    objPath = 'data.' + objPath;

    if (objPath.includes('.item.')) {
      throw newRxError('LD3', {
        objPath: objPath
      });
    }

    if (objPath === this.primaryPath) {
      throw newRxError('LD4');
    }

    return this._dataSync$.pipe(map(function (data) {
      return objectPath.get(data, objPath);
    }), distinctUntilChanged());
  },
  atomicUpdate: function atomicUpdate(mutationFunction) {
    var _this2 = this;

    return new Promise(function (res, rej) {
      _this2._atomicQueue = _this2._atomicQueue.then(function () {
        try {
          var _temp4 = function _temp4(_result2) {
            if (_exit2) return _result2;
            res(_this2);
          };

          var _exit2 = false;
          var done = false; // we need a hacky while loop to stay incide the chain-link of _atomicQueue
          // while still having the option to run a retry on conflicts

          var _temp5 = _for(function () {
            return !_exit2 && !done;
          }, void 0, function () {
            var oldDocData = _this2._dataSync$.getValue();

            return Promise.resolve(mutationFunction(clone(oldDocData.data), _this2)).then(function (newData) {
              var _temp = _catch(function () {
                // always await because mutationFunction might be async
                var newDocData = flatClone(oldDocData);
                newDocData.data = newData;
                return Promise.resolve(_this2._saveData(newDocData, oldDocData)).then(function () {
                  done = true;
                });
              }, function (err) {
                /**
                 * conflicts cannot happen by just using RxDB in one process
                 * There are two ways they still can appear which is
                 * replication and multi-tab usage
                 * Because atomicUpdate has a mutation function,
                 * we can just re-run the mutation until there is no conflict
                 */
                var isConflict = isBulkWriteConflictError(err);

                if (isConflict) {
                  // conflict error -> retrying
                  newData._rev = createRevision(newData, isConflict.documentInDb);
                } else {
                  rej(err);
                  _exit2 = true;
                }
              });

              if (_temp && _temp.then) return _temp.then(function () {});
            });
          });

          return Promise.resolve(_temp5 && _temp5.then ? _temp5.then(_temp4) : _temp4(_temp5));
        } catch (e) {
          return Promise.reject(e);
        }
      });
    });
  },
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
  _saveData: function _saveData(newData) {
    try {
      var _this4 = this;

      return Promise.resolve(getLocalDocStateByParent(_this4.parent)).then(function (state) {
        var oldData = _this4._dataSync$.getValue();

        newData.id = _this4.id;
        return state.storageInstance.bulkWrite([{
          previous: oldData,
          document: newData
        }]).then(function (res) {
          var docResult = res.success[newData.id];

          if (!docResult) {
            throw getFromObjectOrThrow(res.error, newData.id);
          }

          newData = flatClone(newData);
          newData._rev = docResult._rev;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  },
  remove: function remove() {
    try {
      var _this6 = this;

      return Promise.resolve(getLocalDocStateByParent(_this6.parent)).then(function (state) {
        var writeData = {
          id: _this6.id,
          data: {},
          _deleted: true,
          _meta: getDefaultRxDocumentMeta(),
          _rev: getDefaultRevision(),
          _attachments: {}
        };
        return writeSingle(state.storageInstance, {
          previous: _this6._data,
          document: writeData
        }).then(function () {
          _this6.state.docCache["delete"](_this6.id);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
};
var INIT_DONE = false;

var _init = function _init() {
  if (INIT_DONE) return;else INIT_DONE = true; // add functions of RxDocument

  var docBaseProto = basePrototype;
  var props = Object.getOwnPropertyNames(docBaseProto);
  props.forEach(function (key) {
    var exists = Object.getOwnPropertyDescriptor(RxLocalDocumentPrototype, key);
    if (exists) return;
    var desc = Object.getOwnPropertyDescriptor(docBaseProto, key);
    Object.defineProperty(RxLocalDocumentPrototype, key, desc);
  });
  /**
   * Overwrite things that do not work on local documents
   * with a throwing function.
   */

  var getThrowingFun = function getThrowingFun(k) {
    return function () {
      throw newRxError('LD6', {
        functionName: k
      });
    };
  };

  ['populate', 'update', 'putAttachment', 'getAttachment', 'allAttachments'].forEach(function (k) {
    return RxLocalDocumentPrototype[k] = getThrowingFun(k);
  });
};

export function createRxLocalDocument(id, data, parent, state) {
  _init();

  var newDoc = new RxLocalDocumentClass(id, data, parent, state);
  newDoc.__proto__ = RxLocalDocumentPrototype;
  state.docCache.set(id, newDoc);
  return newDoc;
}
//# sourceMappingURL=rx-local-document.js.map