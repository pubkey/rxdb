"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxGraphQLReplicationState: true,
  syncGraphQL: true,
  rxdb: true,
  prototypes: true,
  RxDBReplicationGraphQLPlugin: true
};
exports.syncGraphQL = syncGraphQL;
exports.RxDBReplicationGraphQLPlugin = exports.prototypes = exports.rxdb = exports.RxGraphQLReplicationState = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _graphqlClient = _interopRequireDefault(require("graphql-client"));

var _util = require("../../util");

var _core = require("../../core");

var _helper = require("./helper");

Object.keys(_helper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _helper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _helper[key];
    }
  });
});

var _crawlingCheckpoint = require("./crawling-checkpoint");

Object.keys(_crawlingCheckpoint).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _crawlingCheckpoint[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _crawlingCheckpoint[key];
    }
  });
});

var _leaderElection = require("../leader-election");

var _overwritable = require("../../overwritable");

var _rxChangeEvent = require("../../rx-change-event");

var _rxCollectionHelper = require("../../rx-collection-helper");

var _graphqlSchemaFromRxSchema = require("./graphql-schema-from-rx-schema");

Object.keys(_graphqlSchemaFromRxSchema).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _graphqlSchemaFromRxSchema[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _graphqlSchemaFromRxSchema[key];
    }
  });
});

var _queryBuilderFromRxSchema = require("./query-builder-from-rx-schema");

Object.keys(_queryBuilderFromRxSchema).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _queryBuilderFromRxSchema[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _queryBuilderFromRxSchema[key];
    }
  });
});

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

(0, _core.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);

