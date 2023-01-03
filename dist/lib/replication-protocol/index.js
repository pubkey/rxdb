"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  replicateRxStorageInstance: true,
  awaitRxStorageReplicationFirstInSync: true,
  awaitRxStorageReplicationInSync: true,
  awaitRxStorageReplicationIdle: true,
  rxStorageInstanceToReplicationHandler: true,
  cancelRxStorageReplication: true
};
exports.awaitRxStorageReplicationFirstInSync = awaitRxStorageReplicationFirstInSync;
exports.awaitRxStorageReplicationIdle = awaitRxStorageReplicationIdle;
exports.awaitRxStorageReplicationInSync = awaitRxStorageReplicationInSync;
exports.cancelRxStorageReplication = cancelRxStorageReplication;
exports.replicateRxStorageInstance = replicateRxStorageInstance;
exports.rxStorageInstanceToReplicationHandler = rxStorageInstanceToReplicationHandler;
var _rxjs = require("rxjs");
var _rxSchemaHelper = require("../rx-schema-helper");
var _utils = require("../plugins/utils");
var _checkpoint = require("./checkpoint");
Object.keys(_checkpoint).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _checkpoint[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _checkpoint[key];
    }
  });
});
var _downstream = require("./downstream");
Object.keys(_downstream).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _downstream[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _downstream[key];
    }
  });
});
var _helper = require("./helper");
Object.keys(_helper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _helper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _helper[key];
    }
  });
});
var _upstream = require("./upstream");
Object.keys(_upstream).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _upstream[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _upstream[key];
    }
  });
});
var _metaInstance = require("./meta-instance");
Object.keys(_metaInstance).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _metaInstance[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _metaInstance[key];
    }
  });
});
var _conflicts = require("./conflicts");
Object.keys(_conflicts).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _conflicts[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _conflicts[key];
    }
  });
});
/**
 * These files contain the replication protocol.
 * It can be used to replicated RxStorageInstances or RxCollections
 * or even to do a client(s)-server replication.
 */

