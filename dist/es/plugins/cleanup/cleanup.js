import { PROMISE_RESOLVE_TRUE } from '../../util';
import { REPLICATION_STATE_BY_COLLECTION } from '../replication';
import { DEFAULT_CLEANUP_POLICY } from './cleanup-helper';

/**
 * Even on multiple databases,
 * the calls to RxStorage().cleanup()
 * must never run in parallel.
 * The cleanup is a background task which should
 * not affect the performance of other, more important tasks.
 */

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
    const observer = pact.o;
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
export var runCleanupAfterDelete = function runCleanupAfterDelete(rxCollection, cleanupPolicy) {
  try {
    var _exit4 = false;
    return Promise.resolve(_for(function () {
      return !_exit4 && !rxCollection.destroyed;
    }, void 0, function () {
      return Promise.resolve(rxCollection.promiseWait(cleanupPolicy.runEach)).then(function () {
        if (rxCollection.destroyed) {
          _exit4 = true;
          return;
        }
        return Promise.resolve(cleanupRxCollection(rxCollection, cleanupPolicy)).then(function () {});
      });
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Runs the cleanup for a single RxCollection
 */
export var cleanupRxCollection = function cleanupRxCollection(rxCollection, cleanupPolicy) {
  try {
    var _exit2 = false;
    var rxDatabase = rxCollection.database;
    var storageInstance = rxCollection.storageInstance;

    // run cleanup() until it returns true
    var isDone = false;
    return Promise.resolve(_for(function () {
      return !_exit2 && !isDone && !rxCollection.destroyed;
    }, void 0, function () {
      function _temp3() {
        return Promise.resolve(rxDatabase.requestIdlePromise()).then(function () {
          if (rxCollection.destroyed) {
            _exit2 = true;
            return;
          }
          RXSOTRAGE_CLEANUP_QUEUE = RXSOTRAGE_CLEANUP_QUEUE.then(function () {
            if (rxCollection.destroyed) {
              return true;
            }
            return storageInstance.cleanup(cleanupPolicy.minimumDeletedTime);
          });
          return Promise.resolve(RXSOTRAGE_CLEANUP_QUEUE).then(function (_RXSOTRAGE_CLEANUP_QU) {
            isDone = _RXSOTRAGE_CLEANUP_QU;
          });
        });
      }
      var _temp2 = function () {
        if (cleanupPolicy.awaitReplicationsInSync) {
          var replicationStates = REPLICATION_STATE_BY_COLLECTION.get(rxCollection);
          var _temp4 = function () {
            if (replicationStates) {
              return Promise.resolve(Promise.all(replicationStates.map(function (replicationState) {
                if (!replicationState.isStopped()) {
                  return replicationState.awaitInSync();
                }
              }))).then(function () {});
            }
          }();
          if (_temp4 && _temp4.then) return _temp4.then(function () {});
        }
      }();
      return _temp2 && _temp2.then ? _temp2.then(_temp3) : _temp3(_temp2);
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};
export var startCleanupForRxCollection = function startCleanupForRxCollection(rxCollection) {
  try {
    var rxDatabase = rxCollection.database;
    var cleanupPolicy = Object.assign({}, DEFAULT_CLEANUP_POLICY, rxDatabase.cleanupPolicy ? rxDatabase.cleanupPolicy : {});

    /**
     * Wait until minimumDatabaseInstanceAge is reached
     * or collection is destroyed.
     */
    return Promise.resolve(rxCollection.promiseWait(cleanupPolicy.minimumCollectionAge)).then(function () {
      if (rxCollection.destroyed) {
        return;
      }
      return Promise.resolve(cleanupPolicy.waitForLeadership).then(function (_cleanupPolicy$waitFo) {
        _cleanupPolicy$waitFo ? rxDatabase.waitForLeadership() : PROMISE_RESOLVE_TRUE;
        if (rxCollection.destroyed) {
          return;
        }

        // initially cleanup the collection
        return Promise.resolve(cleanupRxCollection(rxCollection, cleanupPolicy)).then(function () {
          /**
           * Afterwards we listen to deletes
           * and only re-run the cleanup after
           * minimumDeletedTime is reached.
           */
          return Promise.resolve(runCleanupAfterDelete(rxCollection, cleanupPolicy)).then(function () {});
        });
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var RXSOTRAGE_CLEANUP_QUEUE = PROMISE_RESOLVE_TRUE;
//# sourceMappingURL=cleanup.js.map