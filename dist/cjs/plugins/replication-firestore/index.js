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
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _index = require("../../plugins/utils/index.js");
var _firestore = require("firebase/firestore");
var _index2 = require("../leader-election/index.js");
var _index3 = require("../replication/index.js");
var _index4 = require("../../index.js");
var _rxjs = require("rxjs");
var _firestoreHelper = require("./firestore-helper.js");
Object.keys(_firestoreHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _firestoreHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _firestoreHelper[key];
    }
  });
});
var _firestoreTypes = require("./firestore-types.js");
Object.keys(_firestoreTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _firestoreTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _firestoreTypes[key];
    }
  });
});
var RxFirestoreReplicationState = exports.RxFirestoreReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  function RxFirestoreReplicationState(firestore, replicationIdentifierHash, collection, pull, push, live = true, retryTime = 1000 * 5, autoStart = true) {
    var _this;
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
  (0, _inheritsLoose2.default)(RxFirestoreReplicationState, _RxReplicationState);
  return RxFirestoreReplicationState;
}(_index3.RxReplicationState);
function replicateFirestore(options) {
  var collection = options.collection;
  (0, _index4.addRxPlugin)(_index2.RxDBLeaderElectionPlugin);
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
  var schemaPart = (0, _index4.getSchemaByObjectPath)(collection.schema.jsonSchema, serverTimestampField);
  if (schemaPart ||
  // also must not be nested.
  serverTimestampField.includes('.')) {
    throw (0, _index4.newRxError)('RC6', {
      field: serverTimestampField,
      schema: collection.schema.jsonSchema
    });
  }
  var pullFilters = options.pull?.filter !== undefined ? (0, _index.toArray)(options.pull.filter) : [];
  var pullQuery = (0, _firestore.query)(options.firestore.collection, ...pullFilters);
  if (options.pull) {
    replicationPrimitivesPull = {
      async handler(lastPulledCheckpoint, batchSize) {
        var newerQuery;
        var sameTimeQuery;
        if (lastPulledCheckpoint) {
          var lastServerTimestamp = (0, _firestoreHelper.isoStringToServerTimestamp)(lastPulledCheckpoint.serverTimestamp);
          newerQuery = (0, _firestore.query)(pullQuery, (0, _firestore.where)(serverTimestampField, '>', lastServerTimestamp), (0, _firestore.orderBy)(serverTimestampField, 'asc'), (0, _firestore.limit)(batchSize));
          sameTimeQuery = (0, _firestore.query)(pullQuery, (0, _firestore.where)(serverTimestampField, '==', lastServerTimestamp), (0, _firestore.where)((0, _firestore.documentId)(), '>', lastPulledCheckpoint.id), (0, _firestore.orderBy)((0, _firestore.documentId)(), 'asc'), (0, _firestore.limit)(batchSize));
        } else {
          newerQuery = (0, _firestore.query)(pullQuery, (0, _firestore.orderBy)(serverTimestampField, 'asc'), (0, _firestore.limit)(batchSize));
        }
        var mustsReRun = true;
        var useDocs = [];
        while (mustsReRun) {
          /**
           * Local writes that have not been persisted to the server
           * are in pending state and do not have a correct serverTimestamp set.
           * We have to ensure we only use document states that are in sync with the server.
           * @link https://medium.com/firebase-developers/the-secrets-of-firestore-fieldvalue-servertimestamp-revealed-29dd7a38a82b
           */
          await (0, _firestore.waitForPendingWrites)(options.firestore.database);
          await (0, _firestore.runTransaction)(options.firestore.database, async _tx => {
            useDocs = [];
            var [newerQueryResult, sameTimeQueryResult] = await Promise.all([(0, _firestore.getDocs)(newerQuery), sameTimeQuery ? (0, _firestore.getDocs)(sameTimeQuery) : undefined]);
            if (newerQueryResult.metadata.hasPendingWrites || sameTimeQuery && (0, _index.ensureNotFalsy)(sameTimeQueryResult).metadata.hasPendingWrites) {
              return;
            } else {
              mustsReRun = false;
              if (sameTimeQuery) {
                useDocs = (0, _index.ensureNotFalsy)(sameTimeQueryResult).docs;
              }
              var missingAmount = batchSize - useDocs.length;
              if (missingAmount > 0) {
                var additionalDocs = newerQueryResult.docs.slice(0, missingAmount).filter(x => !!x);
                (0, _index.appendToArray)(useDocs, additionalDocs);
              }
            }
          });
        }
        if (useDocs.length === 0) {
          return {
            checkpoint: lastPulledCheckpoint ?? null,
            documents: []
          };
        }
        var lastDoc = (0, _index.ensureNotFalsy)((0, _index.lastOfArray)(useDocs));
        var documents = useDocs.map(row => (0, _firestoreHelper.firestoreRowToDocData)(serverTimestampField, primaryPath, row));
        var newCheckpoint = {
          id: lastDoc.id,
          serverTimestamp: (0, _firestoreHelper.serverTimestampToIsoString)(serverTimestampField, lastDoc.data())
        };
        var ret = {
          documents: documents,
          checkpoint: newCheckpoint
        };
        return ret;
      },
      batchSize: (0, _index.ensureNotFalsy)(options.pull).batchSize,
      modifier: (0, _index.ensureNotFalsy)(options.pull).modifier,
      stream$: pullStream$.asObservable(),
      initialCheckpoint: options.pull.initialCheckpoint
    };
  }
  var replicationPrimitivesPush;
  if (options.push) {
    var pushFilter = options.push?.filter;
    replicationPrimitivesPush = {
      async handler(rows) {
        if (pushFilter !== undefined) {
          rows = await (0, _index.asyncFilter)(rows, row => pushFilter(row.newDocumentState));
        }
        var writeRowsById = {};
        var docIds = rows.map(row => {
          var docId = row.newDocumentState[primaryPath];
          writeRowsById[docId] = row;
          return docId;
        });
        await (0, _firestore.waitForPendingWrites)(options.firestore.database);
        var conflicts = [];

        /**
         * Everything must run INSIDE of the transaction
         * because on tx-errors, firebase will re-run the transaction on some cases.
         * @link https://firebase.google.com/docs/firestore/manage-data/transactions#transaction_failure
         * @link https://firebase.google.com/docs/firestore/manage-data/transactions
         */
        await (0, _firestore.runTransaction)(options.firestore.database, async _tx => {
          conflicts = []; // reset in case the tx has re-run.
          /**
           * @link https://stackoverflow.com/a/48423626/3443137
           */

          var getQuery = ids => {
            return (0, _firestore.getDocs)((0, _firestore.query)(options.firestore.collection, (0, _firestore.where)((0, _firestore.documentId)(), 'in', ids)));
          };
          var docsInDbResult = await (0, _firestoreHelper.getContentByIds)(docIds, getQuery);
          var docsInDbById = {};
          docsInDbResult.forEach(row => {
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
          await Promise.all(Object.entries(writeRowsById).map(async ([docId, writeRow]) => {
            var docInDb = docsInDbById[docId];
            if (docInDb && (!writeRow.assumedMasterState || collection.conflictHandler.isEqual(docInDb, writeRow.assumedMasterState, 'replication-firestore-push') === false)) {
              // conflict
              conflicts.push(docInDb);
            } else {
              // no conflict
              hasWrite = true;
              var docRef = (0, _firestore.doc)(options.firestore.collection, docId);
              var writeDocData = (0, _index.flatClone)(writeRow.newDocumentState);
              writeDocData[serverTimestampField] = (0, _firestore.serverTimestamp)();
              if (!docInDb) {
                // insert
                batch.set(docRef, (0, _firestoreHelper.stripPrimaryKey)(primaryPath, writeDocData));
              } else {
                // update
                batch.update(docRef, (0, _firestoreHelper.stripPrimaryKey)(primaryPath, writeDocData));
              }
            }
          }));
          if (hasWrite) {
            await batch.commit();
          }
        });
        await (0, _firestore.waitForPendingWrites)(options.firestore.database);
        return conflicts;
      },
      batchSize: options.push.batchSize,
      modifier: options.push.modifier
    };
  }
  var replicationState = new RxFirestoreReplicationState(options.firestore, options.replicationIdentifier, collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Use long polling to get live changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    var cancelBefore = replicationState.cancel.bind(replicationState);
    replicationState.start = () => {
      var lastChangeQuery = (0, _firestore.query)(pullQuery, (0, _firestore.orderBy)(serverTimestampField, 'desc'), (0, _firestore.limit)(1));
      var unsubscribe = (0, _firestore.onSnapshot)(lastChangeQuery, _querySnapshot => {
        /**
         * There is no good way to observe the event stream in firestore.
         * So instead we listen to any write to the collection
         * and then emit a 'RESYNC' flag.
         */
        replicationState.reSync();
      }, error => {
        replicationState.subjects.error.next((0, _index4.newRxError)('RC_STREAM', {
          error: (0, _index.errorToPlainJson)(error)
        }));
      });
      replicationState.cancel = () => {
        unsubscribe();
        return cancelBefore();
      };
      return startBefore();
    };
  }
  (0, _index3.startReplicationOnLeaderShip)(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map