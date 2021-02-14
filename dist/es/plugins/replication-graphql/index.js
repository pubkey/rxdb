import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } it = o[Symbol.iterator](); return it.next.bind(it); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import { BehaviorSubject, Subject } from 'rxjs';
import { first, filter } from 'rxjs/operators';
import GraphQLClient from 'graphql-client';
import { promiseWait, flatClone, now } from '../../util';
import { addRxPlugin } from '../../core';
import { hash } from '../../util';
import { DEFAULT_MODIFIER, wasRevisionfromPullReplication, createRevisionForPulledDocument, getDocsWithRevisionsFromPouch } from './helper';
import { setLastPushSequence, getLastPullDocument, setLastPullDocument, getChangesSinceLastPushSequence } from './crawling-checkpoint';
import { RxDBWatchForChangesPlugin } from '../watch-for-changes';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { changeEventfromPouchChange } from '../../rx-change-event';
import { overwritable } from '../../overwritable';
addRxPlugin(RxDBLeaderElectionPlugin);
/**
 * add the watch-for-changes-plugin
 * so pouchdb will emit events when something gets written to it
 */

addRxPlugin(RxDBWatchForChangesPlugin);
export var RxGraphQLReplicationState = /*#__PURE__*/function () {
  function RxGraphQLReplicationState(collection, url, headers, pull, push, deletedFlag, lastPulledRevField, live, liveInterval, retryTime, syncRevisions) {
    this._subjects = {
      recieved: new Subject(),
      // all documents that are recieved from the endpoint
      send: new Subject(),
      // all documents that are send to the endpoint
      error: new Subject(),
      // all errors that are revieced from the endpoint, emits new Error() objects
      canceled: new BehaviorSubject(false),
      // true when the replication was canceled
      active: new BehaviorSubject(false),
      // true when something is running, false when not
      initialReplicationComplete: new BehaviorSubject(false) // true the initial replication-cycle is over

    };
    this._runningPromise = Promise.resolve();
    this._subs = [];
    this._runQueueCount = 0;
    this._runCount = 0;
    this.initialReplicationComplete$ = undefined;
    this.recieved$ = undefined;
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
    this.lastPulledRevField = lastPulledRevField;
    this.live = live;
    this.liveInterval = liveInterval;
    this.retryTime = retryTime;
    this.syncRevisions = syncRevisions;
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
    if (!this.live && this._subjects.initialReplicationComplete['_value']) return true;
    if (this._subjects.canceled['_value']) return true;else return false;
  };

  _proto.awaitInitialReplication = function awaitInitialReplication() {
    return this.initialReplicationComplete$.pipe(filter(function (v) {
      return v === true;
    }), first()).toPromise();
  } // ensures this._run() does not run in parallel
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
              if (!(this._runQueueCount > 2)) {
                _context2.next = 5;
                break;
              }

              return _context2.abrupt("return", this._runningPromise);

            case 5:
              this._runQueueCount++;
              this._runningPromise = this._runningPromise.then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
                var willRetry;
                return _regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _this2._subjects.active.next(true);

                        _context.next = 3;
                        return _this2._run(retryOnFail);

                      case 3:
                        willRetry = _context.sent;

                        _this2._subjects.active.next(false);

                        if (retryOnFail && !willRetry && _this2._subjects.initialReplicationComplete['_value'] === false) {
                          _this2._subjects.initialReplicationComplete.next(true);
                        }

                        _this2._runQueueCount--;

                      case 7:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              })));
              return _context2.abrupt("return", this._runningPromise);

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
   * returns true if retry must be done
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
              this._runCount++;

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
   * @return true if sucessfull
   */
  ;

  _proto.runPull =
  /*#__PURE__*/
  function () {
    var _runPull = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
      var _this4 = this;

      var latestDocument, latestDocumentData, pullGraphQL, result, err, data, modified, docIds, docsWithRevisions, newLatestDocument;
      return _regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              if (!this.isStopped()) {
                _context5.next = 2;
                break;
              }

              return _context5.abrupt("return", Promise.resolve(false));

            case 2:
              _context5.next = 4;
              return getLastPullDocument(this.collection, this.endpointHash);

            case 4:
              latestDocument = _context5.sent;
              latestDocumentData = latestDocument ? latestDocument : null;
              _context5.next = 8;
              return this.pull.queryBuilder(latestDocumentData);

            case 8:
              pullGraphQL = _context5.sent;
              _context5.prev = 9;
              _context5.next = 12;
              return this.client.query(pullGraphQL.query, pullGraphQL.variables);

            case 12:
              result = _context5.sent;

              if (!result.errors) {
                _context5.next = 21;
                break;
              }

              if (!(typeof result.errors === 'string')) {
                _context5.next = 18;
                break;
              }

              throw new Error(result.errors);

            case 18:
              err = new Error('unknown errors occured - see innerErrors for more details');
              err.innerErrors = result.errors;
              throw err;

            case 21:
              _context5.next = 27;
              break;

            case 23:
              _context5.prev = 23;
              _context5.t0 = _context5["catch"](9);

              this._subjects.error.next(_context5.t0);

              return _context5.abrupt("return", false);

            case 27:
              // this assumes that there will be always only one property in the response
              // is this correct?
              data = result.data[Object.keys(result.data)[0]];
              _context5.next = 30;
              return Promise.all(data.map( /*#__PURE__*/function () {
                var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(doc) {
                  return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                    while (1) {
                      switch (_context4.prev = _context4.next) {
                        case 0:
                          _context4.next = 2;
                          return _this4.pull.modifier(doc);

                        case 2:
                          return _context4.abrupt("return", _context4.sent);

                        case 3:
                        case "end":
                          return _context4.stop();
                      }
                    }
                  }, _callee4);
                }));

                return function (_x) {
                  return _ref2.apply(this, arguments);
                };
              }()));

            case 30:
              modified = _context5.sent.filter(function (doc) {
                return !!doc;
              });

              if (!overwritable.isDevMode()) {
                _context5.next = 40;
                break;
              }

              _context5.prev = 32;
              modified.forEach(function (doc) {
                var withoutDeleteFlag = Object.assign({}, doc);
                delete withoutDeleteFlag[_this4.deletedFlag];
                delete withoutDeleteFlag._revisions;

                _this4.collection.schema.validate(withoutDeleteFlag);
              });
              _context5.next = 40;
              break;

            case 36:
              _context5.prev = 36;
              _context5.t1 = _context5["catch"](32);

              this._subjects.error.next(_context5.t1);

              return _context5.abrupt("return", false);

            case 40:
              docIds = modified.map(function (doc) {
                return doc[_this4.collection.schema.primaryPath];
              });
              _context5.next = 43;
              return getDocsWithRevisionsFromPouch(this.collection, docIds);

            case 43:
              docsWithRevisions = _context5.sent;
              _context5.next = 46;
              return this.handleDocumentsFromRemote(modified, docsWithRevisions);

            case 46:
              modified.map(function (doc) {
                return _this4._subjects.recieved.next(doc);
              });

              if (!(modified.length === 0)) {
                _context5.next = 51;
                break;
              }

              if (this.live) {// console.log('no more docs, wait for ping');
              } else {// console.log('RxGraphQLReplicationState._run(): no more docs and not live; complete = true');
                }

              _context5.next = 56;
              break;

            case 51:
              newLatestDocument = modified[modified.length - 1];
              _context5.next = 54;
              return setLastPullDocument(this.collection, this.endpointHash, newLatestDocument);

            case 54:
              _context5.next = 56;
              return this.runPull();

            case 56:
              return _context5.abrupt("return", true);

            case 57:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, this, [[9, 23], [32, 36]]);
    }));

    function runPull() {
      return _runPull.apply(this, arguments);
    }

    return runPull;
  }()
  /**
   * @return true if successfull, false if not
   */
  ;

  _proto.runPush =
  /*#__PURE__*/
  function () {
    var _runPush = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7() {
      var _this5 = this;

      var changes, changesWithDocs, lastSuccessfullChange, i, changeWithDoc, pushObj, result, err;
      return _regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              _context7.next = 2;
              return getChangesSinceLastPushSequence(this.collection, this.endpointHash, this.lastPulledRevField, this.push.batchSize, this.syncRevisions);

            case 2:
              changes = _context7.sent;
              _context7.next = 5;
              return Promise.all(changes.results.map( /*#__PURE__*/function () {
                var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(change) {
                  var doc, seq;
                  return _regeneratorRuntime.wrap(function _callee6$(_context6) {
                    while (1) {
                      switch (_context6.prev = _context6.next) {
                        case 0:
                          doc = change['doc'];
                          doc[_this5.deletedFlag] = !!change['deleted'];
                          delete doc._deleted;
                          delete doc._attachments;
                          delete doc[_this5.lastPulledRevField];

                          if (!_this5.syncRevisions) {
                            delete doc._rev;
                          }

                          _context6.next = 8;
                          return _this5.push.modifier(doc);

                        case 8:
                          doc = _context6.sent;

                          if (doc) {
                            _context6.next = 11;
                            break;
                          }

                          return _context6.abrupt("return", null);

                        case 11:
                          seq = change.seq;
                          return _context6.abrupt("return", {
                            doc: doc,
                            seq: seq
                          });

                        case 13:
                        case "end":
                          return _context6.stop();
                      }
                    }
                  }, _callee6);
                }));

                return function (_x2) {
                  return _ref3.apply(this, arguments);
                };
              }()));

            case 5:
              changesWithDocs = _context7.sent.filter(function (doc) {
                return doc;
              });
              lastSuccessfullChange = null;
              _context7.prev = 7;
              i = 0;

            case 9:
              if (!(i < changesWithDocs.length)) {
                _context7.next = 32;
                break;
              }

              changeWithDoc = changesWithDocs[i];
              _context7.next = 13;
              return this.push.queryBuilder(changeWithDoc.doc);

            case 13:
              pushObj = _context7.sent;
              _context7.next = 16;
              return this.client.query(pushObj.query, pushObj.variables);

            case 16:
              result = _context7.sent;

              if (!result.errors) {
                _context7.next = 27;
                break;
              }

              if (!(typeof result.errors === 'string')) {
                _context7.next = 22;
                break;
              }

              throw new Error(result.errors);

            case 22:
              err = new Error('unknown errors occured - see innerErrors for more details');
              err.innerErrors = result.errors;
              throw err;

            case 25:
              _context7.next = 29;
              break;

            case 27:
              this._subjects.send.next(changeWithDoc.doc);

              lastSuccessfullChange = changeWithDoc;

            case 29:
              i++;
              _context7.next = 9;
              break;

            case 32:
              _context7.next = 41;
              break;

            case 34:
              _context7.prev = 34;
              _context7.t0 = _context7["catch"](7);

              if (!lastSuccessfullChange) {
                _context7.next = 39;
                break;
              }

              _context7.next = 39;
              return setLastPushSequence(this.collection, this.endpointHash, lastSuccessfullChange.seq);

            case 39:
              this._subjects.error.next(_context7.t0);

              return _context7.abrupt("return", false);

            case 41:
              _context7.next = 43;
              return setLastPushSequence(this.collection, this.endpointHash, changes.last_seq);

            case 43:
              if (!(changes.results.length === 0)) {
                _context7.next = 47;
                break;
              }

              if (this.live) {// console.log('no more docs to push, wait for ping');
              } else {// console.log('RxGraphQLReplicationState._runPull(): no more docs to push and not live; complete = true');
                }

              _context7.next = 49;
              break;

            case 47:
              _context7.next = 49;
              return this.runPush();

            case 49:
              return _context7.abrupt("return", true);

            case 50:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7, this, [[7, 34]]);
    }));

    function runPush() {
      return _runPush.apply(this, arguments);
    }

    return runPush;
  }();

  _proto.handleDocumentsFromRemote = /*#__PURE__*/function () {
    var _handleDocumentsFromRemote = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(docs, docsWithRevisions) {
      var toPouchDocs, _iterator, _step, doc, deletedValue, toPouch, primaryValue, pouchState, newRevision, newRevisionHeight, revisionId, startTime, endTime, _i, _toPouchDocs, tpd, originalDoc, cE;

      return _regeneratorRuntime.wrap(function _callee8$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              toPouchDocs = [];

              for (_iterator = _createForOfIteratorHelperLoose(docs); !(_step = _iterator()).done;) {
                doc = _step.value;
                deletedValue = doc[this.deletedFlag];
                toPouch = this.collection._handleToPouch(doc);
                toPouch._deleted = deletedValue;
                delete toPouch[this.deletedFlag];

                if (!this.syncRevisions) {
                  primaryValue = toPouch._id;
                  pouchState = docsWithRevisions[primaryValue];
                  newRevision = createRevisionForPulledDocument(this.endpointHash, toPouch);

                  if (pouchState) {
                    newRevisionHeight = pouchState.revisions.start + 1;
                    revisionId = newRevision;
                    newRevision = newRevisionHeight + '-' + newRevision;
                    toPouch._revisions = {
                      start: newRevisionHeight,
                      ids: pouchState.revisions.ids
                    };

                    toPouch._revisions.ids.unshift(revisionId);
                  } else {
                    newRevision = '1-' + newRevision;
                  }

                  toPouch._rev = newRevision;
                } else {
                  toPouch[this.lastPulledRevField] = toPouch._rev;
                }

                toPouchDocs.push({
                  doc: toPouch,
                  deletedValue: deletedValue
                });
              }

              startTime = now();
              _context8.next = 5;
              return this.collection.pouch.bulkDocs(toPouchDocs.map(function (tpd) {
                return tpd.doc;
              }), {
                new_edits: false
              });

            case 5:
              endTime = now();
              /**
               * because bulkDocs with new_edits: false
               * does not stream changes to the pouchdb,
               * we create the event and emit it,
               * so other instances get informed about it
               */

              for (_i = 0, _toPouchDocs = toPouchDocs; _i < _toPouchDocs.length; _i++) {
                tpd = _toPouchDocs[_i];
                originalDoc = flatClone(tpd.doc);

                if (tpd.deletedValue) {
                  originalDoc._deleted = tpd.deletedValue;
                } else {
                  delete originalDoc._deleted;
                }

                delete originalDoc[this.deletedFlag];
                delete originalDoc._revisions;
                cE = changeEventfromPouchChange(originalDoc, this.collection, startTime, endTime);
                this.collection.$emit(cE);
              }

            case 7:
            case "end":
              return _context8.stop();
          }
        }
      }, _callee8, this);
    }));

    function handleDocumentsFromRemote(_x3, _x4) {
      return _handleDocumentsFromRemote.apply(this, arguments);
    }

    return handleDocumentsFromRemote;
  }();

  _proto.cancel = function cancel() {
    if (this.isStopped()) return Promise.resolve(false);

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });

    this._subjects.canceled.next(true);

    return Promise.resolve(true);
  };

  _proto.setHeaders = function setHeaders(headers) {
    this.client = GraphQLClient({
      url: this.url,
      headers: headers
    });
  };

  return RxGraphQLReplicationState;
}();
export function syncGraphQL(_ref4) {
  var url = _ref4.url,
      _ref4$headers = _ref4.headers,
      headers = _ref4$headers === void 0 ? {} : _ref4$headers,
      _ref4$waitForLeadersh = _ref4.waitForLeadership,
      waitForLeadership = _ref4$waitForLeadersh === void 0 ? true : _ref4$waitForLeadersh,
      pull = _ref4.pull,
      push = _ref4.push,
      deletedFlag = _ref4.deletedFlag,
      _ref4$lastPulledRevFi = _ref4.lastPulledRevField,
      lastPulledRevField = _ref4$lastPulledRevFi === void 0 ? 'last_pulled_rev' : _ref4$lastPulledRevFi,
      _ref4$live = _ref4.live,
      live = _ref4$live === void 0 ? false : _ref4$live,
      _ref4$liveInterval = _ref4.liveInterval,
      liveInterval = _ref4$liveInterval === void 0 ? 1000 * 10 : _ref4$liveInterval,
      _ref4$retryTime = _ref4.retryTime,
      retryTime = _ref4$retryTime === void 0 ? 1000 * 5 : _ref4$retryTime,
      _ref4$autoStart = _ref4.autoStart,
      autoStart = _ref4$autoStart === void 0 ? true : _ref4$autoStart,
      _ref4$syncRevisions = _ref4.syncRevisions,
      syncRevisions = _ref4$syncRevisions === void 0 ? false : _ref4$syncRevisions;
  var collection = this; // fill in defaults for pull & push

  if (pull) {
    if (!pull.modifier) pull.modifier = DEFAULT_MODIFIER;
  }

  if (push) {
    if (!push.modifier) push.modifier = DEFAULT_MODIFIER;
  } // ensure the collection is listening to plain-pouchdb writes


  collection.watchForChanges();
  var replicationState = new RxGraphQLReplicationState(collection, url, headers, pull, push, deletedFlag, lastPulledRevField, live, liveInterval, retryTime, syncRevisions);
  if (!autoStart) return replicationState; // run internal so .sync() does not have to be async

  var waitTillRun = waitForLeadership && this.database.multiInstance // do not await leadership if not multiInstance
  ? this.database.waitForLeadership() : promiseWait(0);
  waitTillRun.then(function () {
    // trigger run once
    replicationState.run(); // start sync-interval

    if (replicationState.live) {
      if (pull) {
        _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9() {
          return _regeneratorRuntime.wrap(function _callee9$(_context9) {
            while (1) {
              switch (_context9.prev = _context9.next) {
                case 0:
                  if (replicationState.isStopped()) {
                    _context9.next = 9;
                    break;
                  }

                  _context9.next = 3;
                  return promiseWait(replicationState.liveInterval);

                case 3:
                  if (!replicationState.isStopped()) {
                    _context9.next = 5;
                    break;
                  }

                  return _context9.abrupt("return");

                case 5:
                  _context9.next = 7;
                  return replicationState.run( // do not retry on liveInterval-runs because they might stack up
                  // when failing
                  false);

                case 7:
                  _context9.next = 0;
                  break;

                case 9:
                case "end":
                  return _context9.stop();
              }
            }
          }, _callee9);
        }))();
      }

      if (push) {
        /**
         * we have to use the rxdb changestream
         * because the pouchdb.changes stream sometimes
         * does not emit events or stucks
         */
        var changeEventsSub = collection.$.subscribe(function (changeEvent) {
          if (replicationState.isStopped()) return;
          var rev = changeEvent.documentData._rev;

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