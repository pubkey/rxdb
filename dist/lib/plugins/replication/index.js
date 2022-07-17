"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  REPLICATION_STATE_BY_COLLECTION: true,
  RxReplicationStateBase: true,
  replicateRxCollection: true
};
exports.RxReplicationStateBase = exports.REPLICATION_STATE_BY_COLLECTION = void 0;
exports.replicateRxCollection = replicateRxCollection;

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _replicationCheckpoint = require("./replication-checkpoint");

Object.keys(_replicationCheckpoint).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _replicationCheckpoint[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _replicationCheckpoint[key];
    }
  });
});

var _util = require("../../util");

var _overwritable = require("../../overwritable");

var _revisionFlag = require("./revision-flag");

Object.keys(_revisionFlag).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _revisionFlag[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _revisionFlag[key];
    }
  });
});

var _rxError = require("../../rx-error");

var _rxChangeEvent = require("../../rx-change-event");

var _rxReplicationError = require("./rx-replication-error");

Object.keys(_rxReplicationError).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxReplicationError[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxReplicationError[key];
    }
  });
});

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

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var REPLICATION_STATE_BY_COLLECTION = new WeakMap();
exports.REPLICATION_STATE_BY_COLLECTION = REPLICATION_STATE_BY_COLLECTION;

var RxReplicationStateBase = /*#__PURE__*/function () {
  /**
   * Queue promise to ensure that run()
   * does not run in parallel
   */

  /**
   * Counts how many times the run() method
   * has been called. Used in tests.
   */

  /**
   * Time when the last successfull
   * pull cycle has been started.
   * Not the end time of that cycle!
   * Used to determine if notifyAboutRemoteChange()
   * should trigger a new run() cycle or not.
   */

  /**
   * Amount of pending retries of the run() cycle.
   * Increase when a pull or push fails to retry after retryTime.
   * Decrease when the retry-cycle started to run.
   */
  function RxReplicationStateBase(
  /**
   * hash of the identifier, used to flag revisions
   * and to identify which documents state came from the remote.
   */
  replicationIdentifierHash, collection, pull, push, live, liveInterval, retryTime, autoStart) {
    var _this = this;

    this.subs = [];
    this.initialReplicationComplete$ = undefined;
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
    this.runningPromise = _util.PROMISE_RESOLVE_VOID;
    this.runQueueCount = 0;
    this.runCount = 0;
    this.lastPullStart = 0;
    this.pendingRetries = 0;
    this.replicationIdentifierHash = replicationIdentifierHash;
    this.collection = collection;
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

    this.collection.onDestroy.then(function () {
      _this.cancel();
    }); // create getters for the observables

    Object.keys(this.subjects).forEach(function (key) {
      Object.defineProperty(_this, key + '$', {
        get: function get() {
          return this.subjects[key].asObservable();
        }
      });
    });
    this.liveInterval = liveInterval !== void 0 ? (0, _util.ensureInteger)(liveInterval) : 1000 * 10;
  }

  var _proto = RxReplicationStateBase.prototype;

  _proto.continuePolling = function continuePolling() {
    try {
      var _this3 = this;

      return Promise.resolve(_this3.collection.promiseWait(_this3.liveInterval)).then(function () {
        return Promise.resolve(_this3.run( // do not retry on liveInterval-runs because they might stack up
        // when failing
        false)).then(function () {});
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.isStopped = function isStopped() {
    if (this.collection.destroyed) {
      return true;
    }

    if (this.subjects.canceled.getValue()) {
      return true;
    }

    return false;
  };

  _proto.awaitInitialReplication = function awaitInitialReplication() {
    return (0, _rxjs.firstValueFrom)(this.initialReplicationComplete$.pipe((0, _operators.filter)(function (v) {
      return v === true;
    })));
  }
  /**
   * Returns a promise that resolves when:
   * - All local data is replicated with the remote
   * - No replication cycle is running or in retry-state
   */
  ;

  _proto.awaitInSync = function awaitInSync() {
    try {
      var _this5 = this;

      return Promise.resolve(_this5.awaitInitialReplication()).then(function () {
        var _temp = _for(function () {
          return _this5.runQueueCount > 0;
        }, void 0, function () {
          return Promise.resolve(_this5.runningPromise).then(function () {});
        });

        return _temp && _temp.then ? _temp.then(function () {
          return true;
        }) : true;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.cancel = function cancel() {
    if (this.isStopped()) {
      return _util.PROMISE_RESOLVE_FALSE;
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
    return _util.PROMISE_RESOLVE_TRUE;
  }
  /**
   * Ensures that this._run() does not run in parallel
   */
  ;

  _proto.run = function run() {
    var _this6 = this;

    var retryOnFail = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

    if (this.isStopped()) {
      return _util.PROMISE_RESOLVE_VOID;
    }

    if (this.runQueueCount > 2) {
      return this.runningPromise;
    }

    this.runQueueCount++;
    this.runningPromise = this.runningPromise.then(function () {
      _this6.subjects.active.next(true);

      return _this6._run(retryOnFail);
    }).then(function (willRetry) {
      _this6.subjects.active.next(false);

      if (retryOnFail && !willRetry && _this6.subjects.initialReplicationComplete.getValue() === false) {
        _this6.subjects.initialReplicationComplete.next(true);
      }

      _this6.runQueueCount--;
    });

    if (this.live && this.pull && this.liveInterval > 0 && this.pendingRetries < 1) {
      this.runningPromise.then(function () {
        return _this6.continuePolling();
      });
    }

    return this.runningPromise;
  }
  /**
   * Must be called when the remote tells the client
   * that something has been changed on the remote side.
   * Might or might not trigger a new run() cycle,
   * depending on when it is called and if another run() cycle is already
   * running.
   */
  ;

  _proto.notifyAboutRemoteChange = function notifyAboutRemoteChange() {
    var _this7 = this;

    var callTime = (0, _util.now)();
    return new Promise(function (res) {
      _this7.runningPromise = _this7.runningPromise.then(function () {
        if (_this7.lastPullStart < callTime) {
          _this7.run().then(function () {
            return res();
          });
        } else {
          res();
        }
      });
    });
  }
  /**
   * Runs the whole cycle once,
   * first pushes the local changes to the remote,
   * then pulls the remote changes to the local.
   * Returns true if a retry must be done
   */
  ;

  _proto._run = function _run() {
    try {
      var _temp7 = function _temp7() {
        var _exit = false;

        function _temp4(_result) {
          var _exit2 = false;
          if (_exit) return _result;

          var _temp2 = function () {
            if (_this9.pull) {
              var lastPullStartTime = (0, _util.now)();
              return Promise.resolve(_this9.runPull()).then(function (pullResult) {
                _this9.lastPullStart = lastPullStartTime;

                if (pullResult === 'error' && retryOnFail) {
                  addRetry();
                  _exit2 = true;
                  return true;
                }

                if (pullResult === 'drop') {
                  var _this8$_run2 = _this9._run();

                  _exit2 = true;
                  return _this8$_run2;
                }
              });
            }
          }();

          return _temp2 && _temp2.then ? _temp2.then(function (_result2) {
            return _exit2 ? _result2 : false;
          }) : _exit2 ? _temp2 : false;
        }

        var addRetry = function addRetry() {
          if (_this9.pendingRetries < 1) {
            _this9.pendingRetries = _this9.pendingRetries + 1;

            _this9.collection.promiseWait((0, _util.ensureNotFalsy)(_this9.retryTime)).then(function () {
              _this9.pendingRetries = _this9.pendingRetries - 1;

              _this9.run();
            });
          }
        };

        var _temp3 = function () {
          if (_this9.push) {
            return Promise.resolve(_this9.runPush()).then(function (ok) {
              if (!ok && retryOnFail) {
                addRetry();
                /*
                    Because we assume that conflicts are solved on the server side,
                    if push failed, do not attempt to pull before push was successful
                    otherwise we do not know how to merge changes with the local state
                */

                _exit = true;
                return true;
              }
            });
          }
        }();

        return _temp3 && _temp3.then ? _temp3.then(_temp4) : _temp4(_temp3);
      };

      var _arguments2 = arguments,
          _this9 = this;

      var retryOnFail = _arguments2.length > 0 && _arguments2[0] !== undefined ? _arguments2[0] : true;

      if (_this9.isStopped()) {
        return Promise.resolve(false);
      }

      _this9.runCount++;
      /**
       * The replication happens in the background anyways
       * so we have to ensure that we do not slow down primary tasks.
       * But not if it is the initial replication, because that might happen
       * on the first inital loading where it is critical to get the data
       * as fast as possible to decrease initial page load time.
       */

      var _temp8 = function () {
        if (_this9.subjects.initialReplicationComplete.getValue()) {
          return Promise.resolve(_this9.collection.database.requestIdlePromise()).then(function () {});
        }
      }();

      return Promise.resolve(_temp8 && _temp8.then ? _temp8.then(_temp7) : _temp7(_temp8));
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * Pull all changes from the server,
   * start from the last pulled change.
   * @return true if successfully, false if something errored
   */
  ;

  _proto.runPull = function runPull() {
    try {
      var _this11 = this;

      if (!_this11.pull) {
        throw (0, _rxError.newRxError)('SNH');
      }

      if (_this11.isStopped()) {
        return Promise.resolve('ok');
      }

      return Promise.resolve((0, _replicationCheckpoint.getLastPullDocument)(_this11.collection, _this11.replicationIdentifierHash)).then(function (latestDocument) {
        var _exit3 = false;

        function _temp17(_result3) {
          if (_exit3) return _result3;
          var pulledDocuments = result.documents; // optimization shortcut, do not proceed if there are no documents.

          if (pulledDocuments.length === 0) {
            return Promise.resolve('ok');
          }
          /**
           * Many people forgot sending the _deleted flag
           * so we check if it exists and throw if not.
           */


          if (_overwritable.overwritable.isDevMode()) {
            pulledDocuments.forEach(function (doc) {
              if (!doc.hasOwnProperty('_deleted')) {
                throw (0, _rxError.newRxError)('REP1', {
                  document: doc
                });
              }
            });
          }

          var pulledDocIds = pulledDocuments.map(function (doc) {
            return doc[_this11.collection.schema.primaryPath];
          });
          return _this11.isStopped() ? Promise.resolve('ok') : Promise.resolve(_this11.collection.storageInstance.findDocumentsById(pulledDocIds, true)).then(function (docsFromLocal) {
            var _exit4 = false;

            function _temp15(_result4) {
              var _exit5 = false;
              if (_exit4) return _result4;

              function _temp13(_result5) {
                if (_exit5) return _result5;

                function _temp11() {
                  return Promise.resolve('ok');
                }

                pulledDocuments.map(function (doc) {
                  return _this11.subjects.received.next(doc);
                });

                if (_this11.isStopped()) {
                  return Promise.resolve('ok');
                }

                var _temp10 = function () {
                  if (pulledDocuments.length === 0) {
                    if (_this11.live) {}
                  } else {
                    var newLatestDocument = (0, _util.lastOfArray)(pulledDocuments);
                    return Promise.resolve((0, _replicationCheckpoint.setLastPullDocument)(_this11.collection, _this11.replicationIdentifierHash, newLatestDocument)).then(function () {
                      var _temp9 = function () {
                        if (result.hasMoreDocuments) {
                          return Promise.resolve(_this11.runPull()).then(function () {});
                        }
                      }();

                      if (_temp9 && _temp9.then) return _temp9.then(function () {});
                    });
                    /**
                     * We have more documents on the remote,
                     * So re-run the pulling.
                     */
                  }
                }();

                return _temp10 && _temp10.then ? _temp10.then(_temp11) : _temp11(_temp10);
              }

              /**
               * Run the schema validation for pulled documents
               * in dev-mode.
               */
              if (_overwritable.overwritable.isDevMode()) {
                try {
                  pulledDocuments.forEach(function (doc) {
                    _this11.collection.schema.validate(doc);
                  });
                } catch (err) {
                  _this11.subjects.error.next(err);

                  return Promise.resolve('error');
                }
              }

              if (_this11.isStopped()) {
                return Promise.resolve('ok');
              }

              var bulkWriteData = [];

              for (var _iterator = _createForOfIteratorHelperLoose(pulledDocuments), _step; !(_step = _iterator()).done;) {
                var pulledDocument = _step.value;
                var docId = pulledDocument[_this11.collection.schema.primaryPath];
                var docStateInLocalStorageInstance = docsFromLocal[docId];
                var nextRevisionHeight = 1;

                if (docStateInLocalStorageInstance) {
                  var hasHeight = (0, _util.getHeightOfRevision)(docStateInLocalStorageInstance._rev);
                  nextRevisionHeight = hasHeight + 1;
                }

                var writeDoc = Object.assign({}, pulledDocument, {
                  _attachments: {},
                  _meta: Object.assign((0, _util.getDefaultRxDocumentMeta)(), docStateInLocalStorageInstance ? docStateInLocalStorageInstance._meta : {}),
                  _rev: (0, _util.getDefaultRevision)()
                });
                writeDoc._rev = (0, _util.createRevision)(writeDoc, docStateInLocalStorageInstance);
                (0, _revisionFlag.setLastWritePullReplication)(_this11.replicationIdentifierHash, writeDoc, nextRevisionHeight);
                bulkWriteData.push({
                  previous: docStateInLocalStorageInstance,
                  document: writeDoc
                });
              }

              var _temp12 = function () {
                if (bulkWriteData.length > 0) {
                  /**
                   * TODO only do a write to a document
                   * if the relevant data has been changed.
                   * Otherwise we can ignore the pulled document data.
                   */
                  return Promise.resolve(_this11.collection.storageInstance.bulkWrite(bulkWriteData, 'replication-write-pulled')).then(function (bulkWriteResponse) {
                    /**
                     * If writing the pulled documents caused an conflict error,
                     * it means that a local write happened while we tried to write data from remote.
                     * Then we have to drop the current pulled batch
                     * and run pushing again.
                     */
                    var hasConflict = Object.values(bulkWriteResponse.error).find(function (err) {
                      return err.status === 409;
                    });

                    if (hasConflict) {
                      var _Promise$resolve5 = Promise.resolve('drop');

                      _exit5 = true;
                      return _Promise$resolve5;
                    }
                  });
                }
              }();

              return _temp12 && _temp12.then ? _temp12.then(_temp13) : _temp13(_temp12);
            }

            var _temp14 = function () {
              if (_this11.push) {
                if (_this11.isStopped()) {
                  var _Promise$resolve6 = Promise.resolve('ok');

                  _exit4 = true;
                  return _Promise$resolve6;
                }

                return Promise.resolve((0, _replicationCheckpoint.getChangesSinceLastPushCheckpoint)(_this11.collection, _this11.replicationIdentifierHash, function () {
                  return _this11.isStopped();
                }, 1)).then(function (localWritesInBetween) {
                  /**
                   * If any of the pulled documents
                   * was changed locally in between,
                   * we drop.
                   * If other documents where changed locally,
                   * we do not care.
                   */
                  var primaryPath = _this11.collection.schema.primaryPath;

                  for (var _iterator2 = _createForOfIteratorHelperLoose(pulledDocuments), _step2; !(_step2 = _iterator2()).done;) {
                    var pulledDoc = _step2.value;
                    var id = pulledDoc[primaryPath];

                    if (localWritesInBetween.changedDocIds.has(id)) {
                      var _Promise$resolve7 = Promise.resolve('drop');

                      _exit4 = true;
                      return _Promise$resolve7;
                    }
                  }
                });
              }
            }();

            /**
             * If a local write has happened while the remote changes where fetched,
             * we have to drop the document and first run a push-sequence.
             * This will ensure that no local writes are missed out and are not pushed to the remote.
             */
            return _temp14 && _temp14.then ? _temp14.then(_temp15) : _temp15(_temp14);
          });
        }

        var result;

        var _temp16 = _catch(function () {
          return Promise.resolve(_this11.pull.handler(latestDocument)).then(function (_this10$pull$handler) {
            result = _this10$pull$handler;
          });
        }, function (err) {
          if (err instanceof _rxReplicationError.RxReplicationPullError) {
            _this11.subjects.error.next(err);
          } else {
            var emitError = new _rxReplicationError.RxReplicationPullError(err.message, latestDocument, err);

            _this11.subjects.error.next(emitError);
          }

          var _Promise$resolve = Promise.resolve('error');

          _exit3 = true;
          return _Promise$resolve;
        });

        return _temp16 && _temp16.then ? _temp16.then(_temp17) : _temp17(_temp16);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * Pushes unreplicated local changes to the remote.
   * @return true if successfull, false if not
   */
  ;

  _proto.runPush = function runPush() {
    try {
      var _this13 = this;

      if (!_this13.push) {
        throw (0, _rxError.newRxError)('SNH');
      }

      if (_this13.isStopped()) {
        return Promise.resolve(true);
      }

      var batchSize = _this13.push.batchSize ? _this13.push.batchSize : 5;
      return Promise.resolve((0, _replicationCheckpoint.getChangesSinceLastPushCheckpoint)(_this13.collection, _this13.replicationIdentifierHash, function () {
        return _this13.isStopped();
      }, batchSize)).then(function (changesResult) {
        var _exit6 = false;

        function _temp19(_result6) {
          if (_exit6) return _result6;
          pushDocs.forEach(function (pushDoc) {
            return _this13.subjects.send.next(pushDoc);
          });
          return _this13.isStopped() ? true : Promise.resolve((0, _replicationCheckpoint.setLastPushCheckpoint)(_this13.collection, _this13.replicationIdentifierHash, changesResult.checkpoint)).then(function () {
            return changesResult.changedDocs.size !== 0 ? _this13.runPush() : true;
          });
        }

        if (changesResult.changedDocs.size === 0 || _this13.isStopped()) {
          return true;
        }

        var changeRows = Array.from(changesResult.changedDocs.values());
        var pushDocs = changeRows.map(function (row) {
          var doc = (0, _util.flatClone)(row.doc);
          delete doc._rev;
          delete doc._attachments;
          return doc;
        });

        var _temp18 = _catch(function () {
          return Promise.resolve(_this13.push.handler(pushDocs)).then(function () {});
        }, function (err) {
          if (err instanceof _rxReplicationError.RxReplicationPushError) {
            _this13.subjects.error.next(err);
          } else {
            var documentsData = changeRows.map(function (row) {
              return row.doc;
            });
            var emitError = new _rxReplicationError.RxReplicationPushError(err.message, documentsData, err);

            _this13.subjects.error.next(emitError);
          }

          _exit6 = true;
          return false;
        });

        return _temp18 && _temp18.then ? _temp18.then(_temp19) : _temp19(_temp18);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxReplicationStateBase;
}();

exports.RxReplicationStateBase = RxReplicationStateBase;

function replicateRxCollection(_ref) {
  var replicationIdentifier = _ref.replicationIdentifier,
      collection = _ref.collection,
      pull = _ref.pull,
      push = _ref.push,
      _ref$live = _ref.live,
      live = _ref$live === void 0 ? false : _ref$live,
      _ref$liveInterval = _ref.liveInterval,
      liveInterval = _ref$liveInterval === void 0 ? 1000 * 10 : _ref$liveInterval,
      _ref$retryTime = _ref.retryTime,
      retryTime = _ref$retryTime === void 0 ? 1000 * 5 : _ref$retryTime,
      _ref$waitForLeadershi = _ref.waitForLeadership,
      waitForLeadership = _ref$waitForLeadershi === void 0 ? true : _ref$waitForLeadershi,
      _ref$autoStart = _ref.autoStart,
      autoStart = _ref$autoStart === void 0 ? true : _ref$autoStart;
  var replicationIdentifierHash = (0, _util.hash)([collection.database.name, collection.name, replicationIdentifier].join('|'));
  var replicationState = new RxReplicationStateBase(replicationIdentifierHash, collection, pull, push, live, liveInterval, retryTime, autoStart);
  (0, _util.ensureInteger)(replicationState.liveInterval);
  /**
   * Always await this Promise to ensure that the current instance
   * is leader when waitForLeadership=true
   */

  var mustWaitForLeadership = waitForLeadership && collection.database.multiInstance;
  var waitTillRun = mustWaitForLeadership ? collection.database.waitForLeadership() : _util.PROMISE_RESOLVE_TRUE;
  waitTillRun.then(function () {
    if (replicationState.isStopped()) {
      return;
    }

    if (autoStart) {
      replicationState.run();
    }

    if (replicationState.live && push) {
      /**
       * When a non-local document is written to the collection,
       * we have to run the replication run() once to ensure
       * that the change is pushed to the remote.
       */
      var changeEventsSub = collection.$.pipe((0, _operators.filter)(function (cE) {
        return !cE.isLocal;
      })).subscribe(function (changeEvent) {
        if (replicationState.isStopped()) {
          return;
        }

        var doc = (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent);

        if (
        /**
         * Do not run() if the change
         * was from a pull-replication cycle.
         */
        !(0, _revisionFlag.wasLastWriteFromPullReplication)(replicationState.replicationIdentifierHash, doc) ||
        /**
         * If the event is a delete, we still have to run the replication
         * because wasLastWriteFromPullReplication() will give the wrong answer.
         */
        changeEvent.operation === 'DELETE') {
          replicationState.run();
        }
      });
      replicationState.subs.push(changeEventsSub);
    }
  });
  return replicationState;
}
//# sourceMappingURL=index.js.map