function replicateRxStorageInstance(input) {
  var checkpointKey = (0, _checkpoint.getCheckpointKey)(input);
  var state = {
    primaryPath: (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(input.forkInstance.schema.primaryKey),
    input,
    checkpointKey,
    downstreamBulkWriteFlag: 'replication-downstream-' + checkpointKey,
    events: {
      canceled: new _rxjs.BehaviorSubject(false),
      active: {
        down: new _rxjs.BehaviorSubject(true),
        up: new _rxjs.BehaviorSubject(true)
      },
      processed: {
        down: new _rxjs.Subject(),
        up: new _rxjs.Subject()
      },
      resolvedConflicts: new _rxjs.Subject(),
      error: new _rxjs.Subject()
    },
    stats: {
      down: {
        addNewTask: 0,
        downstreamProcessChanges: 0,
        downstreamResyncOnce: 0,
        masterChangeStreamEmit: 0,
        persistFromMaster: 0
      },
      up: {
        forkChangeStreamEmit: 0,
        persistToMaster: 0,
        persistToMasterConflictWrites: 0,
        persistToMasterHadConflicts: 0,
        processTasks: 0,
        upstreamInitialSync: 0
      }
    },
    firstSyncDone: {
      down: new _rxjs.BehaviorSubject(false),
      up: new _rxjs.BehaviorSubject(false)
    },
    streamQueue: {
      down: _utils.PROMISE_RESOLVE_VOID,
      up: _utils.PROMISE_RESOLVE_VOID
    },
    checkpointQueue: _utils.PROMISE_RESOLVE_VOID,
    lastCheckpointDoc: {}
  };
  (0, _downstream.startReplicationDownstream)(state);
  (0, _upstream.startReplicationUpstream)(state);
  return state;
}
function awaitRxStorageReplicationFirstInSync(state) {
  return (0, _rxjs.firstValueFrom)((0, _rxjs.combineLatest)([state.firstSyncDone.down.pipe((0, _rxjs.filter)(v => !!v)), state.firstSyncDone.up.pipe((0, _rxjs.filter)(v => !!v))])).then(() => {});
}
function awaitRxStorageReplicationInSync(replicationState) {
  return Promise.all([replicationState.streamQueue.up, replicationState.streamQueue.down, replicationState.checkpointQueue]);
}
async function awaitRxStorageReplicationIdle(state) {
  await awaitRxStorageReplicationFirstInSync(state);
  while (true) {
    var {
      down,
      up
    } = state.streamQueue;
    await Promise.all([up, down]);
    /**
     * If the Promises have not been reasigned
     * after awaiting them, we know that the replication
     * is in idle state at this point in time.
     */
    if (down === state.streamQueue.down && up === state.streamQueue.up) {
      return;
    }
  }
}
function rxStorageInstanceToReplicationHandler(instance, conflictHandler, databaseInstanceToken) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(instance.schema.primaryKey);
  var replicationHandler = {
    masterChangeStream$: instance.changeStream().pipe((0, _rxjs.map)(eventBulk => {
      var ret = {
        checkpoint: eventBulk.checkpoint,
        documents: eventBulk.events.map(event => {
          return (0, _helper.writeDocToDocState)((0, _utils.ensureNotFalsy)(event.documentData));
        })
      };
      return ret;
    })),
    masterChangesSince(checkpoint, batchSize) {
      return instance.getChangedDocumentsSince(batchSize, checkpoint).then(result => {
        return {
          checkpoint: result.documents.length > 0 ? result.checkpoint : checkpoint,
          documents: result.documents.map(d => (0, _helper.writeDocToDocState)(d))
        };
      });
    },
    async masterWrite(rows) {
      var rowById = {};
      rows.forEach(row => {
        var docId = row.newDocumentState[primaryPath];
        rowById[docId] = row;
      });
      var ids = Object.keys(rowById);
      var masterDocsState = await instance.findDocumentsById(ids, true);
      var conflicts = [];
      var writeRows = [];
      await Promise.all(Object.entries(rowById).map(async ([id, row]) => {
        var masterState = masterDocsState[id];
        if (!masterState) {
          writeRows.push({
            document: (0, _helper.docStateToWriteDoc)(databaseInstanceToken, row.newDocumentState)
          });
        } else if (masterState && !row.assumedMasterState) {
          conflicts.push((0, _helper.writeDocToDocState)(masterState));
        } else if ((await conflictHandler({
          realMasterState: (0, _helper.writeDocToDocState)(masterState),
          newDocumentState: (0, _utils.ensureNotFalsy)(row.assumedMasterState)
        }, 'rxStorageInstanceToReplicationHandler-masterWrite')).isEqual === true) {
          writeRows.push({
            previous: masterState,
            document: (0, _helper.docStateToWriteDoc)(databaseInstanceToken, row.newDocumentState, masterState)
          });
        } else {
          conflicts.push((0, _helper.writeDocToDocState)(masterState));
        }
      }));
      if (writeRows.length > 0) {
        var result = await instance.bulkWrite(writeRows, 'replication-master-write');
        Object.values(result.error).forEach(err => {
          if (err.status !== 409) {
            throw new Error('non conflict error');
          } else {
            conflicts.push((0, _helper.writeDocToDocState)((0, _utils.ensureNotFalsy)(err.documentInDb)));
          }
        });
      }
      return conflicts;
    }
  };
  return replicationHandler;
}
function cancelRxStorageReplication(replicationState) {
  replicationState.events.canceled.next(true);
  replicationState.events.active.up.complete();
  replicationState.events.active.down.complete();
  replicationState.events.processed.up.complete();
  replicationState.events.processed.down.complete();
  replicationState.events.resolvedConflicts.complete();
  replicationState.events.canceled.complete();
}
//# sourceMappingURL=index.js.map