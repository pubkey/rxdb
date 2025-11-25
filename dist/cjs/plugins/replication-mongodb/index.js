"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxMongoDBReplicationState: true,
  replicateMongoDB: true
};
exports.RxMongoDBReplicationState = void 0;
exports.replicateMongoDB = replicateMongoDB;
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _index = require("../../plugins/utils/index.js");
var _index2 = require("../leader-election/index.js");
var _index3 = require("../replication/index.js");
var _index4 = require("../../index.js");
var _rxjs = require("rxjs");
var _mongodb = require("mongodb");
var _mongodbHelper = require("../storage-mongodb/mongodb-helper.js");
var _mongodbCheckpoint = require("./mongodb-checkpoint.js");
Object.keys(_mongodbCheckpoint).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _mongodbCheckpoint[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _mongodbCheckpoint[key];
    }
  });
});
var _mongodbHelper2 = require("./mongodb-helper.js");
Object.keys(_mongodbHelper2).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _mongodbHelper2[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _mongodbHelper2[key];
    }
  });
});
var RxMongoDBReplicationState = exports.RxMongoDBReplicationState = /*#__PURE__*/function (_RxReplicationState) {
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
  (0, _inheritsLoose2.default)(RxMongoDBReplicationState, _RxReplicationState);
  return RxMongoDBReplicationState;
}(_index3.RxReplicationState);
function replicateMongoDB(options) {
  (0, _index4.addRxPlugin)(_index2.RxDBLeaderElectionPlugin);
  var primaryPath = options.collection.schema.primaryPath;
  options.live = typeof options.live === 'undefined' ? true : options.live;
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var pullStream$ = new _rxjs.Subject();
  var mongoClient = new _mongodb.MongoClient(options.mongodb.connection, _mongodbHelper.MONGO_OPTIONS_DRIVER_INFO);
  var mongoDatabase = mongoClient.db(options.mongodb.databaseName);
  var mongoCollection = mongoDatabase.collection(options.mongodb.collectionName);
  var replicationPrimitivesPull;
  if (options.pull) {
    replicationPrimitivesPull = {
      async handler(lastPulledCheckpoint, batchSize) {
        var result = await (0, _mongodbCheckpoint.iterateCheckpoint)(primaryPath, mongoCollection, batchSize, lastPulledCheckpoint);
        return {
          documents: result.docs,
          checkpoint: result.checkpoint
        };
      },
      batchSize: (0, _index.ensureNotFalsy)(options.pull).batchSize,
      modifier: (0, _index.ensureNotFalsy)(options.pull).modifier,
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
          var toMongoDoc = (0, _mongodbHelper2.rxdbDocToMongo)(row.newDocumentState);
          var docId = row.newDocumentState[primaryPath];
          var current = currentDocsMap.get(docId);
          var remoteDocState = current ? (0, _mongodbHelper2.mongodbDocToRxDB)(primaryPath, current) : undefined;

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
                  var conflicting = (0, _index.flatClone)(row.assumedMasterState);
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
      var changestream = await (0, _mongodbHelper2.startChangeStream)(mongoCollection, undefined, replicationState.subjects.error);
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
  (0, _index3.startReplicationOnLeaderShip)(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map