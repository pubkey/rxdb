import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";

/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import { BehaviorSubject, Subject } from 'rxjs';
import { first, filter } from 'rxjs/operators';
import GraphQLClient from 'graphql-client';
import { promiseWait, flatClone } from '../../util';
import Core from '../../core';
import { hash } from '../../util';
import { DEFAULT_MODIFIER, wasRevisionfromPullReplication, createRevisionForPulledDocument, getDocsWithRevisionsFromPouch } from './helper';
import { setLastPushSequence, getLastPullDocument, setLastPullDocument, getChangesSinceLastPushSequence } from './crawling-checkpoint';
import RxDBWatchForChangesPlugin from '../watch-for-changes';
import RxDBLeaderElectionPlugin from '../leader-election';
import { changeEventfromPouchChange } from '../../rx-change-event';
Core.plugin(RxDBLeaderElectionPlugin);
/**
 * add the watch-for-changes-plugin
 * so pouchdb will emit events when something gets written to it
 */

Core.plugin(RxDBWatchForChangesPlugin);
export var RxGraphQLReplicationState = /*#__PURE__*/function () {
  function RxGraphQLReplicationState(collection, url, headers, pull, push, deletedFlag, live, liveInterval, retryTime) {
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
    this.initialReplicationComplete$ = undefined;
    this.recieved$ = undefined;
    this.send$ = undefined;
    this.error$ = undefined;
    this.canceled$ = undefined;
    this.active$ = undefined;
    this.collection = collection;
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

      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!this.isStopped()) {
                _context2.next = 2;
                break;
              }

              return _context2.abrupt("return");

            case 2:
              if (!(this._runQueueCount > 2)) {
                _context2.next = 4;
                break;
              }

              return _context2.abrupt("return", this._runningPromise);

            case 4:
              this._runQueueCount++;
              this._runningPromise = this._runningPromise.then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
                var willRetry;
                return _regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _this2._subjects.active.next(true);

                        _context.next = 3;
                        return _this2._run();

                      case 3:
                        willRetry = _context.sent;

                        _this2._subjects.active.next(false);

                        if (!willRetry && _this2._subjects.initialReplicationComplete['_value'] === false) _this2._subjects.initialReplicationComplete.next(true);
                        _this2._runQueueCount--;

                      case 7:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              })));
              return _context2.abrupt("return", this._runningPromise);

            case 7:
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
  }();

  _proto._run = /*#__PURE__*/function () {
    var _run3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
      var _this3 = this;

      var willRetry, ok, _ok;

      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              willRetry = false;

              if (!this.push) {
                _context3.next = 6;
                break;
              }

              _context3.next = 4;
              return this.runPush();

            case 4:
              ok = _context3.sent;

              if (!ok) {
                willRetry = true;
                setTimeout(function () {
                  return _this3.run();
                }, this.retryTime);
              }

            case 6:
              if (!this.pull) {
                _context3.next = 11;
                break;
              }

              _context3.next = 9;
              return this.runPull();

            case 9:
              _ok = _context3.sent;

              if (!_ok) {
                willRetry = true;
                setTimeout(function () {
                  return _this3.run();
                }, this.retryTime);
              }

            case 11:
              return _context3.abrupt("return", willRetry);

            case 12:
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
   * @return true if no errors occured
   */
  ;

  _proto.runPull =
  /*#__PURE__*/
  function () {
    var _runPull = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
      var _this4 = this;

      var latestDocument, latestDocumentData, pullGraphQL, result, data, modified, docIds, docsWithRevisions, newLatestDocument;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              if (!this.isStopped()) {
                _context4.next = 2;
                break;
              }

              return _context4.abrupt("return", Promise.resolve(false));

            case 2:
              _context4.next = 4;
              return getLastPullDocument(this.collection, this.endpointHash);

            case 4:
              latestDocument = _context4.sent;
              latestDocumentData = latestDocument ? latestDocument : null;
              pullGraphQL = this.pull.queryBuilder(latestDocumentData);
              _context4.prev = 7;
              _context4.next = 10;
              return this.client.query(pullGraphQL.query, pullGraphQL.variables);

            case 10:
              result = _context4.sent;

              if (!result.errors) {
                _context4.next = 13;
                break;
              }

              throw new Error(result.errors);

            case 13:
              _context4.next = 20;
              break;

            case 15:
              _context4.prev = 15;
              _context4.t0 = _context4["catch"](7);

              this._subjects.error.next(_context4.t0);

              setTimeout(function () {
                return _this4.run();
              }, this.retryTime);
              return _context4.abrupt("return", false);

            case 20:
              // this assumes that there will be always only one property in the response
              // is this correct?
              data = result.data[Object.keys(result.data)[0]];
              modified = data.map(function (doc) {
                return _this4.pull.modifier(doc);
              });
              docIds = modified.map(function (doc) {
                return doc[_this4.collection.schema.primaryPath];
              });
              _context4.next = 25;
              return getDocsWithRevisionsFromPouch(this.collection, docIds);

            case 25:
              docsWithRevisions = _context4.sent;
              _context4.next = 28;
              return Promise.all(modified.map(function (doc) {
                return _this4.handleDocumentFromRemote(doc, docsWithRevisions);
              }));

            case 28:
              modified.map(function (doc) {
                return _this4._subjects.recieved.next(doc);
              });

              if (!(modified.length === 0)) {
                _context4.next = 33;
                break;
              }

              if (this.live) {// console.log('no more docs, wait for ping');
              } else {// console.log('RxGraphQLReplicationState._run(): no more docs and not live; complete = true');
                }

              _context4.next = 38;
              break;

            case 33:
              newLatestDocument = modified[modified.length - 1];
              _context4.next = 36;
              return setLastPullDocument(this.collection, this.endpointHash, newLatestDocument);

            case 36:
              _context4.next = 38;
              return this.runPull();

            case 38:
              return _context4.abrupt("return", true);

            case 39:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, this, [[7, 15]]);
    }));

    function runPull() {
      return _runPull.apply(this, arguments);
    }

    return runPull;
  }();

  _proto.runPush = /*#__PURE__*/function () {
    var _runPush = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
      var _this5 = this;

      var changes, changesWithDocs, lastSuccessfullChange, i, changeWithDoc, pushObj, result;
      return _regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 2;
              return getChangesSinceLastPushSequence(this.collection, this.endpointHash, this.push.batchSize);

            case 2:
              changes = _context5.sent;
              changesWithDocs = changes.results.map(function (change) {
                var doc = change['doc'];
                doc[_this5.deletedFlag] = !!change['deleted'];
                delete doc._rev;
                delete doc._deleted;
                delete doc._attachments;
                doc = _this5.push.modifier(doc);
                var seq = change.seq;
                return {
                  doc: doc,
                  seq: seq
                };
              });
              lastSuccessfullChange = null;
              _context5.prev = 5;
              i = 0;

            case 7:
              if (!(i < changesWithDocs.length)) {
                _context5.next = 22;
                break;
              }

              changeWithDoc = changesWithDocs[i];
              pushObj = this.push.queryBuilder(changeWithDoc.doc);
              _context5.next = 12;
              return this.client.query(pushObj.query, pushObj.variables);

            case 12:
              result = _context5.sent;

              if (!result.errors) {
                _context5.next = 17;
                break;
              }

              throw new Error(result.errors);

            case 17:
              this._subjects.send.next(changeWithDoc.doc);

              lastSuccessfullChange = changeWithDoc;

            case 19:
              i++;
              _context5.next = 7;
              break;

            case 22:
              _context5.next = 32;
              break;

            case 24:
              _context5.prev = 24;
              _context5.t0 = _context5["catch"](5);

              if (!lastSuccessfullChange) {
                _context5.next = 29;
                break;
              }

              _context5.next = 29;
              return setLastPushSequence(this.collection, this.endpointHash, lastSuccessfullChange.seq);

            case 29:
              this._subjects.error.next(_context5.t0);

              setTimeout(function () {
                return _this5.run();
              }, this.retryTime);
              return _context5.abrupt("return", false);

            case 32:
              _context5.next = 34;
              return setLastPushSequence(this.collection, this.endpointHash, changes.last_seq);

            case 34:
              if (!(changes.results.length === 0)) {
                _context5.next = 38;
                break;
              }

              if (this.live) {// console.log('no more docs to push, wait for ping');
              } else {// console.log('RxGraphQLReplicationState._runPull(): no more docs to push and not live; complete = true');
                }

              _context5.next = 40;
              break;

            case 38:
              _context5.next = 40;
              return this.runPush();

            case 40:
              return _context5.abrupt("return", true);

            case 41:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, this, [[5, 24]]);
    }));

    function runPush() {
      return _runPush.apply(this, arguments);
    }

    return runPush;
  }();

  _proto.handleDocumentFromRemote = /*#__PURE__*/function () {
    var _handleDocumentFromRemote = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(doc, docsWithRevisions) {
      var deletedValue, toPouch, primaryValue, pouchState, newRevision, newRevisionHeight, revisionId, originalDoc, cE;
      return _regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              deletedValue = doc[this.deletedFlag];
              toPouch = this.collection._handleToPouch(doc); // console.log('handleDocumentFromRemote(' + toPouch._id + ') start');

              toPouch._deleted = deletedValue;
              delete toPouch[this.deletedFlag];
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
              _context6.next = 11;
              return this.collection.pouch.bulkDocs([toPouch], {
                new_edits: false
              });

            case 11:
              /**
               * because bulkDocs with new_edits: false
               * does not stream changes to the pouchdb,
               * we create the event and emit it,
               * so other instances get informed about it
               */
              originalDoc = flatClone(toPouch);

              if (deletedValue) {
                originalDoc._deleted = deletedValue;
              } else {
                delete originalDoc._deleted;
              }

              delete originalDoc[this.deletedFlag];
              delete originalDoc._revisions;
              originalDoc._rev = newRevision;
              cE = changeEventfromPouchChange(originalDoc, this.collection);
              this.collection.$emit(cE);

            case 18:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));

    function handleDocumentFromRemote(_x, _x2) {
      return _handleDocumentFromRemote.apply(this, arguments);
    }

    return handleDocumentFromRemote;
  }();

  _proto.cancel = function cancel() {
    if (this.isStopped()) return Promise.resolve(false);

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });

    this._subjects.canceled.next(true); // TODO


    return Promise.resolve(true);
  };

  return RxGraphQLReplicationState;
}();
export function syncGraphQL(_ref2) {
  var url = _ref2.url,
      _ref2$headers = _ref2.headers,
      headers = _ref2$headers === void 0 ? {} : _ref2$headers,
      _ref2$waitForLeadersh = _ref2.waitForLeadership,
      waitForLeadership = _ref2$waitForLeadersh === void 0 ? true : _ref2$waitForLeadersh,
      pull = _ref2.pull,
      push = _ref2.push,
      deletedFlag = _ref2.deletedFlag,
      _ref2$live = _ref2.live,
      live = _ref2$live === void 0 ? false : _ref2$live,
      _ref2$liveInterval = _ref2.liveInterval,
      liveInterval = _ref2$liveInterval === void 0 ? 1000 * 10 : _ref2$liveInterval,
      _ref2$retryTime = _ref2.retryTime,
      retryTime = _ref2$retryTime === void 0 ? 1000 * 5 : _ref2$retryTime,
      _ref2$autoStart = _ref2.autoStart,
      autoStart = _ref2$autoStart === void 0 ? true : _ref2$autoStart;
  var collection = this; // fill in defaults for pull & push

  if (pull) {
    if (!pull.modifier) pull.modifier = DEFAULT_MODIFIER;
  }

  if (push) {
    if (!push.modifier) push.modifier = DEFAULT_MODIFIER;
  } // ensure the collection is listening to plain-pouchdb writes


  collection.watchForChanges();
  var replicationState = new RxGraphQLReplicationState(collection, url, headers, pull, push, deletedFlag, live, liveInterval, retryTime);
  if (!autoStart) return replicationState; // run internal so .sync() does not have to be async

  var waitTillRun = waitForLeadership ? this.database.waitForLeadership() : promiseWait(0);
  waitTillRun.then(function () {
    // trigger run once
    replicationState.run(); // start sync-interval

    if (replicationState.live) {
      if (pull) {
        _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7() {
          return _regeneratorRuntime.wrap(function _callee7$(_context7) {
            while (1) {
              switch (_context7.prev = _context7.next) {
                case 0:
                  if (replicationState.isStopped()) {
                    _context7.next = 9;
                    break;
                  }

                  _context7.next = 3;
                  return promiseWait(replicationState.liveInterval);

                case 3:
                  if (!replicationState.isStopped()) {
                    _context7.next = 5;
                    break;
                  }

                  return _context7.abrupt("return");

                case 5:
                  _context7.next = 7;
                  return replicationState.run();

                case 7:
                  _context7.next = 0;
                  break;

                case 9:
                case "end":
                  return _context7.stop();
              }
            }
          }, _callee7);
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
          var rev = changeEvent.data.v._rev;

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
export var rxdb = true;
export var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.syncGraphQL = syncGraphQL;
  }
};
export default {
  rxdb: rxdb,
  prototypes: prototypes
};
//# sourceMappingURL=index.js.map