var RxGraphQLReplicationState = /*#__PURE__*/function () {
  function RxGraphQLReplicationState(collection, url, headers, pull, push, deletedFlag, live, liveInterval, retryTime) {
    this._subjects = {
      recieved: new _rxjs.Subject(),
      // all documents that are recieved from the endpoint
      send: new _rxjs.Subject(),
      // all documents that are send to the endpoint
      error: new _rxjs.Subject(),
      // all errors that are revieced from the endpoint, emits new Error() objects
      canceled: new _rxjs.BehaviorSubject(false),
      // true when the replication was canceled
      active: new _rxjs.BehaviorSubject(false),
      // true when something is running, false when not
      initialReplicationComplete: new _rxjs.BehaviorSubject(false) // true the initial replication-cycle is over

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
    this.live = live;
    this.liveInterval = liveInterval;
    this.retryTime = retryTime;
    this.client = (0, _graphqlClient["default"])({
      url: url,
      headers: headers
    });
    this.endpointHash = (0, _util.hash)(url);

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
    return (0, _rxjs.firstValueFrom)(this.initialReplicationComplete$.pipe((0, _operators.filter)(function (v) {
      return v === true;
    })));
  } // ensures this._run() does not run in parallel
  ;

  _proto.run =
  /*#__PURE__*/
  function () {
    var _run2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var _this2 = this;

      var retryOnFail,
          _args2 = arguments;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
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
              this._runningPromise = this._runningPromise.then( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
                var willRetry;
                return _regenerator["default"].wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _this2._subjects.active.next(true);

                        _context.next = 3;
                        return _this2._run(retryOnFail);

                      case 3:
                        willRetry = _context.sent;

                        _this2._subjects.active.next(false);

                        if (retryOnFail && !willRetry && _this2._subjects.initialReplicationComplete.getValue() === false) {
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
    var _run3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      var _this3 = this;

      var retryOnFail,
          ok,
          _ok,
          _args3 = arguments;

      return _regenerator["default"].wrap(function _callee3$(_context3) {
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
   * Pull all changes from the server,
   * start from the last pulled change.
   * @return true if sucessfull, false if something errored
   */
  ;

  _proto.runPull =
  /*#__PURE__*/
  function () {
    var _runPull = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5() {
      var _this4 = this;

      var latestDocument, latestDocumentData, pullGraphQL, result, err, data, modified, newLatestDocument;
      return _regenerator["default"].wrap(function _callee5$(_context5) {
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
              return (0, _crawlingCheckpoint.getLastPullDocument)(this.collection, this.endpointHash);

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
              data = result.data[Object.keys(result.data)[0]]; // optimisation shortcut, do not proceed if there are no documents.

              if (!(data.length === 0)) {
                _context5.next = 30;
                break;
              }

              return _context5.abrupt("return", true);

            case 30:
              _context5.next = 32;
              return Promise.all(data.map( /*#__PURE__*/function () {
                var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(doc) {
                  return _regenerator["default"].wrap(function _callee4$(_context4) {
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

            case 32:
              modified = _context5.sent.filter(function (doc) {
                return !!doc;
              });

              if (!_overwritable.overwritable.isDevMode()) {
                _context5.next = 42;
                break;
              }

              _context5.prev = 34;
              modified.forEach(function (doc) {
                var withoutDeleteFlag = (0, _util.flatClone)(doc);
                delete withoutDeleteFlag[_this4.deletedFlag];

                _this4.collection.schema.validate(withoutDeleteFlag);
              });
              _context5.next = 42;
              break;

            case 38:
              _context5.prev = 38;
              _context5.t1 = _context5["catch"](34);

              this._subjects.error.next(_context5.t1);

              return _context5.abrupt("return", false);

            case 42:
              if (!this.isStopped()) {
                _context5.next = 44;
                break;
              }

              return _context5.abrupt("return", true);

            case 44:
              _context5.next = 46;
              return this.handleDocumentsFromRemote(modified);

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
              return (0, _crawlingCheckpoint.setLastPullDocument)(this.collection, this.endpointHash, newLatestDocument);

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
      }, _callee5, this, [[9, 23], [34, 38]]);
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
    var _runPush = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7() {
      var _this5 = this;

      var changesResult, changesWithDocs, lastSuccessfullChange, i, changeWithDoc, pushObj, result, err;
      return _regenerator["default"].wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              _context7.next = 2;
              return (0, _crawlingCheckpoint.getChangesSinceLastPushSequence)(this.collection, this.endpointHash, this.push.batchSize);

            case 2:
              changesResult = _context7.sent;
              _context7.next = 5;
              return Promise.all(Array.from(changesResult.changedDocs.values()).map( /*#__PURE__*/function () {
                var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(row) {
                  var changedDoc;
                  return _regenerator["default"].wrap(function _callee6$(_context6) {
                    while (1) {
                      switch (_context6.prev = _context6.next) {
                        case 0:
                          changedDoc = row.doc;
                          _context6.next = 3;
                          return _this5.push.modifier(changedDoc);

                        case 3:
                          changedDoc = _context6.sent;

                          if (changedDoc) {
                            _context6.next = 6;
                            break;
                          }

                          return _context6.abrupt("return", null);

                        case 6:
                          return _context6.abrupt("return", {
                            doc: changedDoc,
                            sequence: row.sequence
                          });

                        case 7:
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
                return !!doc;
              });
              lastSuccessfullChange = null;
              _context7.prev = 7;
              i = 0;

            case 9:
              if (!(i < changesWithDocs.length)) {
                _context7.next = 33;
                break;
              }

              changeWithDoc = changesWithDocs[i]; // TODO _deleted should be required on type RxDocumentData
              // so we do not need this check here

              if (!changeWithDoc.doc.hasOwnProperty('_deleted')) {
                changeWithDoc.doc._deleted = false;
              }

              _context7.next = 14;
              return this.push.queryBuilder(changeWithDoc.doc);

            case 14:
              pushObj = _context7.sent;
              _context7.next = 17;
              return this.client.query(pushObj.query, pushObj.variables);

            case 17:
              result = _context7.sent;

              if (!result.errors) {
                _context7.next = 28;
                break;
              }

              if (!(typeof result.errors === 'string')) {
                _context7.next = 23;
                break;
              }

              throw new Error(result.errors);

            case 23:
              err = new Error('unknown errors occured - see innerErrors for more details');
              err.innerErrors = result.errors;
              throw err;

            case 26:
              _context7.next = 30;
              break;

            case 28:
              this._subjects.send.next(changeWithDoc.doc);

              lastSuccessfullChange = changeWithDoc;

            case 30:
              i++;
              _context7.next = 9;
              break;

            case 33:
              _context7.next = 42;
              break;

            case 35:
              _context7.prev = 35;
              _context7.t0 = _context7["catch"](7);

              if (!lastSuccessfullChange) {
                _context7.next = 40;
                break;
              }

              _context7.next = 40;
              return (0, _crawlingCheckpoint.setLastPushSequence)(this.collection, this.endpointHash, lastSuccessfullChange.sequence);

            case 40:
              this._subjects.error.next(_context7.t0);

              return _context7.abrupt("return", false);

            case 42:
              _context7.next = 44;
              return (0, _crawlingCheckpoint.setLastPushSequence)(this.collection, this.endpointHash, changesResult.lastSequence);

            case 44:
              if (!(changesResult.changedDocs.size === 0)) {
                _context7.next = 48;
                break;
              }

              if (this.live) {// console.log('no more docs to push, wait for ping');
              } else {// console.log('RxGraphQLReplicationState._runPull(): no more docs to push and not live; complete = true');
                }

              _context7.next = 50;
              break;

            case 48:
              _context7.next = 50;
              return this.runPush();

            case 50:
              return _context7.abrupt("return", true);

            case 51:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7, this, [[7, 35]]);
    }));

    function runPush() {
      return _runPush.apply(this, arguments);
    }

    return runPush;
  }();

  _proto.handleDocumentsFromRemote = /*#__PURE__*/function () {
    var _handleDocumentsFromRemote = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(docs) {
      var _this6 = this;

      var toStorageDocs, docIds, docsFromLocal, _iterator, _step, doc, documentId, deletedValue, docStateInLocalStorageInstance, newRevision, hasHeight, newRevisionHeight;

      return _regenerator["default"].wrap(function _callee9$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              toStorageDocs = [];
              docIds = docs.map(function (doc) {
                return doc[_this6.collection.schema.primaryPath];
              });
              _context9.next = 4;
              return this.collection.storageInstance.findDocumentsById(docIds, true);

            case 4:
              docsFromLocal = _context9.sent;

              for (_iterator = _createForOfIteratorHelperLoose(docs); !(_step = _iterator()).done;) {
                doc = _step.value;
                documentId = doc[this.collection.schema.primaryPath];
                deletedValue = doc[this.deletedFlag];
                doc._deleted = deletedValue;
                delete doc[this.deletedFlag];
                docStateInLocalStorageInstance = docsFromLocal.get(documentId);
                newRevision = (0, _helper.createRevisionForPulledDocument)(this.endpointHash, doc);

                if (docStateInLocalStorageInstance) {
                  hasHeight = (0, _util.getHeightOfRevision)(docStateInLocalStorageInstance._rev);
                  newRevisionHeight = hasHeight + 1;
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

              if (!(toStorageDocs.length > 0)) {
                _context9.next = 9;
                break;
              }

              _context9.next = 9;
              return this.collection.database.lockedRun( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8() {
                return _regenerator["default"].wrap(function _callee8$(_context8) {
                  while (1) {
                    switch (_context8.prev = _context8.next) {
                      case 0:
                        _context8.next = 2;
                        return _this6.collection.storageInstance.bulkAddRevisions(toStorageDocs.map(function (row) {
                          return (0, _rxCollectionHelper._handleToStorageInstance)(_this6.collection, row.doc);
                        }));

                      case 2:
                      case "end":
                        return _context8.stop();
                    }
                  }
                }, _callee8);
              })));

            case 9:
              return _context9.abrupt("return", true);

            case 10:
            case "end":
              return _context9.stop();
          }
        }
      }, _callee9, this);
    }));

    function handleDocumentsFromRemote(_x3) {
      return _handleDocumentsFromRemote.apply(this, arguments);
    }

    return handleDocumentsFromRemote;
  }();

  _proto.cancel = function cancel() {
    if (this.isStopped()) {
      return Promise.resolve(false);
    }

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });

    this._subjects.canceled.next(true);

    return Promise.resolve(true);
  };

  _proto.setHeaders = function setHeaders(headers) {
    this.client = (0, _graphqlClient["default"])({
      url: this.url,
      headers: headers
    });
  };

  return RxGraphQLReplicationState;
}();

exports.RxGraphQLReplicationState = RxGraphQLReplicationState;

function syncGraphQL(_ref5) {
  var url = _ref5.url,
      _ref5$headers = _ref5.headers,
      headers = _ref5$headers === void 0 ? {} : _ref5$headers,
      _ref5$waitForLeadersh = _ref5.waitForLeadership,
      waitForLeadership = _ref5$waitForLeadersh === void 0 ? true : _ref5$waitForLeadersh,
      pull = _ref5.pull,
      push = _ref5.push,
      deletedFlag = _ref5.deletedFlag,
      _ref5$live = _ref5.live,
      live = _ref5$live === void 0 ? false : _ref5$live,
      _ref5$liveInterval = _ref5.liveInterval,
      liveInterval = _ref5$liveInterval === void 0 ? 1000 * 10 : _ref5$liveInterval,
      _ref5$retryTime = _ref5.retryTime,
      retryTime = _ref5$retryTime === void 0 ? 1000 * 5 : _ref5$retryTime,
      _ref5$autoStart = _ref5.autoStart,
      autoStart = _ref5$autoStart === void 0 ? true : _ref5$autoStart;
  var collection = this; // fill in defaults for pull & push

  if (pull) {
    if (!pull.modifier) pull.modifier = _helper.DEFAULT_MODIFIER;
  }

  if (push) {
    if (!push.modifier) push.modifier = _helper.DEFAULT_MODIFIER;
  }

  var replicationState = new RxGraphQLReplicationState(collection, url, headers, pull, push, deletedFlag, live, liveInterval, retryTime);

  if (!autoStart) {
    return replicationState;
  } // run internal so .sync() does not have to be async


  var waitTillRun = waitForLeadership && this.database.multiInstance // do not await leadership if not multiInstance
  ? this.database.waitForLeadership() : (0, _util.promiseWait)(0);
  waitTillRun.then(function () {
    if (collection.destroyed) {
      return;
    } // trigger run once


    replicationState.run(); // start sync-interval

    if (replicationState.live) {
      if (pull) {
        (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10() {
          return _regenerator["default"].wrap(function _callee10$(_context10) {
            while (1) {
              switch (_context10.prev = _context10.next) {
                case 0:
                  if (replicationState.isStopped()) {
                    _context10.next = 9;
                    break;
                  }

                  _context10.next = 3;
                  return (0, _util.promiseWait)(replicationState.liveInterval);

                case 3:
                  if (!replicationState.isStopped()) {
                    _context10.next = 5;
                    break;
                  }

                  return _context10.abrupt("return");

                case 5:
                  _context10.next = 7;
                  return replicationState.run( // do not retry on liveInterval-runs because they might stack up
                  // when failing
                  false);

                case 7:
                  _context10.next = 0;
                  break;

                case 9:
                case "end":
                  return _context10.stop();
              }
            }
          }, _callee10);
        }))();
      }

      if (push) {
        /**
         * When a document is written to the collection,
         * we might have to run the replication run() once
         */
        var changeEventsSub = collection.$.pipe((0, _operators.filter)(function (cE) {
          return !cE.isLocal;
        })).subscribe(function (changeEvent) {
          if (replicationState.isStopped()) {
            return;
          }

          var doc = (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent);
          var rev = doc._rev;

          if (rev && !(0, _helper.wasRevisionfromPullReplication)(replicationState.endpointHash, rev)) {
            replicationState.run();
          }
        });

        replicationState._subs.push(changeEventsSub);
      }
    }
  });
  return replicationState;
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.syncGraphQL = syncGraphQL;
  }
};
exports.prototypes = prototypes;
var RxDBReplicationGraphQLPlugin = {
  name: 'replication-graphql',
  rxdb: rxdb,
  prototypes: prototypes
};
exports.RxDBReplicationGraphQLPlugin = RxDBReplicationGraphQLPlugin;

//# sourceMappingURL=index.js.map