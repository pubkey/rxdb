import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
/**
 * These files contain the replication protocol.
 * It can be used to replicated RxStorageInstances or RxCollections
 * or even to do a client(s)-server replication.
 */

import { BehaviorSubject, combineLatest, filter, firstValueFrom, map, Subject } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../rx-schema-helper';
import { ensureNotFalsy, PROMISE_RESOLVE_VOID } from '../plugins/utils';
import { getCheckpointKey } from './checkpoint';
import { startReplicationDownstream } from './downstream';
import { docStateToWriteDoc, writeDocToDocState } from './helper';
import { startReplicationUpstream } from './upstream';
export * from './checkpoint';
export * from './downstream';
export * from './upstream';
export * from './meta-instance';
export * from './conflicts';
export * from './helper';
export function replicateRxStorageInstance(input) {
  var checkpointKey = getCheckpointKey(input);
  var state = {
    primaryPath: getPrimaryFieldOfPrimaryKey(input.forkInstance.schema.primaryKey),
    input: input,
    checkpointKey: checkpointKey,
    downstreamBulkWriteFlag: 'replication-downstream-' + checkpointKey,
    events: {
      canceled: new BehaviorSubject(false),
      active: {
        down: new BehaviorSubject(true),
        up: new BehaviorSubject(true)
      },
      processed: {
        down: new Subject(),
        up: new Subject()
      },
      resolvedConflicts: new Subject(),
      error: new Subject()
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
      down: new BehaviorSubject(false),
      up: new BehaviorSubject(false)
    },
    streamQueue: {
      down: PROMISE_RESOLVE_VOID,
      up: PROMISE_RESOLVE_VOID
    },
    checkpointQueue: PROMISE_RESOLVE_VOID,
    lastCheckpointDoc: {}
  };
  startReplicationDownstream(state);
  startReplicationUpstream(state);
  return state;
}
export function awaitRxStorageReplicationFirstInSync(state) {
  return firstValueFrom(combineLatest([state.firstSyncDone.down.pipe(filter(function (v) {
    return !!v;
  })), state.firstSyncDone.up.pipe(filter(function (v) {
    return !!v;
  }))])).then(function () {});
}
export function awaitRxStorageReplicationInSync(replicationState) {
  return Promise.all([replicationState.streamQueue.up, replicationState.streamQueue.down, replicationState.checkpointQueue]);
}
export function awaitRxStorageReplicationIdle(_x) {
  return _awaitRxStorageReplicationIdle.apply(this, arguments);
}
function _awaitRxStorageReplicationIdle() {
  _awaitRxStorageReplicationIdle = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(state) {
    var _state$streamQueue, down, up;
    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return awaitRxStorageReplicationFirstInSync(state);
        case 2:
          if (!true) {
            _context3.next = 10;
            break;
          }
          _state$streamQueue = state.streamQueue, down = _state$streamQueue.down, up = _state$streamQueue.up;
          _context3.next = 6;
          return Promise.all([up, down]);
        case 6:
          if (!(down === state.streamQueue.down && up === state.streamQueue.up)) {
            _context3.next = 8;
            break;
          }
          return _context3.abrupt("return");
        case 8:
          _context3.next = 2;
          break;
        case 10:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _awaitRxStorageReplicationIdle.apply(this, arguments);
}
export function rxStorageInstanceToReplicationHandler(instance, conflictHandler, databaseInstanceToken) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(instance.schema.primaryKey);
  var replicationHandler = {
    masterChangeStream$: instance.changeStream().pipe(map(function (eventBulk) {
      var ret = {
        checkpoint: eventBulk.checkpoint,
        documents: eventBulk.events.map(function (event) {
          return writeDocToDocState(ensureNotFalsy(event.documentData));
        })
      };
      return ret;
    })),
    masterChangesSince: function masterChangesSince(checkpoint, batchSize) {
      return instance.getChangedDocumentsSince(batchSize, checkpoint).then(function (result) {
        return {
          checkpoint: result.documents.length > 0 ? result.checkpoint : checkpoint,
          documents: result.documents.map(function (d) {
            return writeDocToDocState(d);
          })
        };
      });
    },
    masterWrite: function () {
      var _masterWrite = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(rows) {
        var rowById, ids, masterDocsState, conflicts, writeRows, result;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              rowById = {};
              rows.forEach(function (row) {
                var docId = row.newDocumentState[primaryPath];
                rowById[docId] = row;
              });
              ids = Object.keys(rowById);
              _context2.next = 5;
              return instance.findDocumentsById(ids, true);
            case 5:
              masterDocsState = _context2.sent;
              conflicts = [];
              writeRows = [];
              _context2.next = 10;
              return Promise.all(Object.entries(rowById).map( /*#__PURE__*/function () {
                var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(_ref) {
                  var id, row, masterState;
                  return _regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) switch (_context.prev = _context.next) {
                      case 0:
                        id = _ref[0], row = _ref[1];
                        masterState = masterDocsState[id];
                        if (masterState) {
                          _context.next = 6;
                          break;
                        }
                        writeRows.push({
                          document: docStateToWriteDoc(databaseInstanceToken, row.newDocumentState)
                        });
                        _context.next = 18;
                        break;
                      case 6:
                        if (!(masterState && !row.assumedMasterState)) {
                          _context.next = 10;
                          break;
                        }
                        conflicts.push(writeDocToDocState(masterState));
                        _context.next = 18;
                        break;
                      case 10:
                        _context.next = 12;
                        return conflictHandler({
                          realMasterState: writeDocToDocState(masterState),
                          newDocumentState: ensureNotFalsy(row.assumedMasterState)
                        }, 'rxStorageInstanceToReplicationHandler-masterWrite');
                      case 12:
                        _context.t0 = _context.sent.isEqual;
                        if (!(_context.t0 === true)) {
                          _context.next = 17;
                          break;
                        }
                        writeRows.push({
                          previous: masterState,
                          document: docStateToWriteDoc(databaseInstanceToken, row.newDocumentState, masterState)
                        });
                        _context.next = 18;
                        break;
                      case 17:
                        conflicts.push(writeDocToDocState(masterState));
                      case 18:
                      case "end":
                        return _context.stop();
                    }
                  }, _callee);
                }));
                return function (_x3) {
                  return _ref2.apply(this, arguments);
                };
              }()));
            case 10:
              if (!(writeRows.length > 0)) {
                _context2.next = 15;
                break;
              }
              _context2.next = 13;
              return instance.bulkWrite(writeRows, 'replication-master-write');
            case 13:
              result = _context2.sent;
              Object.values(result.error).forEach(function (err) {
                if (err.status !== 409) {
                  throw new Error('non conflict error');
                } else {
                  conflicts.push(writeDocToDocState(ensureNotFalsy(err.documentInDb)));
                }
              });
            case 15:
              return _context2.abrupt("return", conflicts);
            case 16:
            case "end":
              return _context2.stop();
          }
        }, _callee2);
      }));
      function masterWrite(_x2) {
        return _masterWrite.apply(this, arguments);
      }
      return masterWrite;
    }()
  };
  return replicationHandler;
}
export function cancelRxStorageReplication(replicationState) {
  replicationState.events.canceled.next(true);
  replicationState.events.active.up.complete();
  replicationState.events.active.down.complete();
  replicationState.events.processed.up.complete();
  replicationState.events.processed.down.complete();
  replicationState.events.resolvedConflicts.complete();
  replicationState.events.canceled.complete();
}
//# sourceMappingURL=index.js.map