"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxReplicationError: true,
  RxReplicationStateBase: true,
  replicateRxCollection: true
};
exports.RxReplicationStateBase = exports.RxReplicationError = void 0;
exports.replicateRxCollection = replicateRxCollection;

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

var _wrapNativeSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapNativeSuper"));

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

var _rxCollectionHelper = require("../../rx-collection-helper");

var _rxError = require("../../rx-error");

var _rxChangeEvent = require("../../rx-change-event");

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

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var RxReplicationError = /*#__PURE__*/function (_Error) {
  (0, _inheritsLoose2["default"])(RxReplicationError, _Error);

  function RxReplicationError(message, payload, innerErrors) {
    var _this;

    _this = _Error.call(this, message) || this;
    _this.payload = payload;
    _this.innerErrors = innerErrors;
    return _this;
  }

  return RxReplicationError;
}( /*#__PURE__*/(0, _wrapNativeSuper2["default"])(Error));

exports.RxReplicationError = RxReplicationError;

var RxReplicationStateBase = /*#__PURE__*/function () {
  /**
   * Counts how many times the run() method
   * has been called. Used in tests.
   */

  /**
   * Amount of pending retries of the run() cycle.
   * Increase when a pull or push fails to retry after retryTime.
   * Decrease when the retry-cycle started to run.
   */
  function RxReplicationStateBase(replicationIdentifier, collection, pull, push, live, liveInterval, retryTime) {
    var _this2 = this;

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
    this.pendingRetries = 0;
    this.replicationIdentifier = replicationIdentifier;
    this.collection = collection;
    this.pull = pull;
    this.push = push;
    this.live = live;
    this.liveInterval = liveInterval;
    this.retryTime = retryTime;
    // stop the replication when the collection gets destroyed
    this.collection.onDestroy.then(function () {
      _this2.cancel();
    }); // create getters for the observables

    Object.keys(this.subjects).forEach(function (key) {
      Object.defineProperty(_this2, key + '$', {
        get: function get() {
          return this.subjects[key].asObservable();
        }
      });
    });
  }

  var _proto = RxReplicationStateBase.prototype;

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
  };

  _proto.cancel = function cancel() {
    if (this.isStopped()) {
      return _util.PROMISE_RESOLVE_FALSE;
    }

    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    this.subjects.canceled.next(true);
    return _util.PROMISE_RESOLVE_TRUE;
  }
  /**
   * Ensures that this._run() does not run in parallel
   */
  ;

  _proto.run = function run() {
    try {
      var _arguments2 = arguments,
          _this4 = this;

      var retryOnFail = _arguments2.length > 0 && _arguments2[0] !== undefined ? _arguments2[0] : true;

      if (_this4.isStopped()) {
        return Promise.resolve();
      }

      if (_this4.runQueueCount > 2) {
        return Promise.resolve(_this4.runningPromise);
      }

      _this4.runQueueCount++;
      _this4.runningPromise = _this4.runningPromise.then(function () {
        _this4.subjects.active.next(true);

        return _this4._run(retryOnFail);
      }).then(function (willRetry) {
        _this4.subjects.active.next(false);

        if (retryOnFail && !willRetry && _this4.subjects.initialReplicationComplete.getValue() === false) {
          _this4.subjects.initialReplicationComplete.next(true);
        }

        _this4.runQueueCount--;
      });
      return Promise.resolve(_this4.runningPromise);
    } catch (e) {
      return Promise.reject(e);
    }
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
      var _temp6 = function _temp6() {
        var _exit = false;

        function _temp3(_result) {
          var _exit2 = false;
          if (_exit) return _result;

          var _temp = function () {
            if (_this6.pull) {
              return Promise.resolve(_this6.runPull()).then(function (pullResult) {
                if (pullResult === 'error' && retryOnFail) {
                  addRetry();
                  _exit2 = true;
                  return true;
                }

                if (pullResult === 'drop') {
                  var _this5$_run2 = _this6._run();

                  _exit2 = true;
                  return _this5$_run2;
                }
              });
            }
          }();

          return _temp && _temp.then ? _temp.then(function (_result2) {
            return _exit2 ? _result2 : false;
          }) : _exit2 ? _temp : false;
        }

        var addRetry = function addRetry() {
          if (_this6.pendingRetries < 1) {
            _this6.pendingRetries = _this6.pendingRetries + 1;
            setTimeout(function () {
              _this6.pendingRetries = _this6.pendingRetries - 1;

              _this6.run();
            }, _this6.retryTime);
          }
        };

        var _temp2 = function () {
          if (_this6.push) {
            return Promise.resolve(_this6.runPush()).then(function (ok) {
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

        return _temp2 && _temp2.then ? _temp2.then(_temp3) : _temp3(_temp2);
      };

      var _arguments4 = arguments,
          _this6 = this;

      var retryOnFail = _arguments4.length > 0 && _arguments4[0] !== undefined ? _arguments4[0] : true;
      _this6.runCount++;
      /**
       * The replication happens in the background anyways
       * so we have to ensure that we do not slow down primary tasks.
       * But not if it is the initial replication, because that might happen
       * on the first inital loading where it is critical to get the data
       * as fast as possible to decrease initial page load time.
       */

      var _temp7 = function () {
        if (_this6.subjects.initialReplicationComplete.getValue()) {
          return Promise.resolve(_this6.collection.database.requestIdlePromise()).then(function () {});
        }
      }();

      return Promise.resolve(_temp7 && _temp7.then ? _temp7.then(_temp6) : _temp6(_temp7));
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
      var _this8 = this;

      if (!_this8.pull) {
        throw (0, _rxError.newRxError)('SNH');
      }

      if (_this8.isStopped()) {
        return Promise.resolve('ok');
      }

      return Promise.resolve((0, _replicationCheckpoint.getLastPullDocument)(_this8.collection, _this8.replicationIdentifier)).then(function (latestDocument) {
        var _exit3 = false;

        function _temp14(_result3) {
          var _exit4 = false;
          if (_exit3) return _result3;

          function _temp12(_result4) {
            if (_exit4) return _result4;

            /**
             * Run the schema validation for pulled documentd
             * in dev-mode.
             */
            if (_overwritable.overwritable.isDevMode()) {
              try {
                pulledDocuments.forEach(function (doc) {
                  var withoutDeleteFlag = (0, _util.flatClone)(doc);
                  delete withoutDeleteFlag._deleted;

                  _this8.collection.schema.validate(withoutDeleteFlag);
                });
              } catch (err) {
                _this8.subjects.error.next(err);

                return Promise.resolve('error');
              }
            }

            return _this8.isStopped() ? Promise.resolve('ok') : Promise.resolve(_this8.handleDocumentsFromRemote(pulledDocuments)).then(function () {
              function _temp10() {
                return Promise.resolve('ok');
              }

              pulledDocuments.map(function (doc) {
                return _this8.subjects.received.next(doc);
              });

              var _temp9 = function () {
                if (pulledDocuments.length === 0) {
                  if (_this8.live) {}
                } else {
                  var newLatestDocument = (0, _util.lastOfArray)(pulledDocuments);
                  return Promise.resolve((0, _replicationCheckpoint.setLastPullDocument)(_this8.collection, _this8.replicationIdentifier, newLatestDocument)).then(function () {
                    var _temp8 = function () {
                      if (result.hasMoreDocuments) {
                        return Promise.resolve(_this8.runPull()).then(function () {});
                      }
                    }();

                    if (_temp8 && _temp8.then) return _temp8.then(function () {});
                  });
                  /**
                   * We have more documents on the remote,
                   * So re-run the pulling.
                   */
                }
              }();

              return _temp9 && _temp9.then ? _temp9.then(_temp10) : _temp10(_temp9);
            });
          }

          var pulledDocuments = result.documents; // optimization shortcut, do not proceed if there are no documents.

          if (pulledDocuments.length === 0) {
            return Promise.resolve('ok');
          }
          /**
           * If a local write has happened while the remote changes where fetched,
           * we have to drop the document and first run a push-sequence.
           * This will ensure that no local writes are missed out and not pushed to the remote.
           */


          var _temp11 = function () {
            if (_this8.push) {
              return Promise.resolve((0, _replicationCheckpoint.getChangesSinceLastPushSequence)(_this8.collection, _this8.replicationIdentifier, 1)).then(function (localWritesInBetween) {
                if (localWritesInBetween.changedDocs.size > 0) {
                  var _Promise$resolve3 = Promise.resolve('drop');

                  _exit4 = true;
                  return _Promise$resolve3;
                }
              });
            }
          }();

          return _temp11 && _temp11.then ? _temp11.then(_temp12) : _temp12(_temp11);
        }

        var result;

        var _temp13 = _catch(function () {
          return Promise.resolve(_this8.pull.handler(latestDocument)).then(function (_this7$pull$handler) {
            result = _this7$pull$handler;
          });
        }, function (err) {
          _this8.subjects.error.next(err);

          var _Promise$resolve = Promise.resolve('error');

          _exit3 = true;
          return _Promise$resolve;
        });

        return _temp13 && _temp13.then ? _temp13.then(_temp14) : _temp14(_temp13);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.handleDocumentsFromRemote = function handleDocumentsFromRemote(docs) {
    try {
      var _this10 = this;

      var toStorageDocs = [];
      var docIds = docs.map(function (doc) {
        return doc[_this10.collection.schema.primaryPath];
      });
      return Promise.resolve(_this10.collection.storageInstance.findDocumentsById(docIds, true)).then(function (docsFromLocal) {
        for (var _iterator = _createForOfIteratorHelperLoose(docs), _step; !(_step = _iterator()).done;) {
          var originalDoc = _step.value;
          var doc = (0, _util.flatClone)(originalDoc);
          var documentId = doc[_this10.collection.schema.primaryPath];
          var docStateInLocalStorageInstance = docsFromLocal[documentId];
          var newRevision = (0, _revisionFlag.createRevisionForPulledDocument)(_this10.replicationIdentifier, doc);

          if (docStateInLocalStorageInstance) {
            var hasHeight = (0, _util.getHeightOfRevision)(docStateInLocalStorageInstance._rev);
            var newRevisionHeight = hasHeight + 1;
            newRevision = newRevisionHeight + '-' + newRevision;
          } else {
            newRevision = '1-' + newRevision;
          }

          doc._rev = newRevision;
          toStorageDocs.push(doc);
        }

        var _temp15 = function () {
          if (toStorageDocs.length > 0) {
            return Promise.resolve(_this10.collection.database.lockedRun(function () {
              return _this10.collection.storageInstance.bulkAddRevisions(toStorageDocs.map(function (doc) {
                return (0, _rxCollectionHelper._handleToStorageInstance)(_this10.collection, doc);
              }));
            })).then(function () {});
          }
        }();

        return _temp15 && _temp15.then ? _temp15.then(function () {
          return true;
        }) : true;
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
      var _this12 = this;

      if (!_this12.push) {
        throw (0, _rxError.newRxError)('SNH');
      }

      var batchSize = _this12.push.batchSize ? _this12.push.batchSize : 5;
      return Promise.resolve((0, _replicationCheckpoint.getChangesSinceLastPushSequence)(_this12.collection, _this12.replicationIdentifier, batchSize)).then(function (changesResult) {
        var _exit5 = false;

        function _temp20(_result5) {
          if (_exit5) return _result5;

          function _temp18() {
            var _temp16 = function () {
              if (changesResult.changedDocs.size !== 0) {
                return Promise.resolve(_this12.runPush()).then(function () {});
              }
            }();

            // batch had documents so there might be more changes to replicate
            return _temp16 && _temp16.then ? _temp16.then(function () {
              return true;
            }) : true;
          }

          pushDocs.forEach(function (pushDoc) {
            return _this12.subjects.send.next(pushDoc);
          });

          var _temp17 = function () {
            if (changesResult.hasChangesSinceLastSequence) {
              return Promise.resolve((0, _replicationCheckpoint.setLastPushSequence)(_this12.collection, _this12.replicationIdentifier, changesResult.lastSequence)).then(function () {});
            }
          }();

          return _temp17 && _temp17.then ? _temp17.then(_temp18) : _temp18(_temp17);
        }

        var pushDocs = Array.from(changesResult.changedDocs.values()).map(function (row) {
          var doc = (0, _util.flatClone)(row.doc); // TODO _deleted should be required on type RxDocumentData
          // so we do not need this check here

          if (!doc.hasOwnProperty('_deleted')) {
            doc._deleted = false;
          }

          delete doc._rev;
          delete doc._attachments;
          return doc;
        });

        var _temp19 = _catch(function () {
          return Promise.resolve(_this12.push.handler(pushDocs)).then(function () {});
        }, function (err) {
          _this12.subjects.error.next(err);

          _exit5 = true;
          return false;
        });

        return _temp19 && _temp19.then ? _temp19.then(_temp20) : _temp20(_temp19);
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
      waitForLeadership = _ref.waitForLeadership;
  var replicationState = new RxReplicationStateBase(replicationIdentifier, collection, pull, push, live, liveInterval, retryTime);
  /**
   * Always await this Promise to ensure that the current instance
   * is leader when waitForLeadership=true
   */

  var mustWaitForLeadership = waitForLeadership && collection.database.multiInstance;
  var waitTillRun = mustWaitForLeadership ? collection.database.waitForLeadership() : _util.PROMISE_RESOLVE_TRUE;
  waitTillRun.then(function () {
    if (replicationState.isStopped()) {
      return;
    } // trigger run() once


    replicationState.run();
    /**
     * Start sync-interval and listeners
     * if it is a live replication.
     */

    if (replicationState.live) {
      if (pull) {
        (function () {
          try {
            var _exit7 = false;
            return _for(function () {
              return !_exit7 && !replicationState.isStopped();
            }, void 0, function () {
              return Promise.resolve((0, _util.promiseWait)(replicationState.liveInterval)).then(function () {
                if (replicationState.isStopped()) {
                  _exit7 = true;
                  return;
                }

                return Promise.resolve(replicationState.run( // do not retry on liveInterval-runs because they might stack up
                // when failing
                false)).then(function () {});
              });
            });
          } catch (e) {
            Promise.reject(e);
          }
        })();
      }

      if (push) {
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
          var rev = doc._rev;

          if (rev &&
          /**
           * Do not run() if the change
           * was from a pull-replication cycle.
           */
          !(0, _revisionFlag.wasRevisionfromPullReplication)(replicationIdentifier, rev)) {
            replicationState.run();
          }
        });
        replicationState.subs.push(changeEventsSub);
      }
    }
  });
  return replicationState;
}
//# sourceMappingURL=index.js.map