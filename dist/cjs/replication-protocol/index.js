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
var _rxSchemaHelper = require("../rx-schema-helper.js");
var _index = require("../plugins/utils/index.js");
var _checkpoint = require("./checkpoint.js");
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
var _downstream = require("./downstream.js");
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
var _helper = require("./helper.js");
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
var _upstream = require("./upstream.js");
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
var _index2 = require("../plugins/attachments/index.js");
var _rxStorageHelper = require("../rx-storage-helper.js");
var _rxError = require("../rx-error.js");
var _metaInstance = require("./meta-instance.js");
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
var _conflicts = require("./conflicts.js");
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
var _defaultConflictHandler = require("./default-conflict-handler.js");
Object.keys(_defaultConflictHandler).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _defaultConflictHandler[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _defaultConflictHandler[key];
    }
  });
});
/**
 * These files contain the replication protocol.
 * It can be used to replicated RxStorageInstances or RxCollections
 * or even to do a client(s)-server replication.
 */

function replicateRxStorageInstance(input) {
  input = (0, _index.flatClone)(input);
  input.forkInstance = (0, _helper.getUnderlyingPersistentStorage)(input.forkInstance);
  input.metaInstance = (0, _helper.getUnderlyingPersistentStorage)(input.metaInstance);
  var checkpointKeyPromise = (0, _checkpoint.getCheckpointKey)(input);
  var state = {
    primaryPath: (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(input.forkInstance.schema.primaryKey),
    hasAttachments: !!input.forkInstance.schema.attachments,
    input,
    checkpointKey: checkpointKeyPromise,
    downstreamBulkWriteFlag: checkpointKeyPromise.then(checkpointKey => 'replication-downstream-' + checkpointKey),
    events: {
      canceled: new _rxjs.BehaviorSubject(false),
      paused: new _rxjs.BehaviorSubject(false),
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
      down: _index.PROMISE_RESOLVE_VOID,
      up: _index.PROMISE_RESOLVE_VOID
    },
    checkpointQueue: _index.PROMISE_RESOLVE_VOID,
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
     * If the Promises have not been reassigned
     * after awaiting them, we know that the replication
     * is in idle state at this point in time.
     */
    if (down === state.streamQueue.down && up === state.streamQueue.up) {
      return;
    }
  }
}
function rxStorageInstanceToReplicationHandler(instance, conflictHandler, databaseInstanceToken,
/**
 * If set to true,
 * the _meta.lwt from the pushed documents is kept.
 * (Used in the migration to ensure checkpoints are still valid)
 */
keepMeta = false) {
  instance = (0, _helper.getUnderlyingPersistentStorage)(instance);
  var hasAttachments = !!instance.schema.attachments;
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(instance.schema.primaryKey);
  var replicationHandler = {
    masterChangeStream$: instance.changeStream().pipe((0, _rxjs.mergeMap)(async eventBulk => {
      var ret = {
        checkpoint: eventBulk.checkpoint,
        documents: await Promise.all(eventBulk.events.map(async event => {
          var docData = (0, _helper.writeDocToDocState)(event.documentData, hasAttachments, keepMeta);
          if (hasAttachments) {
            docData = await (0, _index2.fillWriteDataForAttachmentsChange)(primaryPath, instance, (0, _index.clone)(docData),
            /**
             * Notice that the master never knows
             * the client state of the document.
             * Therefore we always send all attachments data.
             */
            undefined);
          }
          return docData;
        }))
      };
      return ret;
    })),
    masterChangesSince(checkpoint, batchSize) {
      return (0, _rxStorageHelper.getChangedDocumentsSince)(instance, batchSize, checkpoint).then(async result => {
        return {
          checkpoint: result.documents.length > 0 ? result.checkpoint : checkpoint,
          documents: await Promise.all(result.documents.map(async plainDocumentData => {
            var docData = (0, _helper.writeDocToDocState)(plainDocumentData, hasAttachments, keepMeta);
            if (hasAttachments) {
              docData = await (0, _index2.fillWriteDataForAttachmentsChange)(primaryPath, instance, (0, _index.clone)(docData),
              /**
               * Notice the the master never knows
               * the client state of the document.
               * Therefore we always send all attachments data.
               */
              undefined);
            }
            return docData;
          }))
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
      var masterDocsStateList = await instance.findDocumentsById(ids, true);
      var masterDocsState = new Map();
      masterDocsStateList.forEach(doc => masterDocsState.set(doc[primaryPath], doc));
      var conflicts = [];
      var writeRows = [];
      await Promise.all(Object.entries(rowById).map(([id, row]) => {
        var masterState = masterDocsState.get(id);
        if (!masterState) {
          writeRows.push({
            document: (0, _helper.docStateToWriteDoc)(databaseInstanceToken, hasAttachments, keepMeta, row.newDocumentState)
          });
        } else if (masterState && !row.assumedMasterState) {
          conflicts.push((0, _helper.writeDocToDocState)(masterState, hasAttachments, keepMeta));
        } else if (conflictHandler.isEqual((0, _helper.writeDocToDocState)(masterState, hasAttachments, keepMeta), (0, _index.ensureNotFalsy)(row.assumedMasterState), 'rxStorageInstanceToReplicationHandler-masterWrite') === true) {
          writeRows.push({
            previous: masterState,
            document: (0, _helper.docStateToWriteDoc)(databaseInstanceToken, hasAttachments, keepMeta, row.newDocumentState, masterState)
          });
        } else {
          conflicts.push((0, _helper.writeDocToDocState)(masterState, hasAttachments, keepMeta));
        }
      }));
      if (writeRows.length > 0) {
        var result = await instance.bulkWrite(writeRows, 'replication-master-write');
        result.error.forEach(err => {
          if (err.status !== 409) {
            throw (0, _rxError.newRxError)('SNH', {
              name: 'non conflict error',
              error: err
            });
          } else {
            conflicts.push((0, _helper.writeDocToDocState)((0, _index.ensureNotFalsy)(err.documentInDb), hasAttachments, keepMeta));
          }
        });
      }
      return conflicts;
    }
  };
  return replicationHandler;
}
async function cancelRxStorageReplication(replicationState) {
  replicationState.events.canceled.next(true);
  replicationState.events.active.up.complete();
  replicationState.events.active.down.complete();
  replicationState.events.processed.up.complete();
  replicationState.events.processed.down.complete();
  replicationState.events.resolvedConflicts.complete();
  replicationState.events.canceled.complete();
  await replicationState.checkpointQueue;
}
//# sourceMappingURL=index.js.map