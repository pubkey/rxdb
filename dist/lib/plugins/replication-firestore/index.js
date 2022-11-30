"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxFirestoreReplicationState: true,
  syncFirestore: true,
  RxDBReplicationFirestorePlugin: true
};
exports.RxFirestoreReplicationState = exports.RxDBReplicationFirestorePlugin = void 0;
exports.syncFirestore = syncFirestore;
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _util = require("../../util");
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
 * this plugin adds the RxCollection.syncCouchDBNew()-function to rxdb
 * you can use it to sync collections with a remote CouchDB endpoint.
 */
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
function syncFirestore(options) {
  var collection = this;
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
  var schemaPart = (0, _.getSchemaByObjectPath)(this.schema.jsonSchema, serverTimestampField);
  if (schemaPart ||
  // also must not be nested.
  serverTimestampField.includes('.')) {
    throw (0, _.newRxError)('RC6', {
      field: serverTimestampField,
      schema: this.schema.jsonSchema
    });
  }
  if (options.pull) {
    replicationPrimitivesPull = {
      handler: function handler(lastPulledCheckpoint, batchSize) {
        try {
          var _temp3 = function _temp3() {
            if (useDocs.length === 0) {
              return {
                checkpoint: lastPulledCheckpoint,
                documents: []
              };
            }
            var lastDoc = (0, _util.ensureNotFalsy)((0, _util.lastOfArray)(useDocs));
            var documents = useDocs.map(function (row) {
              return (0, _firestoreHelper.firestoreRowToDocData)(serverTimestampField, primaryPath, row);
            });
            var newCheckpoint = {
              id: lastDoc.id,
              serverTimestamp: (0, _firestoreHelper.serverTimestampToIsoString)(serverTimestampField, lastDoc.data())
            };
            var ret = {
              documents: documents,
              checkpoint: newCheckpoint
            };
            return ret;
          };
          var newerQuery;
          var sameTimeQuery;
          if (lastPulledCheckpoint) {
            var lastServerTimestamp = (0, _firestoreHelper.isoStringToServerTimestamp)(lastPulledCheckpoint.serverTimestamp);
            newerQuery = (0, _firestore.query)(options.firestore.collection, (0, _firestore.where)(serverTimestampField, '>', lastServerTimestamp), (0, _firestore.orderBy)(serverTimestampField, 'asc'), (0, _firestore.limit)(batchSize));
            sameTimeQuery = (0, _firestore.query)(options.firestore.collection, (0, _firestore.where)(serverTimestampField, '==', lastServerTimestamp), (0, _firestore.where)(primaryPath, '>', lastPulledCheckpoint.id), (0, _firestore.orderBy)(primaryPath, 'asc'), (0, _firestore.orderBy)(serverTimestampField, 'asc'), (0, _firestore.limit)(batchSize));
          } else {
            newerQuery = (0, _firestore.query)(options.firestore.collection, (0, _firestore.orderBy)(serverTimestampField, 'asc'), (0, _firestore.limit)(batchSize));
          }
          var mustsReRun = true;
          var useDocs = [];
          var _temp4 = _for(function () {
            return !!mustsReRun;
          }, void 0, function () {
            /**
             * Local writes that have not been persisted to the server
             * are in pending state and do not have a correct serverTimestamp set.
             * We have to ensure we only use document states that are in sync with the server.
             * @link https://medium.com/firebase-developers/the-secrets-of-firestore-fieldvalue-servertimestamp-revealed-29dd7a38a82b
             */
            return Promise.resolve((0, _firestore.waitForPendingWrites)(options.firestore.database)).then(function () {
              return Promise.resolve((0, _firestore.runTransaction)(options.firestore.database, function (_tx) {
                try {
                  useDocs = [];
                  return Promise.resolve(Promise.all([(0, _firestore.getDocs)(newerQuery), sameTimeQuery ? (0, _firestore.getDocs)(sameTimeQuery) : undefined])).then(function (_ref) {
                    var newerQueryResult = _ref[0],
                      sameTimeQueryResult = _ref[1];
                    if (newerQueryResult.metadata.hasPendingWrites || sameTimeQuery && (0, _util.ensureNotFalsy)(sameTimeQueryResult).metadata.hasPendingWrites) {} else {
                      mustsReRun = false;
                      if (sameTimeQuery) {
                        useDocs = (0, _util.ensureNotFalsy)(sameTimeQueryResult).docs;
                      }
                      var missingAmount = batchSize - useDocs.length;
                      if (missingAmount > 0) {
                        var additonalDocs = newerQueryResult.docs.slice(0, missingAmount).filter(function (x) {
                          return !!x;
                        });
                        useDocs = useDocs.concat(additonalDocs);
                      }
                    }
                  });
                } catch (e) {
                  return Promise.reject(e);
                }
              })).then(function () {});
            });
          });
          return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
        } catch (e) {
          return Promise.reject(e);
        }
      },
      batchSize: (0, _util.ensureNotFalsy)(options.pull).batchSize,
      modifier: (0, _util.ensureNotFalsy)(options.pull).modifier,
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  if (options.push) {
    replicationPrimitivesPush = {
      handler: function handler(rows) {
        try {
          var writeRowsById = {};
          var docIds = rows.map(function (row) {
            var docId = row.newDocumentState[primaryPath];
            writeRowsById[docId] = row;
            return docId;
          });
          return Promise.resolve((0, _firestore.waitForPendingWrites)(options.firestore.database)).then(function () {
            var conflicts = [];

            /**
             * Everything must run INSIDE of the transaction
             * because on tx-errors, firebase will re-run the transaction on some cases.
             * @link https://firebase.google.com/docs/firestore/manage-data/transactions#transaction_failure
             * @link https://firebase.google.com/docs/firestore/manage-data/transactions
             */
            return Promise.resolve((0, _firestore.runTransaction)(options.firestore.database, function (_tx) {
              try {
                conflicts = []; // reset in case the tx has re-run.
                /**
                 * @link https://stackoverflow.com/a/48423626/3443137
                 */
                return Promise.resolve((0, _firestore.getDocs)((0, _firestore.query)(options.firestore.collection, (0, _firestore.where)((0, _firestore.documentId)(), 'in', docIds)))).then(function (docsInDbResult) {
                  var docsInDbById = {};
                  docsInDbResult.docs.forEach(function (row) {
                    var docDataInDb = (0, _firestoreHelper.stripServerTimestampField)(serverTimestampField, row.data());
                    var docId = row.id;
                    docDataInDb[primaryPath] = docId;
                    docsInDbById[docId] = docDataInDb;
                  });

                  /**
                   * @link https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes
                   */
                  var batch = (0, _firestore.writeBatch)(options.firestore.database);
                  var hasWrite = false;
                  return Promise.resolve(Promise.all(Object.entries(writeRowsById).map(function (_ref2) {
                    try {
                      var _temp7 = function _temp7(_collection$conflictH) {
                        if (docInDb && (_writeRow$assumedMast2 || _collection$conflictH.isEqual === false)) {
                          // conflict
                          conflicts.push(docInDb);
                        } else {
                          // no conflict
                          hasWrite = true;
                          var docRef = (0, _firestore.doc)(options.firestore.collection, docId);
                          var writeDocData = (0, _util.flatClone)(writeRow.newDocumentState);
                          writeDocData[serverTimestampField] = (0, _firestore.serverTimestamp)();
                          if (!docInDb) {
                            // insert
                            batch.set(docRef, (0, _firestoreHelper.stripPrimaryKey)(primaryPath, writeDocData));
                          } else {
                            // update
                            batch.update(docRef, (0, _firestoreHelper.stripPrimaryKey)(primaryPath, writeDocData));
                          }
                        }
                      };
                      var docId = _ref2[0],
                        writeRow = _ref2[1];
                      var docInDb = docsInDbById[docId];
                      var _writeRow$assumedMast2 = !writeRow.assumedMasterState;
                      return Promise.resolve(!docInDb || _writeRow$assumedMast2 ? _temp7(docInDb && (_writeRow$assumedMast2 || collection.conflictHandler({
                        newDocumentState: docInDb,
                        realMasterState: writeRow.assumedMasterState
                      }, 'replication-firestore-push'))) : Promise.resolve(docInDb && (_writeRow$assumedMast2 || collection.conflictHandler({
                        newDocumentState: docInDb,
                        realMasterState: writeRow.assumedMasterState
                      }, 'replication-firestore-push'))).then(_temp7));
                    } catch (e) {
                      return Promise.reject(e);
                    }
                  }))).then(function () {
                    var _temp5 = function () {
                      if (hasWrite) {
                        return Promise.resolve(batch.commit()).then(function () {});
                      }
                    }();
                    if (_temp5 && _temp5.then) return _temp5.then(function () {});
                  });
                });
              } catch (e) {
                return Promise.reject(e);
              }
            })).then(function () {
              return Promise.resolve((0, _firestore.waitForPendingWrites)(options.firestore.database)).then(function () {
                return conflicts;
              });
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      },
      batchSize: options.push.batchSize,
      modifier: options.push.modifier
    };
  }
  var replicationState = new RxFirestoreReplicationState(options.firestore, _firestoreHelper.FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX + (0, _util.fastUnsecureHash)(options.firestore.projectId), collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

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
          error: error
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
var RxDBReplicationFirestorePlugin = {
  name: 'replication-firestore',
  init: function init() {
    (0, _.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
  },
  rxdb: true,
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.syncFirestore = syncFirestore;
    }
  }
};
exports.RxDBReplicationFirestorePlugin = RxDBReplicationFirestorePlugin;
//# sourceMappingURL=index.js.map