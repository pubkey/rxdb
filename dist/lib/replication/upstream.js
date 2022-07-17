"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startReplicationUpstream = startReplicationUpstream;

var _rxjs = require("rxjs");

var _rxStorageHelper = require("../rx-storage-helper");

var _util = require("../util");

var _checkpoint = require("./checkpoint");

var _conflicts = require("./conflicts");

var _helper = require("./helper");

var _metaInstance = require("./meta-instance");

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
    var observer = pact.o;

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

/**
 * Writes all document changes from the fork to the master.
 * The upstream runs on two modes:
 * - For inital replication, a checkpoint-iteration is used
 * - For ongoing local writes, we just subscribe to the changeStream of the fork.
 *   In contrast to the master, the fork can be assumed to never loose connection,
 *   so we do not have to prepare for missed out events.
 */
function startReplicationUpstream(state) {
  /**
   * Returns true if had conflicts,
   * false if not.
   */
  var persistToMaster = function persistToMaster(docs, checkpoint) {
    try {
      state.stats.up.persistToMaster = state.stats.up.persistToMaster + 1;
      /**
       * Add the new docs to the non-persistend list
       */

      docs.forEach(function (docData) {
        var docId = docData[state.primaryPath];
        nonPersistedFromMaster.docs[docId] = docData;
      });
      nonPersistedFromMaster.checkpoint = checkpoint;
      persistenceQueue = persistenceQueue.then(function () {
        try {
          if (state.events.canceled.getValue()) {
            return Promise.resolve(false);
          }

          var upDocsById = nonPersistedFromMaster.docs;
          nonPersistedFromMaster.docs = {};
          var useCheckpoint = nonPersistedFromMaster.checkpoint;
          var docIds = Object.keys(upDocsById);

          if (docIds.length === 0) {
            return Promise.resolve(false);
          }

          return Promise.resolve((0, _metaInstance.getAssumedMasterState)(state, docIds)).then(function (assumedMasterState) {
            var writeRowsToMaster = {};
            var writeRowsToMasterIds = [];
            var writeRowsToMeta = {};
            var forkStateById = {};
            return Promise.resolve(Promise.all(docIds.map(function (docId) {
              try {
                var _temp20 = function _temp20(_state$input$conflict) {
                  if (_temp21 && _state$input$conflict.isEqual) {
                    _exit2 = true;
                    return;
                  }

                  writeRowsToMasterIds.push(docId);
                  writeRowsToMaster[docId] = {
                    assumedMasterState: assumedMasterDoc ? assumedMasterDoc.docData : undefined,
                    newDocumentState: docData
                  };
                  writeRowsToMeta[docId] = (0, _metaInstance.getMetaWriteRow)(state, docData, assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined);
                };

                var _exit2 = false;
                var fullDocData = upDocsById[docId];
                forkStateById[docId] = fullDocData;
                var docData = (0, _helper.writeDocToDocState)(fullDocData);
                var assumedMasterDoc = assumedMasterState[docId];
                /**
                 * If the master state is equal to the
                 * fork state, we can assume that the document state is already
                 * replicated.
                 */

                var _temp21 = assumedMasterDoc && // if the isResolvedConflict is correct, we do not have to compare the documents.
                assumedMasterDoc.metaDocument.isResolvedConflict !== fullDocData._rev;

                return Promise.resolve(_temp21 ? Promise.resolve(state.input.conflictHandler({
                  realMasterState: assumedMasterDoc.docData,
                  newDocumentState: docData
                }, 'upstream-check-if-equal')).then(_temp20) : _temp20(_temp21));
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {
              return writeRowsToMasterIds.length === 0 ? false : Promise.resolve(replicationHandler.masterWrite(Object.values(writeRowsToMaster))).then(function (masterWriteResult) {
                function _temp17() {
                  function _temp15() {
                    /**
                     * For better performance we do not await checkpoint writes,
                     * but to ensure order on parrallel checkpoint writes,
                     * we have to use a queue.
                     */
                    checkpointQueue = checkpointQueue.then(function () {
                      return (0, _checkpoint.setCheckpoint)(state, 'up', useCheckpoint);
                    });
                    return hadConflictWrites;
                  }

                  /**
                   * Resolve conflicts by writing a new document
                   * state to the fork instance and the 'real' master state
                   * to the meta instance.
                   * Non-409 errors will be detected by resolveConflictError()
                   */
                  var hadConflictWrites = false;

                  var _temp14 = function () {
                    if (conflictIds.size > 0) {
                      state.stats.up.persistToMasterHadConflicts = state.stats.up.persistToMasterHadConflicts + 1;
                      var conflictWriteFork = [];
                      var conflictWriteMeta = {};
                      return Promise.resolve(Promise.all(Object.entries(conflictsById).map(function (_ref) {
                        try {
                          var docId = _ref[0],
                              realMasterState = _ref[1];
                          var writeToMasterRow = writeRowsToMaster[docId];
                          var input = {
                            newDocumentState: writeToMasterRow.newDocumentState,
                            assumedMasterState: writeToMasterRow.assumedMasterState,
                            realMasterState: realMasterState
                          };
                          return Promise.resolve((0, _conflicts.resolveConflictError)(state.input.conflictHandler, input, forkStateById[docId])).then(function (resolved) {
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
                        } catch (e) {
                          return Promise.reject(e);
                        }
                      }))).then(function () {
                        var _temp13 = function () {
                          if (conflictWriteFork.length > 0) {
                            hadConflictWrites = true;
                            state.stats.up.persistToMasterConflictWrites = state.stats.up.persistToMasterConflictWrites + 1;
                            return Promise.resolve(state.input.forkInstance.bulkWrite(conflictWriteFork, 'replication-up-write-conflict')).then(function (forkWriteResult) {
                              /**
                               * Errors in the forkWriteResult must not be handled
                               * because they have been caused by a write to the forkInstance
                               * in between which will anyway trigger a new upstream cycle
                               * that will then resolved the conflict again.
                               */
                              var useMetaWrites = [];
                              Object.keys(forkWriteResult.success).forEach(function (docId) {
                                useMetaWrites.push(conflictWriteMeta[docId]);
                              });

                              var _temp12 = function () {
                                if (useMetaWrites.length > 0) {
                                  return Promise.resolve(state.input.metaInstance.bulkWrite(useMetaWrites, 'replication-up-write-conflict-meta')).then(function () {});
                                }
                              }();

                              if (_temp12 && _temp12.then) return _temp12.then(function () {});
                            }); // TODO what to do with conflicts while writing to the metaInstance?
                          }
                        }();

                        if (_temp13 && _temp13.then) return _temp13.then(function () {});
                      });
                    }
                  }();

                  return _temp14 && _temp14.then ? _temp14.then(_temp15) : _temp15(_temp14);
                }

                var conflictIds = new Set();
                var conflictsById = {};
                masterWriteResult.forEach(function (conflictDoc) {
                  var id = conflictDoc[state.primaryPath];
                  conflictIds.add(id);
                  conflictsById[id] = conflictDoc;
                });
                var useWriteRowsToMeta = [];
                writeRowsToMasterIds.forEach(function (docId) {
                  if (!conflictIds.has(docId)) {
                    state.events.processed.up.next(writeRowsToMaster[docId]);
                    useWriteRowsToMeta.push(writeRowsToMeta[docId]);
                  }
                });

                var _temp16 = function () {
                  if (useWriteRowsToMeta.length > 0) {
                    return Promise.resolve(state.input.metaInstance.bulkWrite(useWriteRowsToMeta, 'replication-up-write-meta')).then(function () {}); // TODO what happens when we have conflicts here?
                  }
                }();

                return _temp16 && _temp16.then ? _temp16.then(_temp17) : _temp17(_temp16);
              });
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      });
      return Promise.resolve(persistenceQueue);
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var upstreamInitialSync = function upstreamInitialSync() {
    try {
      state.stats.up.upstreamInitialSync = state.stats.up.upstreamInitialSync + 1;

      if (state.events.canceled.getValue()) {
        return Promise.resolve();
      }

      checkpointQueue = checkpointQueue.then(function () {
        return (0, _checkpoint.getLastCheckpointDoc)(state, 'up');
      });
      return Promise.resolve(checkpointQueue).then(function (lastCheckpoint) {
        var _interrupt = false;

        function _temp11() {
          /**
           * If we had conflicts during the inital sync,
           * it means that we likely have new writes to the fork
           * and so we have to run the initial sync again to upastream these new writes.
           */
          return Promise.resolve(Promise.all(promises)).then(function (_Promise$all) {
            var hadConflicts = _Promise$all.find(function (r) {
              return !!r;
            });

            var _temp9 = function () {
              if (hadConflicts) {
                return Promise.resolve(upstreamInitialSync()).then(function () {});
              } else if (!state.firstSyncDone.up.getValue()) {
                state.firstSyncDone.up.next(true);
              }
            }();

            if (_temp9 && _temp9.then) return _temp9.then(function () {});
          });
        }

        var promises = [];

        var _temp10 = _for(function () {
          return !_interrupt && !state.events.canceled.getValue();
        }, void 0, function () {
          initialSyncStartTime = timer++;
          return Promise.resolve(state.input.forkInstance.getChangedDocumentsSince(state.input.bulkSize, lastCheckpoint)).then(function (upResult) {
            if (upResult.documents.length === 0) {
              _interrupt = true;
              return;
            }

            lastCheckpoint = (0, _rxStorageHelper.stackCheckpoints)([lastCheckpoint, upResult.checkpoint]);
            promises.push(persistToMaster(upResult.documents, (0, _util.ensureNotFalsy)(lastCheckpoint)));
          });
        });

        return _temp10 && _temp10.then ? _temp10.then(_temp11) : _temp11(_temp10);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  /**
   * Takes all open tasks an processes them at once.
   */


  var replicationHandler = state.input.replicationHandler;
  state.streamQueue.up = state.streamQueue.up.then(function () {
    return Promise.resolve(upstreamInitialSync()).then(function () {
      processTasks();
    });
  }); // used to detect which tasks etc can in it at which order.

  var timer = 0;
  var initialSyncStartTime = -1;
  var openTasks = [];
  var sub = state.input.forkInstance.changeStream().pipe((0, _rxjs.filter)(function (eventBulk) {
    return eventBulk.context !== state.downstreamBulkWriteFlag;
  })).subscribe(function (eventBulk) {
    try {
      var _temp3 = function _temp3() {
        processTasks();
      };

      state.stats.up.forkChangeStreamEmit = state.stats.up.forkChangeStreamEmit + 1;
      openTasks.push({
        task: eventBulk,
        time: timer++
      });

      var _temp4 = function () {
        if (state.input.waitBeforePersist) {
          return Promise.resolve(state.input.waitBeforePersist()).then(function () {});
        }
      }();

      return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
    } catch (e) {
      return Promise.reject(e);
    }
  });
  (0, _rxjs.firstValueFrom)(state.events.canceled.pipe((0, _rxjs.filter)(function (canceled) {
    return !!canceled;
  }))).then(function () {
    return sub.unsubscribe();
  });

  function processTasks() {
    if (state.events.canceled.getValue() || openTasks.length === 0) {
      state.events.active.up.next(false);
      return;
    }

    state.stats.up.processTasks = state.stats.up.processTasks + 1;
    state.events.active.up.next(true);
    state.streamQueue.up = state.streamQueue.up.then(function () {
      try {
        var _temp7 = function _temp7() {
          if (openTasks.length === 0) {
            state.events.active.up.next(false);
          } else {
            processTasks();
          }
        };

        /**
         * Merge/filter all open tasks
         */
        var docs = [];
        var checkpoint = {};

        while (openTasks.length > 0) {
          var taskWithTime = (0, _util.ensureNotFalsy)(openTasks.shift());
          /**
           * If the task came in before the last time the inital sync fetching
           * has run, we can ignore the task because the inital sync already processed
           * these documents.
           */

          if (taskWithTime.time < initialSyncStartTime) {
            continue;
          }

          docs = docs.concat(taskWithTime.task.events.map(function (r) {
            if (r.change.doc) {
              return r.change.doc;
            } else {
              return r.change.previous;
            }
          }));
          checkpoint = (0, _rxStorageHelper.stackCheckpoints)([checkpoint, taskWithTime.task.checkpoint]);
        }

        var _temp8 = function () {
          if (docs.length > 0) {
            return Promise.resolve(persistToMaster(docs, checkpoint)).then(function () {});
          }
        }();

        return Promise.resolve(_temp8 && _temp8.then ? _temp8.then(_temp7) : _temp7(_temp8));
      } catch (e) {
        return Promise.reject(e);
      }
    });
  }

  var persistenceQueue = _util.PROMISE_RESOLVE_FALSE;
  var checkpointQueue = _util.PROMISE_RESOLVE_VOID;
  var nonPersistedFromMaster = {
    docs: {}
  };
}
//# sourceMappingURL=upstream.js.map