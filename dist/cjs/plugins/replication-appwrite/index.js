"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxAppwriteReplicationState = void 0;
exports.replicateAppwrite = replicateAppwrite;
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _index = require("../replication/index.js");
var _plugin = require("../../plugin.js");
var _index2 = require("../leader-election/index.js");
var _appwrite = require("appwrite");
var _utilsArray = require("../utils/utils-array.js");
var _appwriteHelpers = require("./appwrite-helpers.js");
var _utilsObject = require("../utils/utils-object.js");
var _rxjs = require("rxjs");
var RxAppwriteReplicationState = exports.RxAppwriteReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  function RxAppwriteReplicationState(replicationIdentifierHash, collection, pull, push, live = true, retryTime = 1000 * 5, autoStart = true) {
    var _this;
    _this = _RxReplicationState.call(this, replicationIdentifierHash, collection, '_deleted', pull, push, live, retryTime, autoStart) || this;
    _this.replicationIdentifierHash = replicationIdentifierHash;
    _this.collection = collection;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    return _this;
  }
  (0, _inheritsLoose2.default)(RxAppwriteReplicationState, _RxReplicationState);
  return RxAppwriteReplicationState;
}(_index.RxReplicationState);
function replicateAppwrite(options) {
  var collection = options.collection;
  var primaryKey = collection.schema.primaryPath;
  var pullStream$ = new _rxjs.Subject();
  (0, _plugin.addRxPlugin)(_index2.RxDBLeaderElectionPlugin);
  options.live = typeof options.live === 'undefined' ? true : options.live;
  options.deletedField = options.deletedField ? options.deletedField : '_deleted';
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var databases = new _appwrite.Databases(options.client);
  var replicationPrimitivesPull = options.pull ? {
    batchSize: options.pull.batchSize,
    modifier: options.pull.modifier,
    stream$: pullStream$.asObservable(),
    initialCheckpoint: options.pull.initialCheckpoint,
    handler: async (lastPulledCheckpoint, batchSize) => {
      var queries = [];
      if (lastPulledCheckpoint) {
        queries.push(_appwrite.Query.or([_appwrite.Query.greaterThan('$updatedAt', lastPulledCheckpoint.updatedAt), _appwrite.Query.and([_appwrite.Query.equal('$updatedAt', lastPulledCheckpoint.updatedAt), _appwrite.Query.greaterThan('$id', lastPulledCheckpoint.id)])]));
      }
      queries.push(_appwrite.Query.orderAsc('$updatedAt'));
      queries.push(_appwrite.Query.orderAsc('$id'));
      queries.push(_appwrite.Query.limit(batchSize));
      var result = await databases.listDocuments(options.databaseId, options.collectionId, queries);
      var lastDoc = (0, _utilsArray.lastOfArray)(result.documents);
      var newCheckpoint = lastDoc ? {
        id: lastDoc.$id,
        updatedAt: lastDoc.$updatedAt
      } : null;
      var resultDocs = result.documents.map(doc => {
        return (0, _appwriteHelpers.appwriteDocToRxDB)(doc, primaryKey, options.deletedField);
      });
      return {
        checkpoint: newCheckpoint,
        documents: resultDocs
      };
    }
  } : undefined;
  var replicationPrimitivesPush = options.push ? {
    async handler(rows) {
      var query;
      if (rows.length > 1) {
        query = _appwrite.Query.or(rows.map(row => {
          var id = row.newDocumentState[primaryKey];
          return _appwrite.Query.equal('$id', id);
        }));
      } else {
        var id = rows[0].newDocumentState[primaryKey];
        query = _appwrite.Query.equal('$id', id);
      }
      var docsOnServer = await databases.listDocuments(options.databaseId, options.collectionId, [query]);
      var docsInDbById = {};
      docsOnServer.documents.forEach(doc => {
        var docDataInDb = (0, _appwriteHelpers.appwriteDocToRxDB)(doc, primaryKey, options.deletedField);
        var docId = doc.$id;
        docDataInDb[primaryKey] = docId;
        docsInDbById[docId] = docDataInDb;
      });
      var conflicts = [];
      await Promise.all(rows.map(async writeRow => {
        var docId = writeRow.newDocumentState[primaryKey];
        var docInDb = docsInDbById[docId];
        if (docInDb && (!writeRow.assumedMasterState || collection.conflictHandler.isEqual(docInDb, writeRow.assumedMasterState, 'replication-appwrite-push') === false)) {
          // conflict
          conflicts.push(docInDb);
        } else {
          // no conflict
          var writeDoc = (0, _utilsObject.flatClone)(writeRow.newDocumentState);
          delete writeDoc[primaryKey];
          writeDoc[options.deletedField] = writeDoc._deleted;
          if (options.deletedField !== '_deleted') {
            delete writeDoc._deleted;
          }
          var result;
          if (!docInDb) {
            result = await databases.createDocument(options.databaseId, options.collectionId, docId, writeDoc
            // ["read("any")"] // permissions (optional)
            );
          } else {
            result = await databases.updateDocument(options.databaseId, options.collectionId, docId, writeDoc
            // ["read("any")"] // permissions (optional)
            );
          }
        }
      }));
      return conflicts;
    }
  } : undefined;
  var replicationState = new RxAppwriteReplicationState(options.replicationIdentifier, collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Subscribe to changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    var cancelBefore = replicationState.cancel.bind(replicationState);
    replicationState.start = () => {
      var channel = 'databases.' + options.databaseId + '.collections.' + options.collectionId + '.documents';
      var unsubscribe = options.client.subscribe(channel, response => {
        var docData = (0, _appwriteHelpers.appwriteDocToRxDB)(response.payload, primaryKey, options.deletedField);
        pullStream$.next({
          checkpoint: {
            id: docData[primaryKey],
            updatedAt: response.payload.$updatedAt
          },
          documents: [docData]
        });
      });
      replicationState.cancel = () => {
        unsubscribe();
        return cancelBefore();
      };
      return startBefore();
    };
  }
  (0, _index.startReplicationOnLeaderShip)(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map