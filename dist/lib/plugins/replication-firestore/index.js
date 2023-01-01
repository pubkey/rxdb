"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxFirestoreReplicationState: true,
  replicateFirestore: true
};
exports.RxFirestoreReplicationState = void 0;
exports.replicateFirestore = replicateFirestore;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _utils = require("../../plugins/utils");
var _firestore = require("firebase/firestore");
var _leaderElection = require("../leader-election");
var _replication = require("../replication");
var _ = require("../../");
var _rxjs = require("rxjs");
var _firestoreHelper = require("./firestore-helper");
Object.keys(_firestoreHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _firestoreHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _firestoreHelper[key];
    }
  });
});
var _firestoreTypes = require("./firestore-types");
Object.keys(_firestoreTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _firestoreTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _firestoreTypes[key];
    }
  });
});
var RxFirestoreReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  (0, _inheritsLoose2["default"])(RxFirestoreReplicationState, _RxReplicationState);
  function RxFirestoreReplicationState(firestore, replicationIdentifierHash, collection, pull, push) {
    var _this;
    var live = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : true;
    var retryTime = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 1000 * 5;
    var autoStart = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : true;
    _this = _RxReplicationState.call(this, replicationIdentifierHash, collection, '_deleted', pull, push, live, retryTime, autoStart) || this;
    _this.firestore = firestore;
    _this.replicationIdentifierHash = replicationIdentifierHash;
    _this.collection = collection;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    return _this;
  }
  return RxFirestoreReplicationState;
}(_replication.RxReplicationState);
exports.RxFirestoreReplicationState = RxFirestoreReplicationState;
function replicateFirestore(options) {
  var collection = options.collection;
  (0, _.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
  var pullStream$ = new _rxjs.Subject();
  var replicationPrimitivesPull;
  options.live = typeof options.live === 'undefined' ? true : options.live;
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var serverTimestampField = typeof options.serverTimestampField === 'undefined' ? 'serverTimestamp' : options.serverTimestampField;
  options.serverTimestampField = serverTimestampField;
  var primaryPath = collection.schema.primaryPath;

  /**
   * The serverTimestampField MUST NOT be part of the collections RxJsonSchema.
   */
  var schemaPart = (0, _.getSchemaByObjectPath)(collection.schema.jsonSchema, serverTimestampField);
  if (schemaPart ||
  // also must not be nested.
  serverTimestampField.includes('.')) {
    throw (0, _.newRxError)('RC6', {
      field: serverTimestampField,
      schema: collection.schema.jsonSchema
    });
  }
  if (options.pull) {
    replicationPrimitivesPull = {
      handler: function () {
        var _handler = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(lastPulledCheckpoint, batchSize) {
          var newerQuery, sameTimeQuery, lastServerTimestamp, mustsReRun, useDocs, lastDoc, documents, newCheckpoint, ret;
          return _regenerator["default"].wrap(function _callee2$(_context2) {
            while (1) switch (_context2.prev = _context2.next) {
              case 0:
                if (lastPulledCheckpoint) {
                  lastServerTimestamp = (0, _firestoreHelper.isoStringToServerTimestamp)(lastPulledCheckpoint.serverTimestamp);
                  newerQuery = (0, _firestore.query)(options.firestore.collection, (0, _firestore.where)(serverTimestampField, '>', lastServerTimestamp), (0, _firestore.orderBy)(serverTimestampField, 'asc'), (0, _firestore.limit)(batchSize));
                  sameTimeQuery = (0, _firestore.query)(options.firestore.collection, (0, _firestore.where)(serverTimestampField, '==', lastServerTimestamp), (0, _firestore.where)(primaryPath, '>', lastPulledCheckpoint.id), (0, _firestore.orderBy)(primaryPath, 'asc'), (0, _firestore.orderBy)(serverTimestampField, 'asc'), (0, _firestore.limit)(batchSize));
                } else {
                  newerQuery = (0, _firestore.query)(options.firestore.collection, (0, _firestore.orderBy)(serverTimestampField, 'asc'), (0, _firestore.limit)(batchSize));
                }
                mustsReRun = true;
                useDocs = [];
              case 3:
                if (!mustsReRun) {
                  _context2.next = 10;
                  break;
                }
                _context2.next = 6;
                return (0, _firestore.waitForPendingWrites)(options.firestore.database);
              case 6:
                _context2.next = 8;
                return (0, _firestore.runTransaction)(options.firestore.database, /*#__PURE__*/function () {
                  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(_tx) {
                    var _yield$Promise$all, newerQueryResult, sameTimeQueryResult, missingAmount, additonalDocs;
                    return _regenerator["default"].wrap(function _callee$(_context) {
                      while (1) switch (_context.prev = _context.next) {
                        case 0:
                          useDocs = [];
                          _context.next = 3;
                          return Promise.all([(0, _firestore.getDocs)(newerQuery), sameTimeQuery ? (0, _firestore.getDocs)(sameTimeQuery) : undefined]);
                        case 3:
                          _yield$Promise$all = _context.sent;
                          newerQueryResult = _yield$Promise$all[0];
                          sameTimeQueryResult = _yield$Promise$all[1];
                          if (!(newerQueryResult.metadata.hasPendingWrites || sameTimeQuery && (0, _utils.ensureNotFalsy)(sameTimeQueryResult).metadata.hasPendingWrites)) {
                            _context.next = 10;
                            break;
                          }
                          return _context.abrupt("return");
                        case 10:
                          mustsReRun = false;
                          if (sameTimeQuery) {
                            useDocs = (0, _utils.ensureNotFalsy)(sameTimeQueryResult).docs;
                          }
                          missingAmount = batchSize - useDocs.length;
                          if (missingAmount > 0) {
                            additonalDocs = newerQueryResult.docs.slice(0, missingAmount).filter(function (x) {
                              return !!x;
                            });
                            useDocs = useDocs.concat(additonalDocs);
                          }
                        case 14:
                        case "end":
                          return _context.stop();
                      }
                    }, _callee);
                  }));
                  return function (_x3) {
                    return _ref.apply(this, arguments);
                  };
                }());
              case 8:
                _context2.next = 3;
                break;
              case 10:
                if (!(useDocs.length === 0)) {
                  _context2.next = 12;
                  break;
                }
                return _context2.abrupt("return", {
                  checkpoint: lastPulledCheckpoint,
                  documents: []
                });
              case 12:
                lastDoc = (0, _utils.ensureNotFalsy)((0, _utils.lastOfArray)(useDocs));
                documents = useDocs.map(function (row) {
                  return (0, _firestoreHelper.firestoreRowToDocData)(serverTimestampField, primaryPath, row);
                });
                newCheckpoint = {
                  id: lastDoc.id,
                  serverTimestamp: (0, _firestoreHelper.serverTimestampToIsoString)(serverTimestampField, lastDoc.data())
                };
                ret = {
                  documents: documents,
                  checkpoint: newCheckpoint
                };
                return _context2.abrupt("return", ret);
              case 17:
              case "end":
                return _context2.stop();
            }
          }, _callee2);
        }));
        function handler(_x, _x2) {
          return _handler.apply(this, arguments);
        }
        return handler;
      }(),
      batchSize: (0, _utils.ensureNotFalsy)(options.pull).batchSize,
      modifier: (0, _utils.ensureNotFalsy)(options.pull).modifier,
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  if (options.push) {
    replicationPrimitivesPush = {
      handler: function () {
        var _handler2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(rows) {
          var writeRowsById, docIds, conflicts;
          return _regenerator["default"].wrap(function _callee5$(_context5) {
            while (1) switch (_context5.prev = _context5.next) {
              case 0:
                writeRowsById = {};
                docIds = rows.map(function (row) {
                  var docId = row.newDocumentState[primaryPath];
                  writeRowsById[docId] = row;
                  return docId;
                });
                _context5.next = 4;
                return (0, _firestore.waitForPendingWrites)(options.firestore.database);
              case 4:
                conflicts = [];
                /**
                 * Everything must run INSIDE of the transaction
                 * because on tx-errors, firebase will re-run the transaction on some cases.
                 * @link https://firebase.google.com/docs/firestore/manage-data/transactions#transaction_failure
                 * @link https://firebase.google.com/docs/firestore/manage-data/transactions
                 */
                _context5.next = 7;
                return (0, _firestore.runTransaction)(options.firestore.database, /*#__PURE__*/function () {
                  var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(_tx) {
                    var docsInDbResult, docsInDbById, batch, hasWrite;
                    return _regenerator["default"].wrap(function _callee4$(_context4) {
                      while (1) switch (_context4.prev = _context4.next) {
                        case 0:
                          conflicts = []; // reset in case the tx has re-run.
                          /**
                           * @link https://stackoverflow.com/a/48423626/3443137
                           */
                          _context4.next = 3;
                          return (0, _firestore.getDocs)((0, _firestore.query)(options.firestore.collection, (0, _firestore.where)((0, _firestore.documentId)(), 'in', docIds)));
                        case 3:
                          docsInDbResult = _context4.sent;
                          docsInDbById = {};
                          docsInDbResult.docs.forEach(function (row) {
                            var docDataInDb = (0, _firestoreHelper.stripServerTimestampField)(serverTimestampField, row.data());
                            var docId = row.id;
                            docDataInDb[primaryPath] = docId;
                            docsInDbById[docId] = docDataInDb;
                          });

                          /**
                           * @link https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes
                           */
                          batch = (0, _firestore.writeBatch)(options.firestore.database);
                          hasWrite = false;
                          _context4.next = 10;
                          return Promise.all(Object.entries(writeRowsById).map( /*#__PURE__*/function () {
                            var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(_ref3) {
                              var docId, writeRow, docInDb, docRef, writeDocData;
                              return _regenerator["default"].wrap(function _callee3$(_context3) {
                                while (1) switch (_context3.prev = _context3.next) {
                                  case 0:
                                    docId = _ref3[0], writeRow = _ref3[1];
                                    docInDb = docsInDbById[docId];
                                    _context3.t0 = docInDb;
                                    if (!_context3.t0) {
                                      _context3.next = 11;
                                      break;
                                    }
                                    _context3.t1 = !writeRow.assumedMasterState;
                                    if (_context3.t1) {
                                      _context3.next = 10;
                                      break;
                                    }
                                    _context3.next = 8;
                                    return collection.conflictHandler({
                                      newDocumentState: docInDb,
                                      realMasterState: writeRow.assumedMasterState
                                    }, 'replication-firestore-push');
                                  case 8:
                                    _context3.t2 = _context3.sent.isEqual;
                                    _context3.t1 = _context3.t2 === false;
                                  case 10:
                                    _context3.t0 = _context3.t1;
                                  case 11:
                                    if (!_context3.t0) {
                                      _context3.next = 15;
                                      break;
                                    }
                                    // conflict
                                    conflicts.push(docInDb);
                                    _context3.next = 20;
                                    break;
                                  case 15:
                                    // no conflict
                                    hasWrite = true;
                                    docRef = (0, _firestore.doc)(options.firestore.collection, docId);
                                    writeDocData = (0, _utils.flatClone)(writeRow.newDocumentState);
                                    writeDocData[serverTimestampField] = (0, _firestore.serverTimestamp)();
                                    if (!docInDb) {
                                      // insert
                                      batch.set(docRef, (0, _firestoreHelper.stripPrimaryKey)(primaryPath, writeDocData));
                                    } else {
                                      // update
                                      batch.update(docRef, (0, _firestoreHelper.stripPrimaryKey)(primaryPath, writeDocData));
                                    }
                                  case 20:
                                  case "end":
                                    return _context3.stop();
                                }
                              }, _callee3);
                            }));
                            return function (_x6) {
                              return _ref4.apply(this, arguments);
                            };
                          }()));
                        case 10:
                          if (!hasWrite) {
                            _context4.next = 13;
                            break;
                          }
                          _context4.next = 13;
                          return batch.commit();
                        case 13:
                        case "end":
                          return _context4.stop();
                      }
                    }, _callee4);
                  }));
                  return function (_x5) {
                    return _ref2.apply(this, arguments);
                  };
                }());
              case 7:
                _context5.next = 9;
                return (0, _firestore.waitForPendingWrites)(options.firestore.database);
              case 9:
                return _context5.abrupt("return", conflicts);
              case 10:
              case "end":
                return _context5.stop();
            }
          }, _callee5);
        }));
        function handler(_x4) {
          return _handler2.apply(this, arguments);
        }
        return handler;
      }(),
      batchSize: options.push.batchSize,
      modifier: options.push.modifier
    };
  }
  var replicationState = new RxFirestoreReplicationState(options.firestore, _firestoreHelper.FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX + (0, _utils.fastUnsecureHash)(options.firestore.projectId), collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Use long polling to get live changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    var cancelBefore = replicationState.cancel.bind(replicationState);
    replicationState.start = function () {
      var lastChangeQuery = (0, _firestore.query)(options.firestore.collection, (0, _firestore.orderBy)(serverTimestampField, 'desc'), (0, _firestore.limit)(1));
      var unsubscribe = (0, _firestore.onSnapshot)(lastChangeQuery, function (_querySnapshot) {
        /**
         * There is no good way to observe the event stream in firestore.
         * So instead we listen to any write to the collection
         * and then emit a 'RESYNC' flag.
         */
        replicationState.reSync();
      }, function (error) {
        replicationState.subjects.error.next((0, _.newRxError)('RC_STREAM', {
          error: (0, _utils.errorToPlainJson)(error)
        }));
      });
      replicationState.cancel = function () {
        unsubscribe();
        return cancelBefore();
      };
      return startBefore();
    };
  }
  (0, _replication.startReplicationOnLeaderShip)(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map