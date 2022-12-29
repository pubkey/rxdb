import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
/**
 * This plugin contains the primitives to create
 * a RxDB client-server replication.
 * It is used in the other replication plugins
 * but also can be used as standalone with a custom replication handler.
 */

import { BehaviorSubject, combineLatest, mergeMap, Subject } from 'rxjs';
import { ensureNotFalsy, errorToPlainJson, fastUnsecureHash, flatClone, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_TRUE, toArray } from '../../util';
import { awaitRxStorageReplicationFirstInSync, awaitRxStorageReplicationInSync, cancelRxStorageReplication, replicateRxStorageInstance, RX_REPLICATION_META_INSTANCE_SCHEMA } from '../../replication-protocol';
import { newRxError } from '../../rx-error';
import { awaitRetry, DEFAULT_MODIFIER, swapDefaultDeletedTodeletedField, swapdeletedFieldToDefaultDeleted } from './replication-helper';
import { addConnectedStorageToCollection } from '../../rx-database-internal-store';
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
  _proto.start = /*#__PURE__*/function () {
    var _start = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
      var _this2 = this;
      var pullModifier, pushModifier, database, metaInstanceCollectionName, _yield$Promise$all, metaInstance;
      return _regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            if (!this.isStopped()) {
              _context5.next = 2;
              break;
            }
            return _context5.abrupt("return");
          case 2:
            // fill in defaults for pull & push
            pullModifier = this.pull && this.pull.modifier ? this.pull.modifier : DEFAULT_MODIFIER;
            pushModifier = this.push && this.push.modifier ? this.push.modifier : DEFAULT_MODIFIER;
            database = this.collection.database;
            metaInstanceCollectionName = this.collection.name + '-rx-replication-' + this.replicationIdentifierHash;
            _context5.next = 8;
            return Promise.all([this.collection.database.storage.createStorageInstance({
              databaseName: database.name,
              collectionName: metaInstanceCollectionName,
              databaseInstanceToken: database.token,
              multiInstance: database.multiInstance,
              // TODO is this always false?
              options: {},
              schema: RX_REPLICATION_META_INSTANCE_SCHEMA
            }), addConnectedStorageToCollection(this.collection, metaInstanceCollectionName, RX_REPLICATION_META_INSTANCE_SCHEMA)]);
          case 8:
            _yield$Promise$all = _context5.sent;
            metaInstance = _yield$Promise$all[0];
            this.metaInstance = metaInstance;
            this.internalReplicationState = replicateRxStorageInstance({
              pushBatchSize: this.push && this.push.batchSize ? this.push.batchSize : 100,
              pullBatchSize: this.pull && this.pull.batchSize ? this.pull.batchSize : 100,
              forkInstance: this.collection.storageInstance,
              metaInstance: this.metaInstance,
              hashFunction: database.hashFunction,
              identifier: 'rx-replication-' + this.replicationIdentifierHash,
              conflictHandler: this.collection.conflictHandler,
              replicationHandler: {
                masterChangeStream$: this.remoteEvents$.asObservable().pipe(mergeMap( /*#__PURE__*/function () {
                  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(ev) {
                    var useEv;
                    return _regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) switch (_context.prev = _context.next) {
                        case 0:
                          if (!(ev === 'RESYNC')) {
                            _context.next = 2;
                            break;
                          }
                          return _context.abrupt("return", ev);
                        case 2:
                          useEv = flatClone(ev);
                          if (_this2.deletedField !== '_deleted') {
                            useEv.documents = useEv.documents.map(function (doc) {
                              return swapdeletedFieldToDefaultDeleted(_this2.deletedField, doc);
                            });
                          }
                          _context.next = 6;
                          return Promise.all(useEv.documents.map(function (d) {
                            return pullModifier(d);
                          }));
                        case 6:
                          useEv.documents = _context.sent;
                          return _context.abrupt("return", useEv);
                        case 8:
                        case "end":
                          return _context.stop();
                      }
                    }, _callee);
                  }));
                  return function (_x) {
                    return _ref.apply(this, arguments);
                  };
                }())),
                masterChangesSince: function () {
                  var _masterChangesSince = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(checkpoint, batchSize) {
                    var done, result, emitError, useResult;
                    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                      while (1) switch (_context2.prev = _context2.next) {
                        case 0:
                          if (_this2.pull) {
                            _context2.next = 2;
                            break;
                          }
                          return _context2.abrupt("return", {
                            checkpoint: null,
                            documents: []
                          });
                        case 2:
                          /**
                           * Retries must be done here in the replication primitives plugin,
                           * because the replication protocol itself has no
                           * error handling.
                           */
                          done = false;
                          result = {};
                        case 4:
                          if (!(!done && !_this2.isStopped())) {
                            _context2.next = 20;
                            break;
                          }
                          _context2.prev = 5;
                          _context2.next = 8;
                          return _this2.pull.handler(checkpoint, batchSize);
                        case 8:
                          result = _context2.sent;
                          done = true;
                          _context2.next = 18;
                          break;
                        case 12:
                          _context2.prev = 12;
                          _context2.t0 = _context2["catch"](5);
                          emitError = newRxError('RC_PULL', {
                            checkpoint: checkpoint,
                            errors: toArray(_context2.t0).map(function (er) {
                              return errorToPlainJson(er);
                            }),
                            direction: 'pull'
                          });
                          _this2.subjects.error.next(emitError);
                          _context2.next = 18;
                          return awaitRetry(_this2.collection, ensureNotFalsy(_this2.retryTime));
                        case 18:
                          _context2.next = 4;
                          break;
                        case 20:
                          if (!_this2.isStopped()) {
                            _context2.next = 22;
                            break;
                          }
                          return _context2.abrupt("return", {
                            checkpoint: null,
                            documents: []
                          });
                        case 22:
                          useResult = flatClone(result);
                          if (_this2.deletedField !== '_deleted') {
                            useResult.documents = useResult.documents.map(function (doc) {
                              return swapdeletedFieldToDefaultDeleted(_this2.deletedField, doc);
                            });
                          }
                          _context2.next = 26;
                          return Promise.all(useResult.documents.map(function (d) {
                            return pullModifier(d);
                          }));
                        case 26:
                          useResult.documents = _context2.sent;
                          return _context2.abrupt("return", useResult);
                        case 28:
                        case "end":
                          return _context2.stop();
                      }
                    }, _callee2, null, [[5, 12]]);
                  }));
                  function masterChangesSince(_x2, _x3) {
                    return _masterChangesSince.apply(this, arguments);
                  }
                  return masterChangesSince;
                }(),
                masterWrite: function () {
                  var _masterWrite = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(rows) {
                    var done, useRows, result, emitError, conflicts;
                    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                      while (1) switch (_context4.prev = _context4.next) {
                        case 0:
                          if (_this2.push) {
                            _context4.next = 2;
                            break;
                          }
                          return _context4.abrupt("return", []);
                        case 2:
                          done = false;
                          _context4.next = 5;
                          return Promise.all(rows.map( /*#__PURE__*/function () {
                            var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(row) {
                              return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                                while (1) switch (_context3.prev = _context3.next) {
                                  case 0:
                                    _context3.next = 2;
                                    return pushModifier(row.newDocumentState);
                                  case 2:
                                    row.newDocumentState = _context3.sent;
                                    if (!row.assumedMasterState) {
                                      _context3.next = 7;
                                      break;
                                    }
                                    _context3.next = 6;
                                    return pushModifier(row.assumedMasterState);
                                  case 6:
                                    row.assumedMasterState = _context3.sent;
                                  case 7:
                                    if (_this2.deletedField !== '_deleted') {
                                      row.newDocumentState = swapDefaultDeletedTodeletedField(_this2.deletedField, row.newDocumentState);
                                      if (row.assumedMasterState) {
                                        row.assumedMasterState = swapDefaultDeletedTodeletedField(_this2.deletedField, row.assumedMasterState);
                                      }
                                    }
                                    return _context3.abrupt("return", row);
                                  case 9:
                                  case "end":
                                    return _context3.stop();
                                }
                              }, _callee3);
                            }));
                            return function (_x5) {
                              return _ref2.apply(this, arguments);
                            };
                          }()));
                        case 5:
                          useRows = _context4.sent;
                          result = null;
                        case 7:
                          if (!(!done && !_this2.isStopped())) {
                            _context4.next = 25;
                            break;
                          }
                          _context4.prev = 8;
                          _context4.next = 11;
                          return _this2.push.handler(useRows);
                        case 11:
                          result = _context4.sent;
                          if (Array.isArray(result)) {
                            _context4.next = 14;
                            break;
                          }
                          throw newRxError('RC_PUSH_NO_AR', {
                            pushRows: rows,
                            direction: 'push',
                            args: {
                              result: result
                            }
                          });
                        case 14:
                          done = true;
                          _context4.next = 23;
                          break;
                        case 17:
                          _context4.prev = 17;
                          _context4.t0 = _context4["catch"](8);
                          emitError = _context4.t0.rxdb ? _context4.t0 : newRxError('RC_PUSH', {
                            pushRows: rows,
                            errors: toArray(_context4.t0).map(function (er) {
                              return errorToPlainJson(er);
                            }),
                            direction: 'push'
                          });
                          _this2.subjects.error.next(emitError);
                          _context4.next = 23;
                          return awaitRetry(_this2.collection, ensureNotFalsy(_this2.retryTime));
                        case 23:
                          _context4.next = 7;
                          break;
                        case 25:
                          if (!_this2.isStopped()) {
                            _context4.next = 27;
                            break;
                          }
                          return _context4.abrupt("return", []);
                        case 27:
                          conflicts = ensureNotFalsy(result).map(function (doc) {
                            return swapdeletedFieldToDefaultDeleted(_this2.deletedField, doc);
                          });
                          return _context4.abrupt("return", conflicts);
                        case 29:
                        case "end":
                          return _context4.stop();
                      }
                    }, _callee4, null, [[8, 17]]);
                  }));
                  function masterWrite(_x4) {
                    return _masterWrite.apply(this, arguments);
                  }
                  return masterWrite;
                }()
              }
            });
            this.subs.push(this.internalReplicationState.events.error.subscribe(function (err) {
              _this2.subjects.error.next(err);
            }), this.internalReplicationState.events.processed.down.subscribe(function (row) {
              return _this2.subjects.received.next(row.document);
            }), this.internalReplicationState.events.processed.up.subscribe(function (writeToMasterRow) {
              _this2.subjects.send.next(writeToMasterRow.newDocumentState);
            }), combineLatest([this.internalReplicationState.events.active.down, this.internalReplicationState.events.active.up]).subscribe(function (_ref3) {
              var down = _ref3[0],
                up = _ref3[1];
              var isActive = down || up;
              _this2.subjects.active.next(isActive);
            }));
            if (this.pull && this.pull.stream$ && this.live) {
              this.subs.push(this.pull.stream$.subscribe({
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
            if (this.live) {
              _context5.next = 21;
              break;
            }
            _context5.next = 17;
            return awaitRxStorageReplicationFirstInSync(this.internalReplicationState);
          case 17:
            _context5.next = 19;
            return awaitRxStorageReplicationInSync(this.internalReplicationState);
          case 19:
            _context5.next = 21;
            return this.cancel();
          case 21:
            this.callOnStart();
          case 22:
          case "end":
            return _context5.stop();
        }
      }, _callee5, this);
    }));
    function start() {
      return _start.apply(this, arguments);
    }
    return start;
  }();
  _proto.isStopped = function isStopped() {
    if (this.subjects.canceled.getValue()) {
      return true;
    }
    return false;
  };
  _proto.awaitInitialReplication = /*#__PURE__*/function () {
    var _awaitInitialReplication = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6() {
      return _regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return this.startPromise;
          case 2:
            return _context6.abrupt("return", awaitRxStorageReplicationFirstInSync(ensureNotFalsy(this.internalReplicationState)));
          case 3:
          case "end":
            return _context6.stop();
        }
      }, _callee6, this);
    }));
    function awaitInitialReplication() {
      return _awaitInitialReplication.apply(this, arguments);
    }
    return awaitInitialReplication;
  }()
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
  _proto.awaitInSync =
  /*#__PURE__*/
  function () {
    var _awaitInSync = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7() {
      return _regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return this.startPromise;
          case 2:
            _context7.next = 4;
            return awaitRxStorageReplicationFirstInSync(ensureNotFalsy(this.internalReplicationState));
          case 4:
            _context7.next = 6;
            return this.collection.database.requestIdlePromise();
          case 6:
            _context7.next = 8;
            return awaitRxStorageReplicationInSync(ensureNotFalsy(this.internalReplicationState));
          case 8:
            return _context7.abrupt("return", true);
          case 9:
          case "end":
            return _context7.stop();
        }
      }, _callee7, this);
    }));
    function awaitInSync() {
      return _awaitInSync.apply(this, arguments);
    }
    return awaitInSync;
  }();
  _proto.reSync = function reSync() {
    this.remoteEvents$.next('RESYNC');
  };
  _proto.emitEvent = function emitEvent(ev) {
    this.remoteEvents$.next(ev);
  };
  _proto.cancel = function cancel() {
    var _this3 = this;
    if (this.isStopped()) {
      return PROMISE_RESOLVE_FALSE;
    }
    var promises = [];
    if (this.internalReplicationState) {
      cancelRxStorageReplication(this.internalReplicationState);
    }
    if (this.metaInstance) {
      promises.push(ensureNotFalsy(this.internalReplicationState).checkpointQueue.then(function () {
        return ensureNotFalsy(_this3.metaInstance).close();
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
export function replicateRxCollection(_ref4) {
  var replicationIdentifier = _ref4.replicationIdentifier,
    collection = _ref4.collection,
    _ref4$deletedField = _ref4.deletedField,
    deletedField = _ref4$deletedField === void 0 ? '_deleted' : _ref4$deletedField,
    pull = _ref4.pull,
    push = _ref4.push,
    _ref4$live = _ref4.live,
    live = _ref4$live === void 0 ? true : _ref4$live,
    _ref4$retryTime = _ref4.retryTime,
    retryTime = _ref4$retryTime === void 0 ? 1000 * 5 : _ref4$retryTime,
    _ref4$waitForLeadersh = _ref4.waitForLeadership,
    waitForLeadership = _ref4$waitForLeadersh === void 0 ? true : _ref4$waitForLeadersh,
    _ref4$autoStart = _ref4.autoStart,
    autoStart = _ref4$autoStart === void 0 ? true : _ref4$autoStart;
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