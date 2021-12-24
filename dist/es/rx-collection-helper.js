import { flatClone } from './util';
import { newRxError } from './rx-error';
import { runPluginHooks } from './hooks';
import { getSingleDocument, writeSingle } from './rx-storage-helper';
import { overwritable } from './overwritable';
/**
 * Every write access on the storage engine,
 * goes throught this method
 * so we can run hooks and resolve stuff etc.
 */

/**
 * Creates the storage instances that are used internally in the collection
 */
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

export var createRxCollectionStorageInstances = function createRxCollectionStorageInstances(collectionName, rxDatabase, storageInstanceCreationParams, instanceCreationOptions) {
  try {
    storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
    return Promise.resolve(Promise.all([rxDatabase.storage.createStorageInstance(storageInstanceCreationParams), rxDatabase.storage.createKeyObjectStorageInstance({
      databaseName: rxDatabase.name,

      /**
       * Use a different collection name for the local documents instance
       * so that the local docs can be kept while deleting the normal instance
       * after migration.
       */
      collectionName: getCollectionLocalInstanceName(collectionName),
      options: instanceCreationOptions,
      multiInstance: rxDatabase.multiInstance
    })])).then(function (_ref) {
      var storageInstance = _ref[0],
          localDocumentsStore = _ref[1];
      return {
        storageInstance: storageInstance,
        localDocumentsStore: localDocumentsStore
      };
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export var writeToStorageInstance = function writeToStorageInstance(collection, writeRow) {
  try {
    var _exit2 = false;
    var _arguments2 = arguments;
    var overwrite = _arguments2.length > 2 && _arguments2[2] !== undefined ? _arguments2[2] : false;
    var toStorageInstance = {
      previous: writeRow.previous ? _handleToStorageInstance(collection, flatClone(writeRow.previous)) : undefined,
      document: _handleToStorageInstance(collection, flatClone(writeRow.document))
    };
    return Promise.resolve(_for(function () {
      return !_exit2;
    }, void 0, function () {
      return _catch(function () {
        return Promise.resolve(collection.database.lockedRun(function () {
          return writeSingle(collection.storageInstance, toStorageInstance);
        })).then(function (writeResult) {
          // on success, just return the result
          var ret = _handleFromStorageInstance(collection, writeResult);

          _exit2 = true;
          return ret;
        });
      }, function (err) {
        var useErr = err;
        var primary = useErr.documentId;
        return function () {
          if (overwrite && useErr.status === 409) {
            // we have a conflict but must overwrite
            // so get the new revision
            return Promise.resolve(collection.database.lockedRun(function () {
              return getSingleDocument(collection.storageInstance, primary);
            })).then(function (singleRes) {
              if (!singleRes) {
                throw newRxError('SNH', {
                  args: {
                    writeRow: writeRow
                  }
                });
              }

              toStorageInstance.previous = singleRes; // now we can retry
            });
          } else if (useErr.status === 409) {
            throw newRxError('COL19', {
              collection: collection.name,
              id: primary,
              pouchDbError: useErr,
              data: writeRow
            });
          } else {
            throw useErr;
          }
        }();
      });
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * wrappers to process document data beofre/after it goes to the storage instnace.
 * Used to handle keycompression, encryption etc
 */

export function _handleToStorageInstance(col, data) {
  // ensure primary key has not been changed
  if (overwritable.isDevMode()) {
    col.schema.fillPrimaryKey(data);
  }

  data = col._crypter.encrypt(data);
  var hookParams = {
    collection: col,
    doc: data
  };
  runPluginHooks('preWriteToStorageInstance', hookParams);
  return hookParams.doc;
}
export function _handleFromStorageInstance(col, data) {
  var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var hookParams = {
    collection: col,
    doc: data
  };
  runPluginHooks('postReadFromInstance', hookParams);

  if (noDecrypt) {
    return hookParams.doc;
  }

  return col._crypter.decrypt(hookParams.doc);
}
/**
 * fills in the default data.
 * This also clones the data.
 */

export function fillObjectDataBeforeInsert(collection, data) {
  var useJson = collection.schema.fillObjectWithDefaults(data);
  useJson = collection.schema.fillPrimaryKey(useJson);
  return useJson;
}
export function getCollectionLocalInstanceName(collectionName) {
  return collectionName + '-local';
}
//# sourceMappingURL=rx-collection-helper.js.map