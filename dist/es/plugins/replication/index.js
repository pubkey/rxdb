import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

import _regeneratorRuntime from "@babel/runtime/regenerator";
import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { getChangesSinceLastPushSequence, getLastPullDocument, setLastPullDocument, setLastPushSequence } from './replication-checkpoint';
import { flatClone, getHeightOfRevision, lastOfArray, promiseWait, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_TRUE, PROMISE_RESOLVE_VOID } from '../../util';
import { overwritable } from '../../overwritable';
import { createRevisionForPulledDocument, wasRevisionfromPullReplication } from './revision-flag';
import { _handleToStorageInstance } from '../../rx-collection-helper';
import { newRxError } from '../../rx-error';
import { getDocumentDataOfRxChangeEvent } from '../../rx-change-event';
export var RxReplicationStateBase = /*#__PURE__*/function () {
  /**
   * Counts how many times the run() method
   * has been called. Used in tests.
   */
  function RxReplicationStateBase(replicationIdentifier, collection, pull, push, live, liveInterval, retryTime) {
    var _this = this;

    this.subs = [];
    this.initialReplicationComplete$ = undefined;
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
    this.runningPromise = PROMISE_RESOLVE_VOID;
    this.runQueueCount = 0;
    this.runCount = 0;
    this.replicationIdentifier = replicationIdentifier;
    this.collection = collection;
    this.pull = pull;
    this.push = push;
    this.live = live;
    this.liveInterval = liveInterval;
    this.retryTime = retryTime;
    // stop the replication when the collection gets destroyed
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
  }

  var _proto = RxReplicationStateBase.prototype;

  _proto.isStopped = function isStopped() {
    if (this.collection.destroyed) {
      return true;
    }

    if (!this.live && this.subjects.initialReplicationComplete.getValue()) {
      return true;
    }

    if (this.subjects.canceled['_value']) {
      return true;
    }

    return false;
  };

  _proto.awaitInitialReplication = function awaitInitialReplication() {
    return firstValueFrom(this.initialReplicationComplete$.pipe(filter(function (v) {
      return v === true;
    })));
  };

  _proto.cancel = function cancel() {
    if (this.isStopped()) {
      return PROMISE_RESOLVE_FALSE;
    }

    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    this.subjects.canceled.next(true);
    return PROMISE_RESOLVE_TRUE;
  }
  /**
   * Ensures that this._run() does not run in parallel
   */
  ;

  _proto.run =
  /*#__PURE__*/
  function () {
    var _run2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
      var _this2 = this;

      var retryOnFail,
          _args2 = arguments;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              retryOnFail = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : true;

              if (!this.isStopped()) {
                _context2.next = 3;
                break;
              }

              return _context2.abrupt("return");

            case 3:
              if (!(this.runQueueCount > 2)) {
                _context2.next = 5;
                break;
              }

              return _context2.abrupt("return", this.runningPromise);

            case 5:
              this.runQueueCount++;
              this.runningPromise = this.runningPromise.then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
                var willRetry;
                return _regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _this2.subjects.active.next(true);

                        _context.next = 3;
                        return _this2._run(retryOnFail);

                      case 3:
                        willRetry = _context.sent;

                        _this2.subjects.active.next(false);

                        if (retryOnFail && !willRetry && _this2.subjects.initialReplicationComplete.getValue() === false) {
                          _this2.subjects.initialReplicationComplete.next(true);
                        }

                        _this2.runQueueCount--;

                      case 7:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              })));
              return _context2.abrupt("return", this.runningPromise);

            case 8:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function run() {
      return _run2.apply(this, arguments);
    }

    return run;
  }()
  /**
   * Runs the whole cycle once,
   * first pushes the local changes to the remote,
   * then pulls the remote changes to the local.
   * Returns true if a retry must be done
   */
  ;

  _proto._run =
  /*#__PURE__*/
  function () {
    var _run3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
      var _this3 = this;

      var retryOnFail,
          ok,
          _ok,
          _args3 = arguments;

      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              retryOnFail = _args3.length > 0 && _args3[0] !== undefined ? _args3[0] : true;
              this.runCount++;

              if (!this.push) {
                _context3.next = 9;
                break;
              }

              _context3.next = 5;
              return this.runPush();

            case 5:
              ok = _context3.sent;

              if (!(!ok && retryOnFail)) {
                _context3.next = 9;
                break;
              }

              setTimeout(function () {
                return _this3.run();
              }, this.retryTime);
              /*
                  Because we assume that conflicts are solved on the server side,
                  if push failed, do not attempt to pull before push was successful
                  otherwise we do not know how to merge changes with the local state
              */

              return _context3.abrupt("return", true);

            case 9:
              if (!this.pull) {
                _context3.next = 16;
                break;
              }

              _context3.next = 12;
              return this.runPull();

            case 12:
              _ok = _context3.sent;

              if (!(!_ok && retryOnFail)) {
                _context3.next = 16;
                break;
              }

              setTimeout(function () {
                return _this3.run();
              }, this.retryTime);
              return _context3.abrupt("return", true);

            case 16:
              return _context3.abrupt("return", false);

            case 17:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function _run() {
      return _run3.apply(this, arguments);
    }

    return _run;
  }()
  /**
   * Pull all changes from the server,
   * start from the last pulled change.
   * @return true if successfully, false if something errored
   */
  ;

  _proto.runPull =
  /*#__PURE__*/
  function () {
    var _runPull = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
      var _this4 = this;

      var latestDocument, result, pulledDocuments, newLatestDocument;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              if (this.pull) {
                _context4.next = 2;
                break;
              }

              throw newRxError('SNH');

            case 2:
              if (!this.isStopped()) {
                _context4.next = 4;
                break;
              }

              return _context4.abrupt("return", PROMISE_RESOLVE_FALSE);

            case 4:
              _context4.next = 6;
              return getLastPullDocument(this.collection, this.replicationIdentifier);

            case 6:
              latestDocument = _context4.sent;
              _context4.prev = 7;
              _context4.next = 10;
              return this.pull.handler(latestDocument);

            case 10:
              result = _context4.sent;
              _context4.next = 17;
              break;

            case 13:
              _context4.prev = 13;
              _context4.t0 = _context4["catch"](7);
              this.subjects.error.next(_context4.t0);
              return _context4.abrupt("return", false);

            case 17:
              pulledDocuments = result.documents; // optimization shortcut, do not proceed if there are no documents.

              if (!(pulledDocuments.length === 0)) {
                _context4.next = 20;
                break;
              }

              return _context4.abrupt("return", true);

            case 20:
              if (!overwritable.isDevMode()) {
                _context4.next = 29;
                break;
              }

              _context4.prev = 21;
              pulledDocuments.forEach(function (doc) {
                var withoutDeleteFlag = flatClone(doc);
                delete withoutDeleteFlag._deleted;

                _this4.collection.schema.validate(withoutDeleteFlag);
              });
              _context4.next = 29;
              break;

            case 25:
              _context4.prev = 25;
              _context4.t1 = _context4["catch"](21);
              this.subjects.error.next(_context4.t1);
              return _context4.abrupt("return", false);

            case 29:
              if (!this.isStopped()) {
                _context4.next = 31;
                break;
              }

              return _context4.abrupt("return", true);

            case 31:
              _context4.next = 33;
              return this.handleDocumentsFromRemote(pulledDocuments);

            case 33:
              pulledDocuments.map(function (doc) {
                return _this4.subjects.received.next(doc);
              });

              if (!(pulledDocuments.length === 0)) {
                _context4.next = 38;
                break;
              }

              if (this.live) {// console.log('no more docs, wait for ping');
              } else {// console.log('RxGraphQLReplicationState._run(): no more docs and not live; complete = true');
              }

              _context4.next = 44;
              break;

            case 38:
              newLatestDocument = lastOfArray(pulledDocuments);
              _context4.next = 41;
              return setLastPullDocument(this.collection, this.replicationIdentifier, newLatestDocument);

            case 41:
              if (!result.hasMoreDocuments) {
                _context4.next = 44;
                break;
              }

              _context4.next = 44;
              return this.runPull();

            case 44:
              return _context4.abrupt("return", true);

            case 45:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, this, [[7, 13], [21, 25]]);
    }));

    function runPull() {
      return _runPull.apply(this, arguments);
    }

    return runPull;
  }();

  _proto.handleDocumentsFromRemote = /*#__PURE__*/function () {
    var _handleDocumentsFromRemote = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(docs) {
      var _this5 = this;

      var toStorageDocs, docIds, docsFromLocal, _iterator, _step, originalDoc, doc, documentId, docStateInLocalStorageInstance, newRevision, hasHeight, newRevisionHeight;

      return _regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              toStorageDocs = [];
              docIds = docs.map(function (doc) {
                return doc[_this5.collection.schema.primaryPath];
              });
              _context6.next = 4;
              return this.collection.storageInstance.findDocumentsById(docIds, true);

            case 4:
              docsFromLocal = _context6.sent;

              for (_iterator = _createForOfIteratorHelperLoose(docs); !(_step = _iterator()).done;) {
                originalDoc = _step.value;
                doc = flatClone(originalDoc);
                documentId = doc[this.collection.schema.primaryPath];
                docStateInLocalStorageInstance = docsFromLocal.get(documentId);
                newRevision = createRevisionForPulledDocument(this.replicationIdentifier, doc);

                if (docStateInLocalStorageInstance) {
                  hasHeight = getHeightOfRevision(docStateInLocalStorageInstance._rev);
                  newRevisionHeight = hasHeight + 1;
                  newRevision = newRevisionHeight + '-' + newRevision;
                } else {
                  newRevision = '1-' + newRevision;
                }

                doc._rev = newRevision;
                toStorageDocs.push(doc);
              }

              if (!(toStorageDocs.length > 0)) {
                _context6.next = 9;
                break;
              }

              _context6.next = 9;
              return this.collection.database.lockedRun( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
                return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                  while (1) {
                    switch (_context5.prev = _context5.next) {
                      case 0:
                        _context5.next = 2;
                        return _this5.collection.storageInstance.bulkAddRevisions(toStorageDocs.map(function (doc) {
                          return _handleToStorageInstance(_this5.collection, doc);
                        }));

                      case 2:
                      case "end":
                        return _context5.stop();
                    }
                  }
                }, _callee5);
              })));

            case 9:
              return _context6.abrupt("return", true);

            case 10:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));

    function handleDocumentsFromRemote(_x) {
      return _handleDocumentsFromRemote.apply(this, arguments);
    }

    return handleDocumentsFromRemote;
  }()
  /**
   * Pushes unreplicated local changes to the remote.
   * @return true if successfull, false if not
   */
  ;

  _proto.runPush =
  /*#__PURE__*/
  function () {
    var _runPush = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7() {
      var _this6 = this;

      var batchSize, changesResult, pushDocs;
      return _regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              if (this.push) {
                _context7.next = 2;
                break;
              }

              throw newRxError('SNH');

            case 2:
              batchSize = this.push.batchSize ? this.push.batchSize : 5;
              _context7.next = 5;
              return getChangesSinceLastPushSequence(this.collection, this.replicationIdentifier, batchSize);

            case 5:
              changesResult = _context7.sent;
              pushDocs = Array.from(changesResult.changedDocs.values()).map(function (row) {
                var doc = flatClone(row.doc); // TODO _deleted should be required on type RxDocumentData
                // so we do not need this check here

                if (!doc.hasOwnProperty('_deleted')) {
                  doc._deleted = false;
                }

                delete doc._rev;
                delete doc._attachments;
                return doc;
              });
              _context7.prev = 7;
              _context7.next = 10;
              return this.push.handler(pushDocs);

            case 10:
              _context7.next = 16;
              break;

            case 12:
              _context7.prev = 12;
              _context7.t0 = _context7["catch"](7);
              this.subjects.error.next(_context7.t0);
              return _context7.abrupt("return", false);

            case 16:
              pushDocs.forEach(function (pushDoc) {
                return _this6.subjects.send.next(pushDoc);
              });
              _context7.next = 19;
              return setLastPushSequence(this.collection, this.replicationIdentifier, changesResult.lastSequence);

            case 19:
              if (!(changesResult.changedDocs.size !== 0)) {
                _context7.next = 22;
                break;
              }

              _context7.next = 22;
              return this.runPush();

            case 22:
              return _context7.abrupt("return", true);

            case 23:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7, this, [[7, 12]]);
    }));

    function runPush() {
      return _runPush.apply(this, arguments);
    }

    return runPush;
  }();

  return RxReplicationStateBase;
}();
export function replicateRxCollection(_x2) {
  return _replicateRxCollection.apply(this, arguments);
}

