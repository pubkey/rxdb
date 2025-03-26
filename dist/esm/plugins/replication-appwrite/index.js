import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import { RxReplicationState, startReplicationOnLeaderShip } from "../replication/index.js";
import { addRxPlugin } from "../../plugin.js";
import { RxDBLeaderElectionPlugin } from "../leader-election/index.js";
import { Databases, Query } from 'appwrite';
import { lastOfArray } from "../utils/utils-array.js";
import { appwriteDocToRxDB, rxdbDocToAppwrite } from "./appwrite-helpers.js";
import { flatClone } from "../utils/utils-object.js";
import { Subject } from 'rxjs';
import { getFromMapOrThrow } from "../utils/index.js";
export var RxAppwriteReplicationState = /*#__PURE__*/function (_RxReplicationState) {
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
  _inheritsLoose(RxAppwriteReplicationState, _RxReplicationState);
  return RxAppwriteReplicationState;
}(RxReplicationState);
export function replicateAppwrite(options) {
  var collection = options.collection;
  var primaryKey = collection.schema.primaryPath;
  var pullStream$ = new Subject();
  addRxPlugin(RxDBLeaderElectionPlugin);
  options.live = typeof options.live === 'undefined' ? true : options.live;
  options.deletedField = options.deletedField ? options.deletedField : '_deleted';
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var databases = new Databases(options.client);
  var replicationPrimitivesPull = options.pull ? {
    batchSize: options.pull.batchSize,
    modifier: options.pull.modifier,
    stream$: pullStream$.asObservable(),
    initialCheckpoint: options.pull.initialCheckpoint,
    handler: async (lastPulledCheckpoint, batchSize) => {
      var queries = [];
      if (lastPulledCheckpoint) {
        queries.push(Query.or([Query.greaterThan('$updatedAt', lastPulledCheckpoint.updatedAt), Query.and([Query.equal('$updatedAt', lastPulledCheckpoint.updatedAt), Query.greaterThan('$id', lastPulledCheckpoint.id)])]));
      }
      queries.push(Query.orderAsc('$updatedAt'));
      queries.push(Query.orderAsc('$id'));
      queries.push(Query.limit(batchSize));
      var result = await databases.listDocuments(options.databaseId, options.collectionId, queries);
      var lastDoc = lastOfArray(result.documents);
      var newCheckpoint = lastDoc ? {
        id: lastDoc.$id,
        updatedAt: lastDoc.$updatedAt
      } : null;
      var resultDocs = result.documents.map(doc => {
        return appwriteDocToRxDB(doc, primaryKey, options.deletedField);
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

      // inserts will conflict on write
      var nonInsertRows = rows.filter(row => row.assumedMasterState);
      var updateDocsInDbById = new Map();
      if (nonInsertRows.length > 0) {
        if (nonInsertRows.length > 1) {
          query = Query.or(nonInsertRows.map(row => {
            var id = row.newDocumentState[primaryKey];
            return Query.equal('$id', id);
          }));
        } else {
          var id = nonInsertRows[0].newDocumentState[primaryKey];
          query = Query.equal('$id', id);
        }
        var updateDocsOnServer = await databases.listDocuments(options.databaseId, options.collectionId, [query]);
        updateDocsOnServer.documents.forEach(doc => {
          var docDataInDb = appwriteDocToRxDB(doc, primaryKey, options.deletedField);
          var docId = doc.$id;
          docDataInDb[primaryKey] = docId;
          updateDocsInDbById.set(docId, docDataInDb);
        });
      }
      var conflicts = [];
      await Promise.all(rows.map(async writeRow => {
        var docId = writeRow.newDocumentState[primaryKey];
        if (!writeRow.assumedMasterState) {
          // INSERT
          var insertDoc = rxdbDocToAppwrite(writeRow.newDocumentState, primaryKey, options.deletedField);
          try {
            await databases.createDocument(options.databaseId, options.collectionId, docId, insertDoc
            // ["read("any")"] // permissions (optional)
            );
          } catch (err) {
            if (err.code == 409 && err.name === 'AppwriteException') {
              // document already exists -> conflict
              var docOnServer = await databases.getDocument(options.databaseId, options.collectionId, docId);
              var docOnServerData = appwriteDocToRxDB(docOnServer, primaryKey, options.deletedField);
              conflicts.push(docOnServerData);
            } else {
              throw err;
            }
          }
        } else {
          // UPDATE
          /**
           * TODO appwrite does not have a update-if-equals-X method,
           * so we pre-fetch the documents and compare them locally.
           * This might cause problems when multiple users update the
           * same documents very fast.
           */
          var docInDb = getFromMapOrThrow(updateDocsInDbById, docId);
          if (!writeRow.assumedMasterState || collection.conflictHandler.isEqual(docInDb, writeRow.assumedMasterState, 'replication-appwrite-push') === false) {
            // conflict
            conflicts.push(docInDb);
          } else {
            // no conflict
            var writeDoc = flatClone(writeRow.newDocumentState);
            delete writeDoc[primaryKey];
            writeDoc[options.deletedField] = writeDoc._deleted;
            if (options.deletedField !== '_deleted') {
              delete writeDoc._deleted;
            }
            await databases.updateDocument(options.databaseId, options.collectionId, docId, writeDoc
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
        var docData = appwriteDocToRxDB(response.payload, primaryKey, options.deletedField);
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
  startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map