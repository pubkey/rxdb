"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxReplicationState = exports.REPLICATION_STATE_BY_COLLECTION = void 0;
exports.replicateRxCollection = replicateRxCollection;
exports.startReplicationOnLeaderShip = startReplicationOnLeaderShip;
exports.swapDefaultDeletedTodeletedField = swapDefaultDeletedTodeletedField;
exports.swapdeletedFieldToDefaultDeleted = swapdeletedFieldToDefaultDeleted;

var _rxjs = require("rxjs");

var _util = require("../../util");

var _replicationProtocol = require("../../replication-protocol");

var _rxError = require("../../rx-error");

var _replicationHelper = require("./replication-helper");

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

/**
 * This plugin contains the primitives to create
 * a RxDB client-server replication.
 * It is used in the other replication plugins
 * but also can be used as standalone with a custom replication handler.
 */
var REPLICATION_STATE_BY_COLLECTION = new WeakMap();
exports.REPLICATION_STATE_BY_COLLECTION = REPLICATION_STATE_BY_COLLECTION;

var RxReplicationState = /*#__PURE__*/function () {
  function RxReplicationState(
  /**
   * hash of the identifier, used to flag revisions
   * and to identify which documents state came from the remote.
   */
  replicationIdentifierHash, collection, deletedField, pull, push, live, retryTime, autoStart) {
    var _this = this;

    this.subs = [];
    this.subjects = {
      received: new _rxjs.Subject(),
      // all documents that are received from the endpoint
      send: new _rxjs.Subject(),
      // all documents that are send to the endpoint
      error: new _rxjs.Subject(),
      // all errors that are received from the endpoint, emits new Error() objects
      canceled: new _rxjs.BehaviorSubject(false),
      // true when the replication was canceled
      active: new _rxjs.BehaviorSubject(false),
      // true when something is running, false when not
      initialReplicationComplete: new _rxjs.BehaviorSubject(false) // true the initial replication-cycle is over

    };
    this.received$ = this.subjects.received.asObservable();
    this.send$ = this.subjects.send.asObservable();
    this.error$ = this.subjects.error.asObservable();
    this.canceled$ = this.subjects.canceled.asObservable();
    this.active$ = this.subjects.active.asObservable();
    this.callOnStart = undefined;
    this.remoteEvents$ = new _rxjs.Subject();
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

    replicationStates.push(this); // stop the replication when the collection gets destroyed

    this.collection.onDestroy.push(function () {
      return _this.cancel();
    }); // create getters for the observables

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
      var _this3 = this;

      if (_this3.isStopped()) {
        return Promise.resolve();
      } // fill in defaults for pull & push


      var pullModifier = _this3.pull && _this3.pull.modifier ? _this3.pull.modifier : _replicationHelper.DEFAULT_MODIFIER;
      var pushModifier = _this3.push && _this3.push.modifier ? _this3.push.modifier : _replicationHelper.DEFAULT_MODIFIER;
      var database = _this3.collection.database;
      return Promise.resolve(_this3.collection.database.storage.createStorageInstance({
        databaseName: database.name,
        collectionName: _this3.collection.name + '-rx-replication-' + _this3.replicationIdentifierHash,
        databaseInstanceToken: database.token,
        multiInstance: database.multiInstance,
        // TODO is this always false?
        options: {},
        schema: _replicationProtocol.RX_REPLICATION_META_INSTANCE_SCHEMA
      })).then(function (_this2$collection$dat) {
        function _temp2() {
          _this3.callOnStart();
        }

        _this3.metaInstance = _this2$collection$dat;
        _this3.internalReplicationState = (0, _replicationProtocol.replicateRxStorageInstance)({
          batchSize: _this3.push && _this3.push.batchSize ? _this3.push.batchSize : 100,
          forkInstance: _this3.collection.storageInstance,
          metaInstance: _this3.metaInstance,
          hashFunction: database.hashFunction,
          identifier: 'rx-replication-' + _this3.replicationIdentifierHash,
          conflictHandler: _this3.collection.conflictHandler,
          replicationHandler: {
            masterChangeStream$: _this3.remoteEvents$.asObservable().pipe((0, _rxjs.mergeMap)(function (ev) {
              try {
                if (ev === 'RESYNC') {
                  return Promise.resolve(ev);
                }

                var useEv = (0, _util.flatClone)(ev);

                if (_this3.deletedField !== '_deleted') {
                  useEv.documents = useEv.documents.map(function (doc) {
                    return swapdeletedFieldToDefaultDeleted(_this3.deletedField, doc);
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
                var _temp6 = function _temp6() {
                  var useResult = (0, _util.flatClone)(result);

                  if (_this3.deletedField !== '_deleted') {
                    useResult.documents = useResult.documents.map(function (doc) {
                      return swapdeletedFieldToDefaultDeleted(_this3.deletedField, doc);
                    });
                  }

                  return Promise.resolve(Promise.all(useResult.documents.map(function (d) {
                    return pullModifier(d);
                  }))).then(function (_Promise$all2) {
                    useResult.documents = _Promise$all2;
                    return useResult;
                  });
                };

                if (!_this3.pull) {
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

                var _temp7 = _for(function () {
                  return !done;
                }, void 0, function () {
                  var _temp3 = _catch(function () {
                    return Promise.resolve(_this3.pull.handler(checkpoint, batchSize)).then(function (_this3$pull$handler) {
                      result = _this3$pull$handler;
                      done = true;
                    });
                  }, function (err) {
                    var emitError = (0, _rxError.newRxError)('RC_PULL', {
                      checkpoint: checkpoint,
                      errors: Array.isArray(err) ? err : [err],
                      direction: 'pull'
                    });

                    _this3.subjects.error.next(emitError);

                    return Promise.resolve(_this3.collection.promiseWait((0, _util.ensureNotFalsy)(_this3.retryTime))).then(function () {});
                  });

                  if (_temp3 && _temp3.then) return _temp3.then(function () {});
                });

                return Promise.resolve(_temp7 && _temp7.then ? _temp7.then(_temp6) : _temp6(_temp7));
              } catch (e) {
                return Promise.reject(e);
              }
            },
            masterWrite: function (rows) {
              try {
                if (!_this3.push) {
                  return Promise.resolve([]);
                }

                var done = false;
                return Promise.resolve(Promise.all(rows.map(function (row) {
                  try {
                    return Promise.resolve(pushModifier(row.newDocumentState)).then(function (_pushModifier) {
                      function _temp12() {
                        if (_this3.deletedField !== '_deleted') {
                          row.newDocumentState = swapDefaultDeletedTodeletedField(_this3.deletedField, row.newDocumentState);

                          if (row.assumedMasterState) {
                            row.assumedMasterState = swapDefaultDeletedTodeletedField(_this3.deletedField, row.assumedMasterState);
                          }
                        }

                        return row;
                      }

                      row.newDocumentState = _pushModifier;

                      var _temp11 = function () {
                        if (row.assumedMasterState) {
                          return Promise.resolve(pushModifier(row.assumedMasterState)).then(function (_pushModifier2) {
                            row.assumedMasterState = _pushModifier2;
                          });
                        }
                      }();

                      return _temp11 && _temp11.then ? _temp11.then(_temp12) : _temp12(_temp11);
                    });
                  } catch (e) {
                    return Promise.reject(e);
                  }
                }))).then(function (useRows) {
                  function _temp10() {
                    return (0, _util.ensureNotFalsy)(result);
                  }

                  var result = {};

                  var _temp9 = _for(function () {
                    return !done;
                  }, void 0, function () {
                    var _temp8 = _catch(function () {
                      return Promise.resolve(_this3.push.handler(useRows)).then(function (_this3$push$handler) {
                        result = _this3$push$handler;
                        done = true;
                      });
                    }, function (err) {
                      var emitError = (0, _rxError.newRxError)('RC_PUSH', {
                        pushRows: rows,
                        errors: Array.isArray(err) ? err : [err],
                        direction: 'push'
                      });

                      _this3.subjects.error.next(emitError);

                      return Promise.resolve(_this3.collection.promiseWait((0, _util.ensureNotFalsy)(_this3.retryTime))).then(function () {});
                    });

                    if (_temp8 && _temp8.then) return _temp8.then(function () {});
                  });

                  return _temp9 && _temp9.then ? _temp9.then(_temp10) : _temp10(_temp9);
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }
          }
        });

        _this3.subs.push(_this3.internalReplicationState.events.error.subscribe(function (err) {
          _this3.subjects.error.next(err);
        }));

        _this3.subs.push(_this3.internalReplicationState.events.processed.down.subscribe(function (row) {
          return _this3.subjects.received.next(row.document);
        }));

        _this3.subs.push(_this3.internalReplicationState.events.processed.up.subscribe(function (writeToMasterRow) {
          _this3.subjects.send.next(writeToMasterRow.newDocumentState);
        }));

        if (_this3.pull && _this3.pull.stream$ && _this3.live) {
          _this3.subs.push(_this3.pull.stream$.subscribe({
            next: function next(ev) {
              _this3.remoteEvents$.next(ev);
            },
            error: function error(err) {
              _this3.subjects.error.next(err);
            }
          }));
        }

        var _temp = function () {
          if (!_this3.live) {
            return Promise.resolve((0, _replicationProtocol.awaitRxStorageReplicationFirstInSync)(_this3.internalReplicationState)).then(function () {
              return Promise.resolve(_this3.cancel()).then(function () {});
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
      var _this5 = this;

      return Promise.resolve(_this5.startPromise).then(function () {
        return (0, _replicationProtocol.awaitRxStorageReplicationFirstInSync)((0, _util.ensureNotFalsy)(_this5.internalReplicationState));
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
      var _this7 = this;

      return Promise.resolve(_this7.startPromise).then(function () {
        return Promise.resolve((0, _replicationProtocol.awaitRxStorageReplicationFirstInSync)((0, _util.ensureNotFalsy)(_this7.internalReplicationState))).then(function () {
          return Promise.resolve((0, _replicationProtocol.awaitRxStorageReplicationInSync)((0, _util.ensureNotFalsy)(_this7.internalReplicationState))).then(function () {
            return true;
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
    try {
      var _temp15 = function _temp15() {
        _this9.subs.forEach(function (sub) {
          return sub.unsubscribe();
        });

        _this9.subjects.canceled.next(true);

        _this9.subjects.active.complete();

        _this9.subjects.canceled.complete();

        _this9.subjects.error.complete();

        _this9.subjects.received.complete();

        _this9.subjects.send.complete();

        return _util.PROMISE_RESOLVE_TRUE;
      };

      var _this9 = this;

      if (_this9.isStopped()) {
        return Promise.resolve(_util.PROMISE_RESOLVE_FALSE);
      }

      if (_this9.internalReplicationState) {
        _this9.internalReplicationState.events.canceled.next(true);
      }

      var _temp16 = function () {
        if (_this9.metaInstance) {
          return Promise.resolve((0, _util.ensureNotFalsy)(_this9.metaInstance).close()).then(function () {});
        }
      }();

      return Promise.resolve(_temp16 && _temp16.then ? _temp16.then(_temp15) : _temp15(_temp16));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxReplicationState;
}();

exports.RxReplicationState = RxReplicationState;

function replicateRxCollection(_ref) {
  var replicationIdentifier = _ref.replicationIdentifier,
      collection = _ref.collection,
      _ref$deletedField = _ref.deletedField,
      deletedField = _ref$deletedField === void 0 ? '_deleted' : _ref$deletedField,
      pull = _ref.pull,
      push = _ref.push,
      _ref$live = _ref.live,
      live = _ref$live === void 0 ? true : _ref$live,
      _ref$retryTime = _ref.retryTime,
      retryTime = _ref$retryTime === void 0 ? 1000 * 5 : _ref$retryTime,
      _ref$waitForLeadershi = _ref.waitForLeadership,
      waitForLeadership = _ref$waitForLeadershi === void 0 ? true : _ref$waitForLeadershi,
      _ref$autoStart = _ref.autoStart,
      autoStart = _ref$autoStart === void 0 ? true : _ref$autoStart;
  var replicationIdentifierHash = (0, _util.fastUnsecureHash)([collection.database.name, collection.name, replicationIdentifier].join('|'));
  var replicationState = new RxReplicationState(replicationIdentifierHash, collection, deletedField, pull, push, live, retryTime, autoStart);
  startReplicationOnLeaderShip(waitForLeadership, replicationState);
  return replicationState;
}

function startReplicationOnLeaderShip(waitForLeadership, replicationState) {
  /**
      * Always await this Promise to ensure that the current instance
      * is leader when waitForLeadership=true
      */
  var mustWaitForLeadership = waitForLeadership && replicationState.collection.database.multiInstance;
  var waitTillRun = mustWaitForLeadership ? replicationState.collection.database.waitForLeadership() : _util.PROMISE_RESOLVE_TRUE;
  return waitTillRun.then(function () {
    if (replicationState.isStopped()) {
      return;
    }

    if (replicationState.autoStart) {
      replicationState.start();
    }
  });
}

function swapDefaultDeletedTodeletedField(deletedField, doc) {
  if (deletedField === '_deleted') {
    return doc;
  } else {
    doc = (0, _util.flatClone)(doc);
    var isDeleted = !!doc._deleted;
    doc[deletedField] = isDeleted;
    delete doc._deleted;
    return doc;
  }
}

function swapdeletedFieldToDefaultDeleted(deletedField, doc) {
  if (deletedField === '_deleted') {
    return doc;
  } else {
    doc = (0, _util.flatClone)(doc);
    var isDeleted = !!doc[deletedField];
    doc._deleted = isDeleted;
    delete doc[deletedField];
    return doc;
  }
}
//# sourceMappingURL=index.js.map