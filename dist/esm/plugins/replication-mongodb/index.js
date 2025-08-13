import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import { ensureNotFalsy, flatClone } from "../../plugins/utils/index.js";
import { RxDBLeaderElectionPlugin } from "../leader-election/index.js";
import { RxReplicationState, startReplicationOnLeaderShip } from "../replication/index.js";
import { addRxPlugin } from "../../index.js";
import { Subject } from 'rxjs';
import { MongoClient } from 'mongodb';
import { MONGO_OPTIONS_DRIVER_INFO } from "../storage-mongodb/mongodb-helper.js";
import { iterateCheckpoint } from "./mongodb-checkpoint.js";
import { mongodbDocToRxDB, rxdbDocToMongo, startChangeStream } from "./mongodb-helper.js";
export * from "./mongodb-helper.js";
export * from "./mongodb-checkpoint.js";
export var RxMongoDBReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  function RxMongoDBReplicationState(mongoClient, mongoDatabase, mongoCollection, options, replicationIdentifier, collection, pull, push, live = true, retryTime = 1000 * 5, autoStart = true) {
    var _this;
    _this = _RxReplicationState.call(this, replicationIdentifier, collection, '_deleted', pull, push, live, retryTime, autoStart) || this;
    _this.mongoClient = mongoClient;
    _this.mongoDatabase = mongoDatabase;
    _this.mongoCollection = mongoCollection;
    _this.options = options;
    _this.replicationIdentifier = replicationIdentifier;
    _this.collection = collection;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    return _this;
  }
  _inheritsLoose(RxMongoDBReplicationState, _RxReplicationState);
  return RxMongoDBReplicationState;
}(RxReplicationState);
export function replicateMongoDB(options) {
  addRxPlugin(RxDBLeaderElectionPlugin);
  var primaryPath = options.collection.schema.primaryPath;
  options.live = typeof options.live === 'undefined' ? true : options.live;
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var pullStream$ = new Subject();
  var mongoClient = new MongoClient(options.mongodb.connection, MONGO_OPTIONS_DRIVER_INFO);
  var mongoDatabase = mongoClient.db(options.mongodb.databaseName);
  var mongoCollection = mongoDatabase.collection(options.mongodb.collectionName);
  var replicationPrimitivesPull;
  if (options.pull) {
    replicationPrimitivesPull = {
      async handler(lastPulledCheckpoint, batchSize) {
        var result = await iterateCheckpoint(primaryPath, mongoCollection, batchSize, lastPulledCheckpoint);
        return {
          documents: result.docs,
          checkpoint: result.checkpoint
        };
      },
      batchSize: ensureNotFalsy(options.pull).batchSize,
      modifier: ensureNotFalsy(options.pull).modifier,
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  if (options.push) {
    replicationPrimitivesPush = {
      async handler(rows) {
        var conflicts = [];
        var session = mongoClient.startSession();
        session.startTransaction(options.mongodb.pushTransactionOptions);
        var ids = rows.map(row => row.newDocumentState[primaryPath]);
        var currentDocsArray = await mongoCollection.find({
          [primaryPath]: {
            $in: ids
          }
        }, {
          session
        }).toArray();
        var currentDocsMap = new Map();
        currentDocsArray.forEach(doc => {
          currentDocsMap.set(doc[primaryPath], doc);
        });
        var promises = [];
        rows.forEach(row => {
          var toMongoDoc = rxdbDocToMongo(row.newDocumentState);
          var docId = row.newDocumentState[primaryPath];
          var current = currentDocsMap.get(docId);
          var remoteDocState = current ? mongodbDocToRxDB(primaryPath, current) : undefined;

          /**
           * We do not want to require a deleted-flag or any RxDB specific stuff on the RxDB side.
           * So for deletes we have to hack around this.
           */
          var assumedMaster = row.assumedMasterState;
          if (row.newDocumentState._deleted) {
            if (remoteDocState) {
              if (!assumedMaster) {
                // remote exists but not assumed -> conflict
                conflicts.push(remoteDocState);
              } else if (assumedMaster._deleted) {
                // remote exists but assumed as deleted -> conflict
                conflicts.push(remoteDocState);
              } else {
                // remote exists and assumed to exist -> check for normal conflict or do the deletion-write
                if (options.collection.conflictHandler.isEqual(remoteDocState, assumedMaster, 'mongodb-pull-equal-check-deleted') === false) {
                  // conflict
                  conflicts.push(remoteDocState);
                } else {
                  promises.push(mongoCollection.deleteOne({
                    [primaryPath]: docId
                  }, {
                    session
                  }));
                }
              }
            } else {
              if (!assumedMaster) {
                // no remote and no assumed master -> insertion of deleted -> do nothing
              } else if (assumedMaster._deleted) {
                // no remote and assumed master also deleted -> insertion of deleted -> do nothing
              }
            }
          } else {
            /**
             * Non-deleted are handled normally like in every other
             * of the replication plugins.
             */
            if (remoteDocState && (!row.assumedMasterState || options.collection.conflictHandler.isEqual(remoteDocState, row.assumedMasterState, 'mongodb-pull-equal-check') === false)) {
              // conflict
              conflicts.push(remoteDocState);
            } else {
              if (current) {
                if (row.newDocumentState._deleted) {
                  promises.push(mongoCollection.deleteOne({
                    [primaryPath]: docId
                  }, {
                    session
                  }));
                } else {
                  promises.push(mongoCollection.updateOne({
                    [primaryPath]: docId
                  }, {
                    $set: toMongoDoc
                  }, {
                    upsert: true,
                    session
                  }));
                }
              } else {
                /**
                 * No current but has assumed.
                 * This means the server state was deleted
                 * and we have a conflict.
                 */
                if (row.assumedMasterState) {
                  var conflicting = flatClone(row.assumedMasterState);
                  conflicting._deleted = true;
                  conflicts.push(conflicting);
                } else {
                  if (row.newDocumentState._deleted) {
                    // inserting deleted -> do nothing
                  } else {
                    promises.push(mongoCollection.insertOne(toMongoDoc, {
                      session
                    }));
                  }
                }
              }
            }
          }
        });
        await Promise.all(promises);
        await session.commitTransaction();
        return conflicts;
      },
      batchSize: options.push.batchSize,
      modifier: options.push.modifier
    };
  }
  var replicationState = new RxMongoDBReplicationState(mongoClient, mongoDatabase, mongoCollection, options, options.replicationIdentifier, options.collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Subscribe to changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    var cancelBefore = replicationState.cancel.bind(replicationState);
    replicationState.start = async () => {
      var changestream = await startChangeStream(mongoCollection, undefined, replicationState.subjects.error);
      changestream.on('change', () => {
        // TODO use the documents data of the change instead of emitting the RESYNC flag
        pullStream$.next('RESYNC');
      });
      replicationState.cancel = async () => {
        await changestream.close();
        return cancelBefore();
      };
      return startBefore();
    };
  }
  startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map