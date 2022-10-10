import { firstValueFrom, filter } from 'rxjs';
import { stackCheckpoints } from '../rx-storage-helper';
import { createRevision, ensureNotFalsy, flatClone, getDefaultRevision, getDefaultRxDocumentMeta, now, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_VOID } from '../util';
import { getLastCheckpointDoc, setCheckpoint } from './checkpoint';
import { writeDocToDocState } from './helper';
import { getAssumedMasterState, getMetaWriteRow } from './meta-instance';

/**
 * Writes all documents from the master to the fork.
 * The downstream has two operation modes
 * - Sync by iterating over the checkpoints via downstreamResyncOnce()
 * - Sync by listening to the changestream via downstreamProcessChanges()
 * We need this to be able to do initial syncs
 * and still can have fast event based sync when the client is not offline.
 */
function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }
        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }
    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }
    pact.s = state;
    pact.v = value;
    const observer = pact.o;
    if (observer) {
      observer(pact);
    }
  }
}
var _Pact = /*#__PURE__*/function () {
  function _Pact() {}
  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;
    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;
      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }
        return result;
      } else {
        return this;
      }
    }
    this.o = function (_this) {
      try {
        var value = _this.v;
        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };
    return result;
  };
  return _Pact;
}();
function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}
function _for(test, update, body) {
  var stage;
  for (;;) {
    var shouldContinue = test();
    if (_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }
    if (!shouldContinue) {
      return result;
    }
    if (shouldContinue.then) {
      stage = 0;
      break;
    }
    var result = body();
    if (result && result.then) {
      if (_isSettledPact(result)) {
        result = result.s;
      } else {
        stage = 1;
        break;
      }
    }
    if (update) {
      var updateValue = update();
      if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
        stage = 2;
        break;
      }
    }
  }
  var pact = new _Pact();
  var reject = _settle.bind(null, pact, 2);
  (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
  return pact;
  function _resumeAfterBody(value) {
    result = value;
    do {
      if (update) {
        updateValue = update();
        if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
          updateValue.then(_resumeAfterUpdate).then(void 0, reject);
          return;
        }
      }
      shouldContinue = test();
      if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.v) {
        _settle(pact, 1, result);
        return;
      }
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }
      result = body();
      if (_isSettledPact(result)) {
        result = result.v;
      }
    } while (!result || !result.then);
    result.then(_resumeAfterBody).then(void 0, reject);
  }
  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      result = body();
      if (result && result.then) {
        result.then(_resumeAfterBody).then(void 0, reject);
      } else {
        _resumeAfterBody(result);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
  function _resumeAfterUpdate() {
    if (shouldContinue = test()) {
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _resumeAfterTest(shouldContinue);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
}
export function startReplicationDownstream(state) {
  var downstreamResyncOnce = function downstreamResyncOnce() {
    try {
      state.stats.down.downstreamResyncOnce = state.stats.down.downstreamResyncOnce + 1;
      if (state.events.canceled.getValue()) {
        return Promise.resolve();
      }
      state.checkpointQueue = state.checkpointQueue.then(function () {
        return getLastCheckpointDoc(state, 'down');
      });
      return Promise.resolve(state.checkpointQueue).then(function (lastCheckpoint) {
        var _interrupt = false;
        function _temp2() {
          return Promise.all(promises).then(function () {
            if (!state.firstSyncDone.down.getValue()) {
              state.firstSyncDone.down.next(true);
            }
          });
        }
        var promises = [];
        var _temp = _for(function () {
          return !_interrupt && !state.events.canceled.getValue();
        }, void 0, function () {
          lastTimeMasterChangesRequested = timer++;
          return Promise.resolve(replicationHandler.masterChangesSince(lastCheckpoint, state.input.pullBatchSize)).then(function (downResult) {
            if (downResult.documents.length === 0) {
              _interrupt = true;
              return;
            }
            lastCheckpoint = stackCheckpoints([lastCheckpoint, downResult.checkpoint]);
            promises.push(persistFromMaster(downResult.documents, lastCheckpoint));
          });
        });
        return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  var replicationHandler = state.input.replicationHandler;

  // used to detect which tasks etc can in it at which order.
  var timer = 0;
  var openTasks = [];
  function addNewTask(task) {
    state.stats.down.addNewTask = state.stats.down.addNewTask + 1;
    var taskWithTime = {
      time: timer++,
      task: task
    };
    openTasks.push(taskWithTime);
    state.streamQueue.down = state.streamQueue.down.then(function () {
      var useTasks = [];
      while (openTasks.length > 0) {
        state.events.active.down.next(true);
        var _taskWithTime = ensureNotFalsy(openTasks.shift());

        /**
         * If the task came in before the last time we started the pull 
         * from the master, then we can drop the task.
         */
        if (_taskWithTime.time < lastTimeMasterChangesRequested) {
          continue;
        }
        if (_taskWithTime.task === 'RESYNC') {
          if (useTasks.length === 0) {
            useTasks.push(_taskWithTime.task);
            break;
          } else {
            break;
          }
        }
        useTasks.push(_taskWithTime.task);
      }
      if (useTasks.length === 0) {
        state.events.active.down.next(false);
        return;
      }
      if (useTasks[0] === 'RESYNC') {
        return downstreamResyncOnce();
      } else {
        return downstreamProcessChanges(useTasks);
      }
    });
  }
  addNewTask('RESYNC');

  /**
   * If a write on the master happens, we have to trigger the downstream.
   */
  var sub = replicationHandler.masterChangeStream$.subscribe(function (task) {
    state.stats.down.masterChangeStreamEmit = state.stats.down.masterChangeStreamEmit + 1;
    addNewTask(task);
  });
  firstValueFrom(state.events.canceled.pipe(filter(function (canceled) {
    return !!canceled;
  }))).then(function () {
    return sub.unsubscribe();
  });

  /**
   * For faster performance, we directly start each write
   * and then await all writes at the end.
   */
  var lastTimeMasterChangesRequested = -1;
  function downstreamProcessChanges(tasks) {
    state.stats.down.downstreamProcessChanges = state.stats.down.downstreamProcessChanges + 1;
    var docsOfAllTasks = [];
    var lastCheckpoint = null;
    tasks.forEach(function (task) {
      if (task === 'RESYNC') {
        throw new Error('SNH');
      }
      docsOfAllTasks = docsOfAllTasks.concat(task.documents);
      lastCheckpoint = stackCheckpoints([lastCheckpoint, task.checkpoint]);
    });
    return persistFromMaster(docsOfAllTasks, ensureNotFalsy(lastCheckpoint));
  }

  /**
   * It can happen that the calls to masterChangesSince() or the changeStream()
   * are way faster then how fast the documents can be persisted.
   * Therefore we merge all incoming downResults into the nonPersistedFromMaster object
   * and process them together if possible.
   * This often bundles up single writes and improves performance
   * by processing the documents in bulks.
   */
  var persistenceQueue = PROMISE_RESOLVE_VOID;
  var nonPersistedFromMaster = {
    docs: {}
  };
  function persistFromMaster(docs, checkpoint) {
    state.stats.down.persistFromMaster = state.stats.down.persistFromMaster + 1;

    /**
     * Add the new docs to the non-persistend list
     */
    docs.forEach(function (docData) {
      var docId = docData[state.primaryPath];
      nonPersistedFromMaster.docs[docId] = docData;
    });
    nonPersistedFromMaster.checkpoint = checkpoint;

    /**
     * Run in the queue
     * with all open documents from nonPersistedFromMaster.
     */
    persistenceQueue = persistenceQueue.then(function () {
      var downDocsById = nonPersistedFromMaster.docs;
      nonPersistedFromMaster.docs = {};
      var useCheckpoint = nonPersistedFromMaster.checkpoint;
      var docIds = Object.keys(downDocsById);
      if (state.events.canceled.getValue() || docIds.length === 0) {
        return PROMISE_RESOLVE_VOID;
      }
      var writeRowsToFork = [];
      var writeRowsToForkById = {};
      var writeRowsToMeta = {};
      var useMetaWriteRows = [];
      return Promise.all([state.input.forkInstance.findDocumentsById(docIds, true), getAssumedMasterState(state, docIds)]).then(function (_ref) {
        var currentForkState = _ref[0],
          assumedMasterState = _ref[1];
        return Promise.all(docIds.map(function (docId) {
          try {
            var forkStateFullDoc = currentForkState[docId];
            var forkStateDocData = forkStateFullDoc ? writeDocToDocState(forkStateFullDoc) : undefined;
            var masterState = downDocsById[docId];
            var assumedMaster = assumedMasterState[docId];
            if (assumedMaster && assumedMaster.metaDocument.isResolvedConflict === forkStateFullDoc._rev) {
              /**
               * The current fork state represents a resolved conflict
               * that first must be send to the master in the upstream.
               * All conflicts are resolved by the upstream.
               */
              return Promise.resolve(PROMISE_RESOLVE_VOID);
            }
            var isAssumedMasterEqualToForkStatePromise = !assumedMaster || !forkStateDocData ? PROMISE_RESOLVE_FALSE : state.input.conflictHandler({
              realMasterState: assumedMaster.docData,
              newDocumentState: forkStateDocData
            }, 'downstream-check-if-equal-0').then(function (r) {
              return r.isEqual;
            });
            return Promise.resolve(isAssumedMasterEqualToForkStatePromise).then(function (isAssumedMasterEqualToForkState) {
              if (forkStateFullDoc && assumedMaster && isAssumedMasterEqualToForkState === false || forkStateFullDoc && !assumedMaster) {
                /**
                 * We have a non-upstream-replicated
                 * local write to the fork.
                 * This means we ignore the downstream of this document
                 * because anyway the upstream will first resolve the conflict.
                 */
                return PROMISE_RESOLVE_VOID;
              }
              var areStatesExactlyEqualPromise = !forkStateDocData ? PROMISE_RESOLVE_FALSE : state.input.conflictHandler({
                realMasterState: masterState,
                newDocumentState: forkStateDocData
              }, 'downstream-check-if-equal-1').then(function (r) {
                return r.isEqual;
              });
              return Promise.resolve(areStatesExactlyEqualPromise).then(function (areStatesExactlyEqual) {
                if (forkStateDocData && areStatesExactlyEqual) {
                  /**
                   * Document states are exactly equal.
                   * This can happen when the replication is shut down
                   * unexpected like when the user goes offline.
                   * 
                   * Only when the assumedMaster is different from the forkState,
                   * we have to patch the document in the meta instance.
                   */
                  if (!assumedMaster || isAssumedMasterEqualToForkState === false) {
                    useMetaWriteRows.push(getMetaWriteRow(state, forkStateDocData, assumedMaster ? assumedMaster.metaDocument : undefined));
                  }
                  return PROMISE_RESOLVE_VOID;
                }

                /**
                 * All other master states need to be written to the forkInstance
                 * and metaInstance.
                 */
                var newForkState = Object.assign({}, masterState, forkStateFullDoc ? {
                  _meta: flatClone(forkStateFullDoc._meta),
                  _attachments: {},
                  _rev: getDefaultRevision()
                } : {
                  _meta: getDefaultRxDocumentMeta(),
                  _rev: getDefaultRevision(),
                  _attachments: {}
                });
                newForkState._meta.lwt = now();
                newForkState._rev = masterState._rev ? masterState._rev : createRevision(state.input.hashFunction, newForkState, forkStateFullDoc);
                var forkWriteRow = {
                  previous: forkStateFullDoc,
                  document: newForkState
                };
                writeRowsToFork.push(forkWriteRow);
                writeRowsToForkById[docId] = forkWriteRow;
                writeRowsToMeta[docId] = getMetaWriteRow(state, masterState, assumedMaster ? assumedMaster.metaDocument : undefined);
              });
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }));
      }).then(function () {
        if (writeRowsToFork.length > 0) {
          return state.input.forkInstance.bulkWrite(writeRowsToFork, state.downstreamBulkWriteFlag).then(function (forkWriteResult) {
            Object.keys(forkWriteResult.success).forEach(function (docId) {
              state.events.processed.down.next(writeRowsToForkById[docId]);
              useMetaWriteRows.push(writeRowsToMeta[docId]);
            });
          });
        }
      }).then(function () {
        if (useMetaWriteRows.length > 0) {
          return state.input.metaInstance.bulkWrite(useMetaWriteRows, 'replication-down-write-meta');
        }
      }).then(function () {
        /**
         * For better performance we do not await checkpoint writes,
         * but to ensure order on parrallel checkpoint writes,
         * we have to use a queue.
         */
        state.checkpointQueue = state.checkpointQueue.then(function () {
          return setCheckpoint(state, 'down', useCheckpoint);
        });
      });
    })["catch"](function (unhandledError) {
      return state.events.error.next(unhandledError);
    });
    return persistenceQueue;
  }
}
//# sourceMappingURL=downstream.js.map