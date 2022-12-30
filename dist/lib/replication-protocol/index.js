"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
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
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
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
    get: function get() {
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
    get: function get() {
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
    get: function get() {
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
    get: function get() {
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
    get: function get() {
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
    get: function get() {
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
    input: input,
    checkpointKey: checkpointKey,
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
  return (0, _rxjs.firstValueFrom)((0, _rxjs.combineLatest)([state.firstSyncDone.down.pipe((0, _rxjs.filter)(function (v) {
    return !!v;
  })), state.firstSyncDone.up.pipe((0, _rxjs.filter)(function (v) {
    return !!v;
  }))])).then(function () {});
}
function awaitRxStorageReplicationInSync(replicationState) {
  return Promise.all([replicationState.streamQueue.up, replicationState.streamQueue.down, replicationState.checkpointQueue]);
}
function awaitRxStorageReplicationIdle(_x) {
  return _awaitRxStorageReplicationIdle.apply(this, arguments);
}
function _awaitRxStorageReplicationIdle() {
  _awaitRxStorageReplicationIdle = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(state) {
    var _state$streamQueue, down, up;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
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
function rxStorageInstanceToReplicationHandler(instance, conflictHandler, databaseInstanceToken) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(instance.schema.primaryKey);
  var replicationHandler = {
    masterChangeStream$: instance.changeStream().pipe((0, _rxjs.map)(function (eventBulk) {
      var ret = {
        checkpoint: eventBulk.checkpoint,
        documents: eventBulk.events.map(function (event) {
          return (0, _helper.writeDocToDocState)((0, _utils.ensureNotFalsy)(event.documentData));
        })
      };
      return ret;
    })),
    masterChangesSince: function masterChangesSince(checkpoint, batchSize) {
      return instance.getChangedDocumentsSince(batchSize, checkpoint).then(function (result) {
        return {
          checkpoint: result.documents.length > 0 ? result.checkpoint : checkpoint,
          documents: result.documents.map(function (d) {
            return (0, _helper.writeDocToDocState)(d);
          })
        };
      });
    },
    masterWrite: function () {
      var _masterWrite = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(rows) {
        var rowById, ids, masterDocsState, conflicts, writeRows, result;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
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
                var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(_ref) {
                  var id, row, masterState;
                  return _regenerator["default"].wrap(function _callee$(_context) {
                    while (1) switch (_context.prev = _context.next) {
                      case 0:
                        id = _ref[0], row = _ref[1];
                        masterState = masterDocsState[id];
                        if (masterState) {
                          _context.next = 6;
                          break;
                        }
                        writeRows.push({
                          document: (0, _helper.docStateToWriteDoc)(databaseInstanceToken, row.newDocumentState)
                        });
                        _context.next = 18;
                        break;
                      case 6:
                        if (!(masterState && !row.assumedMasterState)) {
                          _context.next = 10;
                          break;
                        }
                        conflicts.push((0, _helper.writeDocToDocState)(masterState));
                        _context.next = 18;
                        break;
                      case 10:
                        _context.next = 12;
                        return conflictHandler({
                          realMasterState: (0, _helper.writeDocToDocState)(masterState),
                          newDocumentState: (0, _utils.ensureNotFalsy)(row.assumedMasterState)
                        }, 'rxStorageInstanceToReplicationHandler-masterWrite');
                      case 12:
                        _context.t0 = _context.sent.isEqual;
                        if (!(_context.t0 === true)) {
                          _context.next = 17;
                          break;
                        }
                        writeRows.push({
                          previous: masterState,
                          document: (0, _helper.docStateToWriteDoc)(databaseInstanceToken, row.newDocumentState, masterState)
                        });
                        _context.next = 18;
                        break;
                      case 17:
                        conflicts.push((0, _helper.writeDocToDocState)(masterState));
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
                  conflicts.push((0, _helper.writeDocToDocState)((0, _utils.ensureNotFalsy)(err.documentInDb)));
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