/**
 * This plugin contains the primitives to create
 * a RxDB client-server replication.
 * It is used in the other replication plugins
 * but also can be used as standalone with a custom replication handler.
 */

import { BehaviorSubject, combineLatest, mergeMap, Subject } from 'rxjs';
import { ensureNotFalsy, fastUnsecureHash, flatClone, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_TRUE } from '../../util';
import { awaitRxStorageReplicationFirstInSync, awaitRxStorageReplicationInSync, cancelRxStorageReplication, replicateRxStorageInstance, RX_REPLICATION_META_INSTANCE_SCHEMA } from '../../replication-protocol';
import { newRxError } from '../../rx-error';
import { awaitRetry, DEFAULT_MODIFIER, swapDefaultDeletedTodeletedField, swapdeletedFieldToDefaultDeleted } from './replication-helper';
import { addConnectedStorageToCollection } from '../../rx-database-internal-store';
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
export var REPLICATION_STATE_BY_COLLECTION = new WeakMap();
export var RxReplicationState = /*#__PURE__*/function () {
  function RxReplicationState(
  /**
   * hash of the identifier, used to flag revisions
   * and to identify which documents state came from the remote.
   */
  replicationIdentifierHash, collection, deletedField, pull, push, live, retryTime, autoStart) {
    var _this = this;
    this.subs = [];
    this.subjects = {
      received: new Subject(),
      // all documents that are received from the endpoint
      send: new Subject(),
      // all documents that are send to the endpoint
      error: new Subject(),
      // all errors that are received from the endpoint, emits new Error() objects
      canceled: new BehaviorSubject(false),
      // true when the replication was canceled
      active: new BehaviorSubject(false),
      // true when something is running, false when not
      initialReplicationComplete: new BehaviorSubject(false) // true the initial replication-cycle is over
    };
    this.received$ = this.subjects.received.asObservable();
    this.send$ = this.subjects.send.asObservable();
    this.error$ = this.subjects.error.asObservable();
    this.canceled$ = this.subjects.canceled.asObservable();
    this.active$ = this.subjects.active.asObservable();
    this.callOnStart = undefined;
    this.remoteEvents$ = new Subject();
    this.replicationIdentifierHash = replicationIdentifierHash;
    this.collection = collection;
    this.deletedField = deletedField;
    this.pull = pull;
    this.push = push;
    this.live = live;
    this.retryTime = retryTime;
    this.autoStart = autoStart;
    var replicationStates = REPLICATION_STATE_BY_COLLECTION.get(collection);
    if (!replicationStates) {
      replicationStates = [];
      REPLICATION_STATE_BY_COLLECTION.set(collection, replicationStates);
    }
    replicationStates.push(this);

    // stop the replication when the collection gets destroyed
    this.collection.onDestroy.push(function () {
      return _this.cancel();
    });

    // create getters for the observables
    Object.keys(this.subjects).forEach(function (key) {
      Object.defineProperty(_this, key + '$', {
        get: function get() {
          return this.subjects[key].asObservable();
        }
      });
    });
    var startPromise = new Promise(function (res) {
      _this.callOnStart = res;
    });
    this.startPromise = startPromise;
  }
  var _proto = RxReplicationState.prototype;
  _proto.start = function start() {
    try {
      var _this2 = this;
      if (_this2.isStopped()) {
        return Promise.resolve();
      }

      // fill in defaults for pull & push
      var pullModifier = _this2.pull && _this2.pull.modifier ? _this2.pull.modifier : DEFAULT_MODIFIER;
      var pushModifier = _this2.push && _this2.push.modifier ? _this2.push.modifier : DEFAULT_MODIFIER;
      var database = _this2.collection.database;
      var metaInstanceCollectionName = _this2.collection.name + '-rx-replication-' + _this2.replicationIdentifierHash;
      return Promise.resolve(Promise.all([_this2.collection.database.storage.createStorageInstance({
        databaseName: database.name,
        collectionName: metaInstanceCollectionName,
        databaseInstanceToken: database.token,
        multiInstance: database.multiInstance,
        // TODO is this always false?
        options: {},
        schema: RX_REPLICATION_META_INSTANCE_SCHEMA
      }), addConnectedStorageToCollection(_this2.collection, metaInstanceCollectionName, RX_REPLICATION_META_INSTANCE_SCHEMA)])).then(function (_ref) {
        var metaInstance = _ref[0];
        function _temp2() {
          _this2.callOnStart();
        }
        _this2.metaInstance = metaInstance;
        _this2.internalReplicationState = replicateRxStorageInstance({
          pushBatchSize: _this2.push && _this2.push.batchSize ? _this2.push.batchSize : 100,
          pullBatchSize: _this2.pull && _this2.pull.batchSize ? _this2.pull.batchSize : 100,
          forkInstance: _this2.collection.storageInstance,
          metaInstance: _this2.metaInstance,
          hashFunction: database.hashFunction,
          identifier: 'rx-replication-' + _this2.replicationIdentifierHash,
          conflictHandler: _this2.collection.conflictHandler,
          replicationHandler: {
            masterChangeStream$: _this2.remoteEvents$.asObservable().pipe(mergeMap(function (ev) {
              try {
                if (ev === 'RESYNC') {
                  return Promise.resolve(ev);
                }
                var useEv = flatClone(ev);
                if (_this2.deletedField !== '_deleted') {
                  useEv.documents = useEv.documents.map(function (doc) {
                    return swapdeletedFieldToDefaultDeleted(_this2.deletedField, doc);
                  });
                }
                return Promise.resolve(Promise.all(useEv.documents.map(function (d) {
                  return pullModifier(d);
                }))).then(function (_Promise$all) {
                  useEv.documents = _Promise$all;
                  return useEv;
                });
              } catch (e) {
                return Promise.reject(e);
              }
            })),
            masterChangesSince: function (checkpoint, batchSize) {
              try {
                var _temp5 = function _temp5() {
                  if (_this2.isStopped()) {
                    return {
                      checkpoint: null,
                      documents: []
                    };
                  }
                  var useResult = flatClone(result);
                  if (_this2.deletedField !== '_deleted') {
                    useResult.documents = useResult.documents.map(function (doc) {
                      return swapdeletedFieldToDefaultDeleted(_this2.deletedField, doc);
                    });
                  }
                  return Promise.resolve(Promise.all(useResult.documents.map(function (d) {
                    return pullModifier(d);
                  }))).then(function (_Promise$all2) {
                    useResult.documents = _Promise$all2;
                    return useResult;
                  });
                };
                if (!_this2.pull) {
                  return Promise.resolve({
                    checkpoint: null,
                    documents: []
                  });
                }

                /**
                 * Retries must be done here in the replication primitives plugin,
                 * because the replication protocol itself has no
                 * error handling.
                 */
                var done = false;
                var result = {};
                var _temp4 = _for(function () {
                  return !done && !_this2.isStopped();
                }, void 0, function () {
                  var _temp3 = _catch(function () {
                    return Promise.resolve(_this2.pull.handler(checkpoint, batchSize)).then(function (_this2$pull$handler) {
                      result = _this2$pull$handler;
                      done = true;
                    });
                  }, function (err) {
                    var emitError = newRxError('RC_PULL', {
                      checkpoint: checkpoint,
                      errors: Array.isArray(err) ? err : [err],
                      direction: 'pull'
                    });
                    _this2.subjects.error.next(emitError);
                    return Promise.resolve(awaitRetry(_this2.collection, ensureNotFalsy(_this2.retryTime))).then(function () {});
                  });
                  if (_temp3 && _temp3.then) return _temp3.then(function () {});
                });
                return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp5) : _temp5(_temp4));
              } catch (e) {
                return Promise.reject(e);
              }
            },
            masterWrite: function (rows) {
              try {
                if (!_this2.push) {
                  return Promise.resolve([]);
                }
                var done = false;
                return Promise.resolve(Promise.all(rows.map(function (row) {
                  try {
                    return Promise.resolve(pushModifier(row.newDocumentState)).then(function (_pushModifier) {
                      function _temp9() {
                        if (_this2.deletedField !== '_deleted') {
                          row.newDocumentState = swapDefaultDeletedTodeletedField(_this2.deletedField, row.newDocumentState);
                          if (row.assumedMasterState) {
                            row.assumedMasterState = swapDefaultDeletedTodeletedField(_this2.deletedField, row.assumedMasterState);
                          }
                        }
                        return row;
                      }
                      row.newDocumentState = _pushModifier;
                      var _temp8 = function () {
                        if (row.assumedMasterState) {
                          return Promise.resolve(pushModifier(row.assumedMasterState)).then(function (_pushModifier2) {
                            row.assumedMasterState = _pushModifier2;
                          });
                        }
                      }();
                      return _temp8 && _temp8.then ? _temp8.then(_temp9) : _temp9(_temp8);
                    });
                  } catch (e) {
                    return Promise.reject(e);
                  }
                }))).then(function (useRows) {
                  var _exit = false;
                  function _temp7(_result2) {
                    if (_exit) return _result2;
                    if (_this2.isStopped()) {
                      return [];
                    }
                    var conflicts = ensureNotFalsy(result).map(function (doc) {
                      return swapdeletedFieldToDefaultDeleted(_this2.deletedField, doc);
                    });
                    return conflicts;
                  }
                  var result = null;
                  var _temp6 = _for(function () {
                    return !_exit && !done && !_this2.isStopped();
                  }, void 0, function () {
                    return _catch(function () {
                      return Promise.resolve(_this2.push.handler(useRows)).then(function (_this2$push$handler) {
                        result = _this2$push$handler;
                        /**
                         * It is a common problem that people have wrongly behaving backend
                         * that do not return an array with the conflicts on push requests.
                         * So we run this check here to make it easier to debug.
                         * @link https://github.com/pubkey/rxdb/issues/4103
                         */
                        if (!Array.isArray(result)) {
                          throw newRxError('RC_PUSH_NO_AR', {
                            pushRows: rows,
                            direction: 'push',
                            args: {
                              result: result
                            }
                          });
                        }
                        done = true;
                      });
                    }, function (err) {
                      var emitError = err.rxdb ? err : newRxError('RC_PUSH', {
                        pushRows: rows,
                        errors: Array.isArray(err) ? err : [err],
                        direction: 'push'
                      });
                      _this2.subjects.error.next(emitError);
                      return Promise.resolve(awaitRetry(_this2.collection, ensureNotFalsy(_this2.retryTime))).then(function () {});
                    });
                  });
                  return _temp6 && _temp6.then ? _temp6.then(_temp7) : _temp7(_temp6);
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }
          }
        });
        _this2.subs.push(_this2.internalReplicationState.events.error.subscribe(function (err) {
          _this2.subjects.error.next(err);
        }), _this2.internalReplicationState.events.processed.down.subscribe(function (row) {
          return _this2.subjects.received.next(row.document);
        }), _this2.internalReplicationState.events.processed.up.subscribe(function (writeToMasterRow) {
          _this2.subjects.send.next(writeToMasterRow.newDocumentState);
        }), combineLatest([_this2.internalReplicationState.events.active.down, _this2.internalReplicationState.events.active.up]).subscribe(function (_ref2) {
          var down = _ref2[0],
            up = _ref2[1];
          var isActive = down || up;
          _this2.subjects.active.next(isActive);
        }));
        if (_this2.pull && _this2.pull.stream$ && _this2.live) {
          _this2.subs.push(_this2.pull.stream$.subscribe({
            next: function next(ev) {
              _this2.remoteEvents$.next(ev);
            },
            error: function error(err) {
              _this2.subjects.error.next(err);
            }
          }));
        }

        /**
         * Non-live replications run once
         * and then automatically get canceled.
         */
        var _temp = function () {
          if (!_this2.live) {
            return Promise.resolve(awaitRxStorageReplicationFirstInSync(_this2.internalReplicationState)).then(function () {
              return Promise.resolve(awaitRxStorageReplicationInSync(_this2.internalReplicationState)).then(function () {
                return Promise.resolve(_this2.cancel()).then(function () {});
              });
            });
          }
        }();
        return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.isStopped = function isStopped() {
    if (this.subjects.canceled.getValue()) {
      return true;
    }
    return false;
  };
  _proto.awaitInitialReplication = function awaitInitialReplication() {
    try {
      var _this3 = this;
      return Promise.resolve(_this3.startPromise).then(function () {
        return awaitRxStorageReplicationFirstInSync(ensureNotFalsy(_this3.internalReplicationState));
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * Returns a promise that resolves when:
   * - All local data is replicated with the remote
   * - No replication cycle is running or in retry-state
   *
   * WARNING: USing this function directly in a multi-tab browser application
   * is dangerous because only the leading instance will ever be replicated,
   * so this promise will not resolve in the other tabs.
   * For multi-tab support you should set and observe a flag in a local document.
   */
  ;
  _proto.awaitInSync = function awaitInSync() {
    try {
      var _this4 = this;
      return Promise.resolve(_this4.startPromise).then(function () {
        return Promise.resolve(awaitRxStorageReplicationFirstInSync(ensureNotFalsy(_this4.internalReplicationState))).then(function () {
          /**
           * Often awaitInSync() is called directly after a document write,
           * like in the unit tests.
           * So we first have to await the idleness to ensure that all RxChangeEvents
           * are processed already.
           */
          return Promise.resolve(_this4.collection.database.requestIdlePromise()).then(function () {
            return Promise.resolve(awaitRxStorageReplicationInSync(ensureNotFalsy(_this4.internalReplicationState))).then(function () {
              return true;
            });
          });
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.reSync = function reSync() {
    this.remoteEvents$.next('RESYNC');
  };
  _proto.emitEvent = function emitEvent(ev) {
    this.remoteEvents$.next(ev);
  };
  _proto.cancel = function cancel() {
    var _this5 = this;
    if (this.isStopped()) {
      return PROMISE_RESOLVE_FALSE;
    }
    var promises = [];
    if (this.internalReplicationState) {
      cancelRxStorageReplication(this.internalReplicationState);
    }
    if (this.metaInstance) {
      promises.push(ensureNotFalsy(this.internalReplicationState).checkpointQueue.then(function () {
        return ensureNotFalsy(_this5.metaInstance).close();
      }));
    }
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    this.subjects.canceled.next(true);
    this.subjects.active.complete();
    this.subjects.canceled.complete();
    this.subjects.error.complete();
    this.subjects.received.complete();
    this.subjects.send.complete();
    return Promise.all(promises);
  };
  return RxReplicationState;
}();
export function replicateRxCollection(_ref3) {
  var replicationIdentifier = _ref3.replicationIdentifier,
    collection = _ref3.collection,
    _ref3$deletedField = _ref3.deletedField,
    deletedField = _ref3$deletedField === void 0 ? '_deleted' : _ref3$deletedField,
    pull = _ref3.pull,
    push = _ref3.push,
    _ref3$live = _ref3.live,
    live = _ref3$live === void 0 ? true : _ref3$live,
    _ref3$retryTime = _ref3.retryTime,
    retryTime = _ref3$retryTime === void 0 ? 1000 * 5 : _ref3$retryTime,
    _ref3$waitForLeadersh = _ref3.waitForLeadership,
    waitForLeadership = _ref3$waitForLeadersh === void 0 ? true : _ref3$waitForLeadersh,
    _ref3$autoStart = _ref3.autoStart,
    autoStart = _ref3$autoStart === void 0 ? true : _ref3$autoStart;
  var replicationIdentifierHash = fastUnsecureHash([collection.database.name, collection.name, replicationIdentifier].join('|'));
  var replicationState = new RxReplicationState(replicationIdentifierHash, collection, deletedField, pull, push, live, retryTime, autoStart);
  startReplicationOnLeaderShip(waitForLeadership, replicationState);
  return replicationState;
}
export function startReplicationOnLeaderShip(waitForLeadership, replicationState) {
  /**
   * Always await this Promise to ensure that the current instance
   * is leader when waitForLeadership=true
   */
  var mustWaitForLeadership = waitForLeadership && replicationState.collection.database.multiInstance;
  var waitTillRun = mustWaitForLeadership ? replicationState.collection.database.waitForLeadership() : PROMISE_RESOLVE_TRUE;
  return waitTillRun.then(function () {
    if (replicationState.isStopped()) {
      return;
    }
    if (replicationState.autoStart) {
      replicationState.start();
    }
  });
}
//# sourceMappingURL=index.js.map