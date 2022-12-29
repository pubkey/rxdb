"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startReplicationUpstream = startReplicationUpstream;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _rxjs = require("rxjs");
var _rxStorageHelper = require("../rx-storage-helper");
var _util = require("../util");
var _checkpoint = require("./checkpoint");
var _conflicts = require("./conflicts");
var _helper = require("./helper");
var _metaInstance = require("./meta-instance");
/**
 * Writes all document changes from the fork to the master.
 * The upstream runs on two modes:
 * - For initial replication, a checkpoint-iteration is used
 * - For ongoing local writes, we just subscribe to the changeStream of the fork.
 *   In contrast to the master, the fork can be assumed to never loose connection,
 *   so we do not have to prepare for missed out events.
 */
function startReplicationUpstream(state) {
  var replicationHandler = state.input.replicationHandler;
  state.streamQueue.up = state.streamQueue.up.then(function () {
    return upstreamInitialSync().then(function () {
      processTasks();
    });
  });

  // used to detect which tasks etc can in it at which order.
  var timer = 0;
  var initialSyncStartTime = -1;
  var openTasks = [];
  var sub = state.input.forkInstance.changeStream().pipe((0, _rxjs.filter)(function (eventBulk) {
    return eventBulk.context !== state.downstreamBulkWriteFlag;
  })).subscribe(function (eventBulk) {
    state.stats.up.forkChangeStreamEmit = state.stats.up.forkChangeStreamEmit + 1;
    openTasks.push({
      task: eventBulk,
      time: timer++
    });
    if (state.input.waitBeforePersist) {
      return state.input.waitBeforePersist().then(function () {
        return processTasks();
      });
    } else {
      return processTasks();
    }
  });
  (0, _rxjs.firstValueFrom)(state.events.canceled.pipe((0, _rxjs.filter)(function (canceled) {
    return !!canceled;
  }))).then(function () {
    return sub.unsubscribe();
  });
  function upstreamInitialSync() {
    return _upstreamInitialSync.apply(this, arguments);
  }
  /**
   * Takes all open tasks an processes them at once.
   */
  function _upstreamInitialSync() {
    _upstreamInitialSync = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4() {
      var lastCheckpoint, promises, upResult, resolvedPromises, hadConflicts;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            state.stats.up.upstreamInitialSync = state.stats.up.upstreamInitialSync + 1;
            if (!state.events.canceled.getValue()) {
              _context4.next = 3;
              break;
            }
            return _context4.abrupt("return");
          case 3:
            state.checkpointQueue = state.checkpointQueue.then(function () {
              return (0, _checkpoint.getLastCheckpointDoc)(state, 'up');
            });
            _context4.next = 6;
            return state.checkpointQueue;
          case 6:
            lastCheckpoint = _context4.sent;
            promises = [];
          case 8:
            if (state.events.canceled.getValue()) {
              _context4.next = 19;
              break;
            }
            initialSyncStartTime = timer++;
            _context4.next = 12;
            return state.input.forkInstance.getChangedDocumentsSince(state.input.pushBatchSize, lastCheckpoint);
          case 12:
            upResult = _context4.sent;
            if (!(upResult.documents.length === 0)) {
              _context4.next = 15;
              break;
            }
            return _context4.abrupt("break", 19);
          case 15:
            lastCheckpoint = (0, _rxStorageHelper.stackCheckpoints)([lastCheckpoint, upResult.checkpoint]);
            promises.push(persistToMaster(upResult.documents, (0, _util.ensureNotFalsy)(lastCheckpoint)));
            _context4.next = 8;
            break;
          case 19:
            _context4.next = 21;
            return Promise.all(promises);
          case 21:
            resolvedPromises = _context4.sent;
            hadConflicts = resolvedPromises.find(function (r) {
              return !!r;
            });
            if (!hadConflicts) {
              _context4.next = 28;
              break;
            }
            _context4.next = 26;
            return upstreamInitialSync();
          case 26:
            _context4.next = 29;
            break;
          case 28:
            if (!state.firstSyncDone.up.getValue()) {
              state.firstSyncDone.up.next(true);
            }
          case 29:
          case "end":
            return _context4.stop();
        }
      }, _callee4);
    }));
    return _upstreamInitialSync.apply(this, arguments);
  }
  function processTasks() {
    if (state.events.canceled.getValue() || openTasks.length === 0) {
      state.events.active.up.next(false);
      return;
    }
    state.stats.up.processTasks = state.stats.up.processTasks + 1;
    state.events.active.up.next(true);
    state.streamQueue.up = state.streamQueue.up.then(function () {
      /**
       * Merge/filter all open tasks
       */
      var docs = [];
      var checkpoint = {};
      while (openTasks.length > 0) {
        var taskWithTime = (0, _util.ensureNotFalsy)(openTasks.shift());
        /**
         * If the task came in before the last time the initial sync fetching
         * has run, we can ignore the task because the initial sync already processed
         * these documents.
         */
        if (taskWithTime.time < initialSyncStartTime) {
          continue;
        }
        docs = docs.concat(taskWithTime.task.events.map(function (r) {
          return r.documentData;
        }));
        checkpoint = (0, _rxStorageHelper.stackCheckpoints)([checkpoint, taskWithTime.task.checkpoint]);
      }
      var promise = docs.length === 0 ? _util.PROMISE_RESOLVE_FALSE : persistToMaster(docs, checkpoint);
      return promise.then(function () {
        if (openTasks.length === 0) {
          state.events.active.up.next(false);
        } else {
          processTasks();
        }
      });
    });
  }
  var persistenceQueue = _util.PROMISE_RESOLVE_FALSE;
  var nonPersistedFromMaster = {
    docs: {}
  };

  /**
   * Returns true if had conflicts,
   * false if not.
   */
  function persistToMaster(docs, checkpoint) {
    state.stats.up.persistToMaster = state.stats.up.persistToMaster + 1;

    /**
     * Add the new docs to the non-persistend list
     */
    docs.forEach(function (docData) {
      var docId = docData[state.primaryPath];
      nonPersistedFromMaster.docs[docId] = docData;
    });
    nonPersistedFromMaster.checkpoint = checkpoint;
    persistenceQueue = persistenceQueue.then( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      var upDocsById, useCheckpoint, docIds, assumedMasterState, writeRowsToMaster, writeRowsToMasterIds, writeRowsToMeta, forkStateById, writeRowsArray, conflictIds, conflictsById, writeBatches, useWriteRowsToMeta, hadConflictWrites, conflictWriteFork, conflictWriteMeta, forkWriteResult, useMetaWrites;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            if (!state.events.canceled.getValue()) {
              _context3.next = 2;
              break;
            }
            return _context3.abrupt("return", false);
          case 2:
            upDocsById = nonPersistedFromMaster.docs;
            nonPersistedFromMaster.docs = {};
            useCheckpoint = nonPersistedFromMaster.checkpoint;
            docIds = Object.keys(upDocsById);
            if (!(docIds.length === 0)) {
              _context3.next = 8;
              break;
            }
            return _context3.abrupt("return", false);
          case 8:
            _context3.next = 10;
            return (0, _metaInstance.getAssumedMasterState)(state, docIds);
          case 10:
            assumedMasterState = _context3.sent;
            writeRowsToMaster = {};
            writeRowsToMasterIds = [];
            writeRowsToMeta = {};
            forkStateById = {};
            _context3.next = 17;
            return Promise.all(docIds.map( /*#__PURE__*/function () {
              var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(docId) {
                var fullDocData, docData, assumedMasterDoc;
                return _regenerator["default"].wrap(function _callee$(_context) {
                  while (1) switch (_context.prev = _context.next) {
                    case 0:
                      fullDocData = upDocsById[docId];
                      forkStateById[docId] = fullDocData;
                      docData = (0, _helper.writeDocToDocState)(fullDocData);
                      assumedMasterDoc = assumedMasterState[docId];
                      /**
                       * If the master state is equal to the
                       * fork state, we can assume that the document state is already
                       * replicated.
                       */
                      _context.t1 = assumedMasterDoc &&
                      // if the isResolvedConflict is correct, we do not have to compare the documents.
                      assumedMasterDoc.metaDocument.isResolvedConflict !== fullDocData._rev;
                      if (!_context.t1) {
                        _context.next = 9;
                        break;
                      }
                      _context.next = 8;
                      return state.input.conflictHandler({
                        realMasterState: assumedMasterDoc.docData,
                        newDocumentState: docData
                      }, 'upstream-check-if-equal');
                    case 8:
                      _context.t1 = _context.sent.isEqual;
                    case 9:
                      _context.t0 = _context.t1;
                      if (_context.t0) {
                        _context.next = 12;
                        break;
                      }
                      _context.t0 =
                      /**
                       * If the master works with _rev fields,
                       * we use that to check if our current doc state
                       * is different from the assumedMasterDoc.
                       */

                      assumedMasterDoc && assumedMasterDoc.docData._rev && (0, _util.parseRevision)(fullDocData._rev).height === fullDocData._meta[state.input.identifier];
                    case 12:
                      if (!_context.t0) {
                        _context.next = 14;
                        break;
                      }
                      return _context.abrupt("return");
                    case 14:
                      writeRowsToMasterIds.push(docId);
                      writeRowsToMaster[docId] = {
                        assumedMasterState: assumedMasterDoc ? assumedMasterDoc.docData : undefined,
                        newDocumentState: docData
                      };
                      writeRowsToMeta[docId] = (0, _metaInstance.getMetaWriteRow)(state, docData, assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined);
                    case 17:
                    case "end":
                      return _context.stop();
                  }
                }, _callee);
              }));
              return function (_x) {
                return _ref2.apply(this, arguments);
              };
            }()));
          case 17:
            if (!(writeRowsToMasterIds.length === 0)) {
              _context3.next = 19;
              break;
            }
            return _context3.abrupt("return", false);
          case 19:
            writeRowsArray = Object.values(writeRowsToMaster);
            conflictIds = new Set();
            conflictsById = {};
            /**
             * To always respect the push.batchSize,
             * we have to split the write rows into batches
             * to ensure that replicationHandler.masterWrite() is never
             * called with more documents than what the batchSize limits.
             */
            writeBatches = (0, _util.batchArray)(writeRowsArray, state.input.pushBatchSize);
            _context3.next = 25;
            return Promise.all(writeBatches.map( /*#__PURE__*/function () {
              var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(writeBatch) {
                var masterWriteResult;
                return _regenerator["default"].wrap(function _callee2$(_context2) {
                  while (1) switch (_context2.prev = _context2.next) {
                    case 0:
                      _context2.next = 2;
                      return replicationHandler.masterWrite(writeBatch);
                    case 2:
                      masterWriteResult = _context2.sent;
                      masterWriteResult.forEach(function (conflictDoc) {
                        var id = conflictDoc[state.primaryPath];
                        conflictIds.add(id);
                        conflictsById[id] = conflictDoc;
                      });
                    case 4:
                    case "end":
                      return _context2.stop();
                  }
                }, _callee2);
              }));
              return function (_x2) {
                return _ref3.apply(this, arguments);
              };
            }()));
          case 25:
            useWriteRowsToMeta = [];
            writeRowsToMasterIds.forEach(function (docId) {
              if (!conflictIds.has(docId)) {
                state.events.processed.up.next(writeRowsToMaster[docId]);
                useWriteRowsToMeta.push(writeRowsToMeta[docId]);
              }
            });
            if (!(useWriteRowsToMeta.length > 0)) {
              _context3.next = 30;
              break;
            }
            _context3.next = 30;
            return state.input.metaInstance.bulkWrite(useWriteRowsToMeta, 'replication-up-write-meta');
          case 30:
            /**
             * Resolve conflicts by writing a new document
             * state to the fork instance and the 'real' master state
             * to the meta instance.
             * Non-409 errors will be detected by resolveConflictError()
             */
            hadConflictWrites = false;
            if (!(conflictIds.size > 0)) {
              _context3.next = 48;
              break;
            }
            state.stats.up.persistToMasterHadConflicts = state.stats.up.persistToMasterHadConflicts + 1;
            conflictWriteFork = [];
            conflictWriteMeta = {};
            _context3.next = 37;
            return Promise.all(Object.entries(conflictsById).map(function (_ref4) {
              var docId = _ref4[0],
                realMasterState = _ref4[1];
              var writeToMasterRow = writeRowsToMaster[docId];
              var input = {
                newDocumentState: writeToMasterRow.newDocumentState,
                assumedMasterState: writeToMasterRow.assumedMasterState,
                realMasterState: realMasterState
              };
              return (0, _conflicts.resolveConflictError)(state, input, forkStateById[docId]).then(function (resolved) {
                if (resolved) {
                  state.events.resolvedConflicts.next({
                    input: input,
                    output: resolved.output
                  });
                  conflictWriteFork.push({
                    previous: forkStateById[docId],
                    document: resolved.resolvedDoc
                  });
                  var assumedMasterDoc = assumedMasterState[docId];
                  conflictWriteMeta[docId] = (0, _metaInstance.getMetaWriteRow)(state, (0, _util.ensureNotFalsy)(realMasterState), assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined, resolved.resolvedDoc._rev);
                }
              });
            }));
          case 37:
            if (!(conflictWriteFork.length > 0)) {
              _context3.next = 48;
              break;
            }
            hadConflictWrites = true;
            state.stats.up.persistToMasterConflictWrites = state.stats.up.persistToMasterConflictWrites + 1;
            _context3.next = 42;
            return state.input.forkInstance.bulkWrite(conflictWriteFork, 'replication-up-write-conflict');
          case 42:
            forkWriteResult = _context3.sent;
            /**
             * Errors in the forkWriteResult must not be handled
             * because they have been caused by a write to the forkInstance
             * in between which will anyway trigger a new upstream cycle
             * that will then resolved the conflict again.
             */
            useMetaWrites = [];
            Object.keys(forkWriteResult.success).forEach(function (docId) {
              useMetaWrites.push(conflictWriteMeta[docId]);
            });
            if (!(useMetaWrites.length > 0)) {
              _context3.next = 48;
              break;
            }
            _context3.next = 48;
            return state.input.metaInstance.bulkWrite(useMetaWrites, 'replication-up-write-conflict-meta');
          case 48:
            /**
             * For better performance we do not await checkpoint writes,
             * but to ensure order on parallel checkpoint writes,
             * we have to use a queue.
             */
            state.checkpointQueue = state.checkpointQueue.then(function () {
              return (0, _checkpoint.setCheckpoint)(state, 'up', useCheckpoint);
            });
            return _context3.abrupt("return", hadConflictWrites);
          case 50:
          case "end":
            return _context3.stop();
        }
      }, _callee3);
    })))["catch"](function (unhandledError) {
      state.events.error.next(unhandledError);
      return false;
    });
    return persistenceQueue;
  }
}
//# sourceMappingURL=upstream.js.map