function _replicateRxCollection() {
  _replicateRxCollection = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9(_ref3) {
    var replicationIdentifier, collection, pull, push, _ref3$live, live, _ref3$liveInterval, liveInterval, _ref3$retryTime, retryTime, waitForLeadership, replicationState, changeEventsSub;

    return _regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            replicationIdentifier = _ref3.replicationIdentifier, collection = _ref3.collection, pull = _ref3.pull, push = _ref3.push, _ref3$live = _ref3.live, live = _ref3$live === void 0 ? false : _ref3$live, _ref3$liveInterval = _ref3.liveInterval, liveInterval = _ref3$liveInterval === void 0 ? 1000 * 10 : _ref3$liveInterval, _ref3$retryTime = _ref3.retryTime, retryTime = _ref3$retryTime === void 0 ? 1000 * 5 : _ref3$retryTime, waitForLeadership = _ref3.waitForLeadership;

            if (!(waitForLeadership && // do not await leadership if not multiInstance
            collection.database.multiInstance)) {
              _context9.next = 4;
              break;
            }

            _context9.next = 4;
            return collection.database.waitForLeadership();

          case 4:
            replicationState = new RxReplicationStateBase(replicationIdentifier, collection, pull, push, live, liveInterval, retryTime); // trigger run once

            replicationState.run(); // start sync-interval

            if (replicationState.live) {
              if (pull) {
                _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8() {
                  return _regeneratorRuntime.wrap(function _callee8$(_context8) {
                    while (1) {
                      switch (_context8.prev = _context8.next) {
                        case 0:
                          if (replicationState.isStopped()) {
                            _context8.next = 9;
                            break;
                          }

                          _context8.next = 3;
                          return promiseWait(replicationState.liveInterval);

                        case 3:
                          if (!replicationState.isStopped()) {
                            _context8.next = 5;
                            break;
                          }

                          return _context8.abrupt("return");

                        case 5:
                          _context8.next = 7;
                          return replicationState.run( // do not retry on liveInterval-runs because they might stack up
                          // when failing
                          false);

                        case 7:
                          _context8.next = 0;
                          break;

                        case 9:
                        case "end":
                          return _context8.stop();
                      }
                    }
                  }, _callee8);
                }))();
              }

              if (push) {
                /**
                 * When a document is written to the collection,
                 * we might have to run the replication run() once
                 */
                changeEventsSub = collection.$.pipe(filter(function (cE) {
                  return !cE.isLocal;
                })).subscribe(function (changeEvent) {
                  if (replicationState.isStopped()) {
                    return;
                  }

                  var doc = getDocumentDataOfRxChangeEvent(changeEvent);
                  var rev = doc._rev;

                  if (rev && !wasRevisionfromPullReplication(replicationIdentifier, rev)) {
                    replicationState.run();
                  }
                });
                replicationState.subs.push(changeEventsSub);
              }
            }

            return _context9.abrupt("return", replicationState);

          case 8:
          case "end":
            return _context9.stop();
        }
      }
    }, _callee9);
  }));
  return _replicateRxCollection.apply(this, arguments);
}

export * from './replication-checkpoint';
export * from './revision-flag';
//# sourceMappingURL=index.js.map