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

function _forTo(array, body, check) {
  var i = -1,
      pact,
      reject;

  function _cycle(result) {
    try {
      while (++i < array.length && (!check || !check())) {
        result = body(i);

        if (result && result.then) {
          if (_isSettledPact(result)) {
            result = result.v;
          } else {
            result.then(_cycle, reject || (reject = _settle.bind(null, pact = new _Pact(), 2)));
            return;
          }
        }
      }

      if (pact) {
        _settle(pact, 1, result);
      } else {
        pact = result;
      }
    } catch (e) {
      _settle(pact || (pact = new _Pact()), 2, e);
    }
  }

  _cycle();

  return pact;
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

/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import GraphQLClient from 'graphql-client';
import objectPath from 'object-path';
import { promiseWait, getHeightOfRevision, flatClone, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_TRUE, PROMISE_RESOLVE_VOID } from '../../util';
import { addRxPlugin } from '../../core';
import { hash } from '../../util';
import { DEFAULT_MODIFIER, wasRevisionfromPullReplication, createRevisionForPulledDocument } from './helper';
import { setLastPushSequence, getLastPullDocument, setLastPullDocument, getChangesSinceLastPushSequence } from './crawling-checkpoint';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { overwritable } from '../../overwritable';
import { getDocumentDataOfRxChangeEvent } from '../../rx-change-event';
import { _handleToStorageInstance } from '../../rx-collection-helper';
addRxPlugin(RxDBLeaderElectionPlugin);
export var RxGraphQLReplicationState = /*#__PURE__*/function () {
  function RxGraphQLReplicationState(collection, url, headers, pull, push, deletedFlag, live, liveInterval, retryTime) {
    this._subjects = {
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
    this._runningPromise = PROMISE_RESOLVE_VOID;
    this._subs = [];
    this._runQueueCount = 0;
    this._runCount = 0;
    this.initialReplicationComplete$ = undefined;
    this.received$ = undefined;
    this.send$ = undefined;
    this.error$ = undefined;
    this.canceled$ = undefined;
    this.active$ = undefined;
    this.collection = collection;
    this.url = url;
    this.headers = headers;
    this.pull = pull;
    this.push = push;
    this.deletedFlag = deletedFlag;
    this.live = live;
    this.liveInterval = liveInterval;
    this.retryTime = retryTime;
    this.client = GraphQLClient({
      url: url,
      headers: headers
    });
    this.endpointHash = hash(url);

    this._prepare();
  }

  var _proto = RxGraphQLReplicationState.prototype;

  /**
   * things that are more complex to not belong into the constructor
   */
  _proto._prepare = function _prepare() {
    var _this = this;

    // stop sync when collection gets destroyed
    this.collection.onDestroy.then(function () {
      _this.cancel();
    }); // create getters for the observables

    Object.keys(this._subjects).forEach(function (key) {
      Object.defineProperty(_this, key + '$', {
        get: function get() {
          return this._subjects[key].asObservable();
        }
      });
    });
  };

  _proto.isStopped = function isStopped() {
    if (this.collection.destroyed) {
      return true;
    }

    if (!this.live && this._subjects.initialReplicationComplete.getValue()) {
      return true;
    }

    if (this._subjects.canceled['_value']) {
      return true;
    }

    return false;
  };

  _proto.awaitInitialReplication = function awaitInitialReplication() {
    return firstValueFrom(this.initialReplicationComplete$.pipe(filter(function (v) {
      return v === true;
    })));
  } // ensures this._run() does not run in parallel
  ;

  _proto.run = function run() {
    try {
      var _arguments2 = arguments,
          _this3 = this;

      var retryOnFail = _arguments2.length > 0 && _arguments2[0] !== undefined ? _arguments2[0] : true;

      if (_this3.isStopped()) {
        return Promise.resolve();
      }

      if (_this3._runQueueCount > 2) {
        return Promise.resolve(_this3._runningPromise);
      }

      _this3._runQueueCount++;
      _this3._runningPromise = _this3._runningPromise.then(function () {
        try {
          _this3._subjects.active.next(true);

          return Promise.resolve(_this3._run(retryOnFail)).then(function (willRetry) {
            _this3._subjects.active.next(false);

            if (retryOnFail && !willRetry && _this3._subjects.initialReplicationComplete.getValue() === false) {
              _this3._subjects.initialReplicationComplete.next(true);
            }

            _this3._runQueueCount--;
          });
        } catch (e) {
          return Promise.reject(e);
        }
      });
      return Promise.resolve(_this3._runningPromise);
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * returns true if retry must be done
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
            if (_this5.pull) {
              return Promise.resolve(_this5.runPull()).then(function (ok) {
                if (!ok && retryOnFail) {
                  setTimeout(function () {
                    return _this5.run();
                  }, _this5.retryTime);
                  _exit2 = true;
                  return true;
                }
              });
            }
          }();

          return _temp && _temp.then ? _temp.then(function (_result2) {
            return _exit2 ? _result2 : false;
          }) : _exit2 ? _temp : false;
        }

        var _temp2 = function () {
          if (_this5.push) {
            return Promise.resolve(_this5.runPush()).then(function (ok) {
              if (!ok && retryOnFail) {
                setTimeout(function () {
                  return _this5.run();
                }, _this5.retryTime);
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
          _this5 = this;

      var retryOnFail = _arguments4.length > 0 && _arguments4[0] !== undefined ? _arguments4[0] : true;

      if (_this5.isStopped()) {
        return Promise.resolve(false);
      }

      _this5._runCount++;
      /**
       * The replication happens in the background anyways
       * so we have to ensure that we do not slow down primary tasks.
       * But not if it is the initial replication, because that might happen
       * on the first inital loading where it is critical to get the data
       * as fast as possible to decrease initial page load time.
       */

      var _temp7 = function () {
        if (_this5._subjects.initialReplicationComplete.getValue()) {
          return Promise.resolve(_this5.collection.database.requestIdlePromise()).then(function () {});
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
      var _this7 = this;

      if (_this7.isStopped()) {
        return Promise.resolve(false);
      }

      return Promise.resolve(getLastPullDocument(_this7.collection, _this7.endpointHash)).then(function (latestDocument) {
        var latestDocumentData = latestDocument ? latestDocument : null;
        return Promise.resolve(_this7.pull.queryBuilder(latestDocumentData)).then(function (pullGraphQL) {
          var _exit3 = false;

          function _temp10(_result3) {
            if (_exit3) return _result3;
            var dataPath = _this7.pull.dataPath || ['data', Object.keys(result.data)[0]];
            var data = objectPath.get(result, dataPath); // optimization shortcut, do not proceed if there are no documents.

            return data.length === 0 ? true : Promise.resolve(Promise.all(data.map(function (doc) {
              try {
                return Promise.resolve(_this7.pull.modifier(doc));
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function (_Promise$all) {
              var modified = _Promise$all.filter(function (doc) {
                return !!doc;
              });

              /**
               * Run schema validation in dev-mode
               */
              if (overwritable.isDevMode()) {
                try {
                  modified.forEach(function (doc) {
                    var withoutDeleteFlag = flatClone(doc);
                    delete withoutDeleteFlag[_this7.deletedFlag];

                    _this7.collection.schema.validate(withoutDeleteFlag);
                  });
                } catch (err) {
                  _this7._subjects.error.next(err);

                  return false;
                }
              }

              return _this7.isStopped() ? true : Promise.resolve(_this7.handleDocumentsFromRemote(modified)).then(function () {
                modified.map(function (doc) {
                  return _this7._subjects.received.next(doc);
                });

                var _temp8 = function () {
                  if (modified.length === 0) {
                    if (_this7.live) {}
                  } else {
                    var newLatestDocument = modified[modified.length - 1];
                    return Promise.resolve(setLastPullDocument(_this7.collection, _this7.endpointHash, newLatestDocument)).then(function () {
                      /**
                       * we have more docs, re-run
                       * TODO we should have a options.pull.batchSize param
                       * and only re-run if the previous batch was 'full'
                       * this would save many duplicate requests with empty arrays as response.
                       */
                      return Promise.resolve(_this7.runPull()).then(function () {});
                    });
                  }
                }();

                return _temp8 && _temp8.then ? _temp8.then(function () {
                  return true;
                }) : true;
              });
            });
          }

          var result;

          var _temp9 = _catch(function () {
            return Promise.resolve(_this7.client.query(pullGraphQL.query, pullGraphQL.variables)).then(function (_this6$client$query) {
              result = _this6$client$query;

              if (result.errors) {
                if (typeof result.errors === 'string') {
                  throw new Error(result.errors);
                } else {
                  var err = new Error('unknown errors occurred - see innerErrors for more details');
                  err.innerErrors = result.errors;
                  throw err;
                }
              }
            });
          }, function (err) {
            _this7._subjects.error.next(err);

            _exit3 = true;
            return false;
          });

          return _temp9 && _temp9.then ? _temp9.then(_temp10) : _temp10(_temp9);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * @return true if successfull, false if not
   */
  ;

  _proto.runPush = function runPush() {
    try {
      var _this9 = this;

      if (_this9.isStopped()) {
        return Promise.resolve(false);
      }

      return Promise.resolve(getChangesSinceLastPushSequence(_this9.collection, _this9.endpointHash, _this9.push.batchSize)).then(function (changesResult) {
        return Promise.resolve(Promise.all(Array.from(changesResult.changedDocs.values()).map(function (row) {
          try {
            var changedDoc = row.doc;
            return Promise.resolve(_this9.push.modifier(changedDoc)).then(function (_modifier2) {
              changedDoc = _modifier2;
              return changedDoc ? {
                doc: changedDoc,
                sequence: row.sequence
              } : null;
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function (_Promise$all2) {
          var _exit4 = false;

          function _temp17(_result5) {
            if (_exit4) return _result5;

            function _temp15() {
              var _temp13 = function () {
                if (changesResult.changedDocs.size === 0) {
                  if (_this9.live) {}
                } else {
                  // we have more docs, re-run
                  return Promise.resolve(_this9.runPush()).then(function () {});
                }
              }();

              return _temp13 && _temp13.then ? _temp13.then(function () {
                return true;
              }) : true;
            }

            var _temp14 = function () {
              if (changesResult.hasChangesSinceLastSequence) {
                // all docs where successfull, so we use the seq of the changes-fetch
                return Promise.resolve(setLastPushSequence(_this9.collection, _this9.endpointHash, changesResult.lastSequence)).then(function () {});
              }
            }();

            return _temp14 && _temp14.then ? _temp14.then(_temp15) : _temp15(_temp14);
          }

          var changesWithDocs = _Promise$all2.filter(function (doc) {
            return !!doc;
          });

          var lastSuccessfullChange = null;

          var _temp16 = _catch(function () {
            /**
             * we cannot run all queries parallel
             * because then we would not know
             * where to start again on errors
             * so we run through the docs in series
             */
            return _forTo(changesWithDocs, function (i) {
              var changeWithDoc = changesWithDocs[i]; // TODO _deleted should be required on type RxDocumentData
              // so we do not need this check here

              if (!changeWithDoc.doc.hasOwnProperty('_deleted')) {
                changeWithDoc.doc._deleted = false;
              }

              return Promise.resolve(_this9.push.queryBuilder(changeWithDoc.doc)).then(function (pushObj) {
                return Promise.resolve(_this9.client.query(pushObj.query, pushObj.variables)).then(function (result) {
                  if (result.errors) {
                    if (typeof result.errors === 'string') {
                      throw new Error(result.errors);
                    } else {
                      var err = new Error('unknown errors occurred - see innerErrors for more details');
                      err.innerErrors = result.errors;
                      throw err;
                    }
                  } else {
                    _this9._subjects.send.next(changeWithDoc.doc);

                    lastSuccessfullChange = changeWithDoc;
                  }
                });
              });
            }, function () {
              return _exit4;
            });
          }, function (err) {
            function _temp12() {
              _this9._subjects.error.next(err);

              _exit4 = true;
              return false;
            }

            var _temp11 = function () {
              if (lastSuccessfullChange) {
                return Promise.resolve(setLastPushSequence(_this9.collection, _this9.endpointHash, lastSuccessfullChange.sequence)).then(function () {});
              }
            }();

            return _temp11 && _temp11.then ? _temp11.then(_temp12) : _temp12(_temp11);
          });

          return _temp16 && _temp16.then ? _temp16.then(_temp17) : _temp17(_temp16);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.handleDocumentsFromRemote = function handleDocumentsFromRemote(docs) {
    try {
      var _this11 = this;

      var toStorageDocs = [];
      var docIds = docs.map(function (doc) {
        return doc[_this11.collection.schema.primaryPath];
      });
      return Promise.resolve(_this11.collection.database.lockedRun(function () {
        return _this11.collection.storageInstance.findDocumentsById(docIds, true);
      })).then(function (docsFromLocal) {
        for (var _iterator = _createForOfIteratorHelperLoose(docs), _step; !(_step = _iterator()).done;) {
          var doc = _step.value;
          var documentId = doc[_this11.collection.schema.primaryPath];
          var deletedValue = doc[_this11.deletedFlag];
          doc._deleted = deletedValue;
          delete doc[_this11.deletedFlag];
          var docStateInLocalStorageInstance = docsFromLocal[documentId];
          var newRevision = createRevisionForPulledDocument(_this11.endpointHash, doc);

          if (docStateInLocalStorageInstance) {
            var hasHeight = getHeightOfRevision(docStateInLocalStorageInstance._rev);
            var newRevisionHeight = hasHeight + 1;
            newRevision = newRevisionHeight + '-' + newRevision;
          } else {
            newRevision = '1-' + newRevision;
          }

          doc._rev = newRevision;
          toStorageDocs.push({
            doc: doc,
            deletedValue: deletedValue
          });
        }

        var _temp18 = function () {
          if (toStorageDocs.length > 0) {
            return Promise.resolve(_this11.collection.database.lockedRun(function () {
              return _this11.collection.storageInstance.bulkAddRevisions(toStorageDocs.map(function (row) {
                return _handleToStorageInstance(_this11.collection, row.doc);
              }));
            })).then(function () {});
          }
        }();

        return _temp18 && _temp18.then ? _temp18.then(function () {
          return true;
        }) : true;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.cancel = function cancel() {
    if (this.isStopped()) {
      return PROMISE_RESOLVE_FALSE;
    }

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });

    this._subjects.canceled.next(true);

    return PROMISE_RESOLVE_TRUE;
  };

  _proto.setHeaders = function setHeaders(headers) {
    this.client = GraphQLClient({
      url: this.url,
      headers: headers
    });
  };

  return RxGraphQLReplicationState;
}();
export function syncGraphQL(_ref) {
  var url = _ref.url,
      _ref$headers = _ref.headers,
      headers = _ref$headers === void 0 ? {} : _ref$headers,
      _ref$waitForLeadershi = _ref.waitForLeadership,
      waitForLeadership = _ref$waitForLeadershi === void 0 ? true : _ref$waitForLeadershi,
      pull = _ref.pull,
      push = _ref.push,
      deletedFlag = _ref.deletedFlag,
      _ref$live = _ref.live,
      live = _ref$live === void 0 ? false : _ref$live,
      _ref$liveInterval = _ref.liveInterval,
      liveInterval = _ref$liveInterval === void 0 ? 1000 * 10 : _ref$liveInterval,
      _ref$retryTime = _ref.retryTime,
      retryTime = _ref$retryTime === void 0 ? 1000 * 5 : _ref$retryTime,
      _ref$autoStart = _ref.autoStart,
      autoStart = _ref$autoStart === void 0 ? true : _ref$autoStart;
  var collection = this; // fill in defaults for pull & push

  if (pull) {
    if (!pull.modifier) pull.modifier = DEFAULT_MODIFIER;
  }

  if (push) {
    if (!push.modifier) push.modifier = DEFAULT_MODIFIER;
  }

  var replicationState = new RxGraphQLReplicationState(collection, url, headers, pull, push, deletedFlag, live, liveInterval, retryTime);

  if (!autoStart) {
    return replicationState;
  } // run internal so .sync() does not have to be async


  var waitTillRun = waitForLeadership && this.database.multiInstance // do not await leadership if not multiInstance
  ? this.database.waitForLeadership() : PROMISE_RESOLVE_VOID;
  waitTillRun.then(function () {
    if (collection.destroyed) {
      return;
    } // trigger run once


    replicationState.run(); // start sync-interval

    if (replicationState.live) {
      if (pull) {
        (function () {
          try {
            var _exit6 = false;
            return _for(function () {
              return !_exit6 && !replicationState.isStopped();
            }, void 0, function () {
              return Promise.resolve(promiseWait(replicationState.liveInterval)).then(function () {
                if (replicationState.isStopped()) {
                  _exit6 = true;
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
         * When a document is written to the collection,
         * we might have to run the replication run() once
         */
        var changeEventsSub = collection.$.pipe(filter(function (cE) {
          return !cE.isLocal;
        })).subscribe(function (changeEvent) {
          if (replicationState.isStopped()) {
            return;
          }

          var doc = getDocumentDataOfRxChangeEvent(changeEvent);
          var rev = doc._rev;

          if (rev && !wasRevisionfromPullReplication(replicationState.endpointHash, rev)) {
            replicationState.run();
          }
        });

        replicationState._subs.push(changeEventsSub);
      }
    }
  });
  return replicationState;
}
export * from './helper';
export * from './crawling-checkpoint';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';
export var rxdb = true;
export var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.syncGraphQL = syncGraphQL;
  }
};
export var RxDBReplicationGraphQLPlugin = {
  name: 'replication-graphql',
  rxdb: rxdb,
  prototypes: prototypes
};
//# sourceMappingURL=index.js.map