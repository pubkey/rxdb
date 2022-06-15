/**
 * Replicates two RxStorageInstances
 * with each other.
 * 
 * Compared to the 'normal' replication plugins,
 * this one is made for internal use where:
 * - No permission handling is needed.
 * - It is made so that the write amount on the master is less but might increase on the child.
 * - It does not have to be easy to implement a compatible backend.
 *   Here we use another RxStorageImplementation as replication goal
 *   so it has to exactly behave like the RxStorage interface defines.
 * 
 * This is made to be used internally by plugins
 * to get a really fast replication performance.
 * 
 * The replication works like git, where the fork contains all new writes
 * and must be merged with the master before it can push it's new state to the master.
 */
import { BehaviorSubject, combineLatest, filter, firstValueFrom } from 'rxjs';
import { getPrimaryKeyOfInternalDocument } from './rx-database-internal-store';
import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import { flatCloneDocWithMeta } from './rx-storage-helper';
import { createRevision, ensureNotFalsy, fastUnsecureHash, flatClone, lastOfArray, now, parseRevision, PROMISE_RESOLVE_VOID } from './util';
/**
 * Flags which document state is assumed
 * to be the current state at the master RxStorage instance.
 * Used in the ._meta of the document data that is stored at the client
 * and contains the full document.
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

export var awaitRxStorageReplicationIdle = function awaitRxStorageReplicationIdle(state) {
  return Promise.resolve(awaitRxStorageReplicationFirstInSync(state)).then(function () {
    var _exit = false;
    return _for(function () {
      return !_exit;
    }, void 0, function () {
      var _state$streamQueue = state.streamQueue,
          down = _state$streamQueue.down,
          up = _state$streamQueue.up;
      return Promise.resolve(Promise.all([up, down])).then(function () {
        if (down === state.streamQueue.down && up === state.streamQueue.up) {
          _exit = true;
        }
      });
      /**
       * If the Promises have not been reasigned
       * after awaiting them, we know that the replication
       * is in idle state at this point in time.
       */
    });
  });
};
export var awaitRxStorageReplicationFirstInSync = function awaitRxStorageReplicationFirstInSync(state) {
  try {
    return Promise.resolve(firstValueFrom(combineLatest([state.firstSyncDone.down.pipe(filter(function (v) {
      return !!v;
    })), state.firstSyncDone.up.pipe(filter(function (v) {
      return !!v;
    }))])));
  } catch (e) {
    return Promise.reject(e);
  }
};
export var setCheckpoint = function setCheckpoint(state, direction, checkpointDoc) {
  try {
    var checkpoint = state.lastCheckpoint[direction];

    var _temp16 = function () {
      if (checkpoint && state.input.checkPointInstance &&
      /**
       * If the replication is already canceled,
       * we do not write a checkpoint
       * because that could mean we write a checkpoint
       * for data that has been fetched from the master
       * but not been written to the child.
       */
      !state.canceled.getValue() && (
      /**
       * Only write checkpoint if it is different from before
       * to have less writes to the storage.
       */
      !checkpointDoc || JSON.stringify(checkpointDoc.data) !== JSON.stringify(checkpoint))) {
        var checkpointKeyWithDirection = state.checkpointKey + '-' + direction;
        var newDoc = {
          key: checkpointKeyWithDirection,
          id: getPrimaryKeyOfInternalDocument(checkpointKeyWithDirection, 'OTHER'),
          context: 'OTHER',
          _deleted: false,
          _attachments: {},
          data: checkpoint,
          _meta: {
            lwt: now()
          },
          _rev: ''
        };
        newDoc._rev = createRevision(newDoc, checkpointDoc);
        return Promise.resolve(state.input.checkPointInstance.bulkWrite([{
          previous: checkpointDoc,
          document: newDoc
        }])).then(function () {});
      }
    }();

    return Promise.resolve(_temp16 && _temp16.then ? _temp16.then(function () {}) : void 0);
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Resolves a conflict error.
 * Returns the resolved document.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the downstream, never in the upstream.
 */
export var resolveConflictError = function resolveConflictError(conflictHandler, error) {
  try {
    if (error.status !== 409) {
      /**
       * If this ever happens,
       * make a PR with a unit test to reproduce it.
       */
      throw new Error('Non conflict error');
    }

    var documentInDb = ensureNotFalsy(error.documentInDb);

    if (documentInDb._rev === error.writeRow.document._rev) {
      /**
       * Documents are equal,
       * so this is not a conflict -> do nothing.
       */
      return Promise.resolve(undefined);
    } else {
      /**
       * We have a conflict, resolve it!
       */
      return Promise.resolve(conflictHandler({
        documentStateAtForkTime: error.writeRow.previous,
        newDocumentStateInMaster: error.writeRow.document,
        currentForkDocumentState: documentInDb
      })).then(function (resolved) {
        var resolvedDoc = flatCloneDocWithMeta(resolved.resolvedDocumentState);
        resolvedDoc._meta.lwt = now();
        resolvedDoc._rev = createRevision(resolvedDoc, documentInDb);
        return resolvedDoc;
      });
    }
  } catch (e) {
    return Promise.reject(e);
  }
};
export var getLastCheckpointDoc = function getLastCheckpointDoc(state, direction) {
  try {
    if (!state.input.checkPointInstance) {
      return Promise.resolve({
        checkpoint: state.lastCheckpoint[direction]
      });
    }

    var checkpointDocId = getPrimaryKeyOfInternalDocument(state.checkpointKey + '-' + direction, 'OTHER');
    return Promise.resolve(state.input.checkPointInstance.findDocumentsById([checkpointDocId], false)).then(function (checkpointResult) {
      var checkpointDoc = checkpointResult[checkpointDocId];

      if (checkpointDoc) {
        return {
          checkpoint: checkpointDoc.data,
          checkpointDoc: checkpointDoc
        };
      } else {
        return undefined;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var MASTER_CURRENT_STATE_FLAG_SUFFIX = '-master';
/**
 * Flags that a document write happened to
 * update the 'current master' meta field, after
 * the document has been pushed by the upstream.
 * Contains the revision.
 * Document states where this flag is equal to the current
 * revision, must not be upstreamed again.
 */

var UPSTREAM_MARKING_WRITE_FLAG_SUFFIX = '-after-up';
/**
 * Flags that a document state was written to the master
 * by the upstream from the fork.
 * Used in the ._meta of the document data that is stored at the master
 * and contains only the revision.
 * We need this to detect if the document state was written from the upstream
 * so that it is not again replicated to the downstream.
 * TODO instead of doing that, we should have a way to 'mark' bulkWrite()
 * calls so that the emitted events can be detected as being from the upstream.
 */

var FROM_FORK_FLAG_SUFFIX = '-fork';
export function replicateRxStorageInstance(input) {
  var state = {
    primaryPath: getPrimaryFieldOfPrimaryKey(input.masterInstance.schema.primaryKey),
    input: input,
    checkpointKey: getCheckpointKey(input),
    canceled: new BehaviorSubject(false),
    firstSyncDone: {
      down: new BehaviorSubject(false),
      up: new BehaviorSubject(false)
    },
    lastCheckpoint: {},
    streamQueue: {
      down: PROMISE_RESOLVE_VOID,
      up: PROMISE_RESOLVE_VOID
    }
  };
  startReplicationDownstream(state);
  startReplicationUpstream(state);
  return state;
}
/**
 * Writes all documents from the master to the fork.
 */

export function startReplicationDownstream(state) {
  var downstreamSyncOnce = function downstreamSyncOnce() {
    try {
      if (state.canceled.getValue()) {
        return Promise.resolve();
      }

      return Promise.resolve(getLastCheckpointDoc(state, 'down')).then(function (checkpointState) {
        function _temp2() {
          return Promise.resolve(writeToChildQueue).then(function () {
            if (!state.firstSyncDone.down.getValue()) {
              state.firstSyncDone.down.next(true);
            }
            /**
             * Write the new checkpoint
             */


            return Promise.resolve(setCheckpoint(state, 'down', lastCheckpointDoc)).then(function () {});
          });
        }

        var lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;
        var done = false;

        var _temp = _for(function () {
          return !done && !state.canceled.getValue();
        }, void 0, function () {
          return Promise.resolve(state.input.masterInstance.getChangedDocumentsSince(state.input.bulkSize, state.lastCheckpoint.down)).then(function (downResult) {
            if (downResult.length === 0) {
              done = true;
              return;
            }

            state.lastCheckpoint.down = lastOfArray(downResult).checkpoint;
            writeToChildQueue = writeToChildQueue.then(function () {
              try {
                var writeRowsLeft = downResult.filter(function (r) {
                  return !isDocumentStateFromUpstream(state, r.document);
                }).map(function (r) {
                  var useDoc = flatCloneDocWithMeta(r.document);
                  useDoc._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX] = r.document;
                  delete useDoc._meta[state.checkpointKey + FROM_FORK_FLAG_SUFFIX];
                  return {
                    document: useDoc
                  };
                });

                var _temp4 = _for(function () {
                  return writeRowsLeft.length > 0 && !state.canceled.getValue();
                }, void 0, function () {
                  return Promise.resolve(state.input.forkInstance.bulkWrite(writeRowsLeft)).then(function (writeResult) {
                    writeRowsLeft = [];
                    return Promise.resolve(Promise.all(Object.values(writeResult.error).map(function (error) {
                      try {
                        /**
                         * The PouchDB RxStorage sometimes emits too old
                         * document states when calling getChangedDocumentsSince()
                         * Therefore we filter out conflicts where the new master state
                         * is older then the master state at fork time.
                         * 
                         * On other RxStorage implementations this should never be the case
                         * because getChangedDocumentsSince() must always return the current newest
                         * document state, not the state at the write time of the event.
                         */
                        var docInDb = ensureNotFalsy(error.documentInDb);
                        var docAtForkTime = docInDb._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX];

                        if (docAtForkTime) {
                          var newRevHeigth = parseRevision(error.writeRow.document._rev).height;
                          var docInMasterRevHeight = parseRevision(docAtForkTime._rev).height;

                          if (newRevHeigth <= docInMasterRevHeight) {
                            return Promise.resolve();
                          }
                        }

                        return Promise.resolve(resolveConflictError(state.input.conflictHandler, error)).then(function (resolved) {
                          if (resolved) {
                            /**
                             * Keep the meta data of the original
                             * document from the master.
                             */
                            var resolvedDoc = flatClone(resolved);
                            resolvedDoc._meta = flatClone(error.writeRow.document._meta);
                            resolvedDoc._meta.lwt = now();
                            writeRowsLeft.push({
                              previous: ensureNotFalsy(error.documentInDb),
                              document: resolvedDoc
                            });
                          }
                        });
                      } catch (e) {
                        return Promise.reject(e);
                      }
                    }))).then(function () {});
                  });
                });

                return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(function () {}) : void 0);
              } catch (e) {
                return Promise.reject(e);
              }
            });
          });
        });

        return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var inQueueCount = 0;
  state.streamQueue.down = state.streamQueue.down.then(function () {
    return downstreamSyncOnce();
  });

  function addRunAgain() {
    if (inQueueCount > 2) {
      return;
    }

    inQueueCount = inQueueCount + 1;
    state.streamQueue.down = state.streamQueue.down.then(function () {
      return downstreamSyncOnce();
    })["catch"](function () {}).then(function () {
      return inQueueCount = inQueueCount - 1;
    });
  }
  /**
   * If a write on the master happens, we have to trigger the downstream.
   */


  var sub = state.input.masterInstance.changeStream().subscribe(function (eventBulk) {
    try {
      addRunAgain(); // TODO move down again

      return Promise.resolve();
      /**
       * Do not trigger on changes that came from the upstream
       */

      var hasNotFromUpstream = eventBulk.events.find(function (event) {
        var checkDoc = event.change.doc ? event.change.doc : event.change.previous;
        return !isDocumentStateFromUpstream(state, checkDoc);
      });

      if (hasNotFromUpstream) {}

      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  });
  firstValueFrom(state.canceled.pipe(filter(function (canceled) {
    return !!canceled;
  }))).then(function () {
    return sub.unsubscribe();
  });
  /**
   * For faster performance, we directly start each write
   * and then await all writes at the end.
   */

  var writeToChildQueue = PROMISE_RESOLVE_VOID;
}
/**
 * Writes all document changes from the client to the master.
 */

export function startReplicationUpstream(state) {
  var upstreamSyncOnce = function upstreamSyncOnce() {
    try {
      if (state.canceled.getValue()) {
        return Promise.resolve();
      }

      return Promise.resolve(getLastCheckpointDoc(state, 'up')).then(function (checkpointState) {
        function _temp12() {
          return Promise.resolve(writeToMasterQueue).then(function () {
            return Promise.resolve(setCheckpoint(state, 'up', lastCheckpointDoc)).then(function () {
              if (hadConflicts) {
                /**
                 * If we had a conflict,
                 * we have to first wait until the downstream
                 * is idle so we know that it had resolved all conflicts.
                 * Then we can run the upstream again.
                 */
                state.streamQueue.up = state.streamQueue.up.then(function () {
                  return state.streamQueue.down;
                }).then(function () {
                  addRunAgain();
                });
              } else if (!state.firstSyncDone.up.getValue()) {
                state.firstSyncDone.up.next(true);
              }
            });
          });
        }

        var lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;
        var hadConflicts = false;
        var done = false;

        var _temp11 = _for(function () {
          return !done && !state.canceled.getValue();
        }, void 0, function () {
          return Promise.resolve(state.input.forkInstance.getChangedDocumentsSince(state.input.bulkSize, state.lastCheckpoint.up)).then(function (upResult) {
            if (upResult.length === 0 || state.canceled.getValue()) {
              done = true;
              return;
            }

            state.lastCheckpoint.up = lastOfArray(upResult).checkpoint;
            writeToMasterQueue = writeToMasterQueue.then(function () {
              try {
                if (state.canceled.getValue()) {
                  return Promise.resolve();
                }

                var writeRowsToChild = {};
                var writeRowsToMaster = [];
                upResult.forEach(function (r) {
                  if (isDocumentStateFromDownstream(state, r.document)) {
                    return;
                  }

                  if (isDocumentStateFromUpstream(state, r.document)) {
                    return;
                  }

                  var docId = r.document[state.primaryPath];
                  var useDoc = flatCloneDocWithMeta(r.document);
                  delete useDoc._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX];
                  useDoc._meta[state.checkpointKey + FROM_FORK_FLAG_SUFFIX] = useDoc._rev;
                  var previous = r.document._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX];
                  var toChildNewData = flatCloneDocWithMeta(r.document);
                  toChildNewData._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX] = useDoc;
                  toChildNewData._meta.lwt = now();
                  toChildNewData._rev = createRevision(toChildNewData, r.document);
                  toChildNewData._meta[state.checkpointKey + UPSTREAM_MARKING_WRITE_FLAG_SUFFIX] = toChildNewData._rev;
                  writeRowsToChild[docId] = {
                    previous: r.document,
                    document: toChildNewData
                  };
                  writeRowsToMaster.push({
                    previous: previous,
                    document: useDoc
                  });
                });

                if (writeRowsToMaster.length === 0) {
                  hadConflicts = false;
                  return Promise.resolve();
                }

                return Promise.resolve(state.input.masterInstance.bulkWrite(writeRowsToMaster)).then(function (masterWriteResult) {
                  function _temp14() {
                    // TODO check if has non-409 errors and then throw
                    hadConflicts = Object.keys(masterWriteResult.error).length > 0 || !!childWriteResult && Object.keys(childWriteResult.error).length > 0;
                  }

                  var masterWriteErrors = new Set(Object.keys(masterWriteResult.error));
                  /**
                   * TODO here we have the most critical point in the replicaiton.
                   * If the child RxStorage is closed or the process exits between
                   * the write to master and the write to the child,
                   * we can land in a state where the child does not remember
                   * that a document was already pushed to the master
                   * and will try to do that again which will lead to a replication conflict
                   * even if there should be none.
                   */

                  var useWriteRowsToChild = [];
                  Object.entries(writeRowsToChild).forEach(function (_ref) {
                    var docId = _ref[0],
                        writeRow = _ref[1];

                    if (!masterWriteErrors.has(docId)) {
                      useWriteRowsToChild.push(writeRow);
                    }
                  });
                  var childWriteResult;

                  var _temp13 = function () {
                    if (useWriteRowsToChild.length > 0) {
                      return Promise.resolve(state.input.forkInstance.bulkWrite(useWriteRowsToChild)).then(function (_state$input$forkInst) {
                        childWriteResult = _state$input$forkInst;
                      });
                    }
                  }();

                  return _temp13 && _temp13.then ? _temp13.then(_temp14) : _temp14(_temp13);
                });
              } catch (e) {
                return Promise.reject(e);
              }
            });
          });
        });

        return _temp11 && _temp11.then ? _temp11.then(_temp12) : _temp12(_temp11);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var writeToMasterQueue = PROMISE_RESOLVE_VOID;
  var inQueueCount = 0;
  state.streamQueue.up = state.streamQueue.up.then(function () {
    return upstreamSyncOnce();
  });

  function addRunAgain() {
    if (inQueueCount > 2) {
      return state.streamQueue.up;
    }

    inQueueCount = inQueueCount + 1;
    state.streamQueue.up = state.streamQueue.up.then(function () {
      return upstreamSyncOnce();
    })["catch"](function () {}).then(function () {
      return inQueueCount = inQueueCount - 1;
    });
    return state.streamQueue.up;
  }

  var sub = state.input.forkInstance.changeStream().subscribe(function (eventBulk) {
    try {
      /**
       * Do not trigger on changes that came from the downstream
       */
      var hasNotFromDownstream = eventBulk.events.find(function (event) {
        var checkDoc = event.change.doc ? event.change.doc : event.change.previous;
        return !isDocumentStateFromDownstream(state, checkDoc);
      });

      var _temp8 = function () {
        if (hasNotFromDownstream) {
          var _temp9 = function _temp9() {
            addRunAgain();
          };

          var _temp10 = function () {
            if (state.input.waitBeforePersist) {
              return Promise.resolve(state.input.waitBeforePersist()).then(function () {});
            }
          }();

          return _temp10 && _temp10.then ? _temp10.then(_temp9) : _temp9(_temp10);
        }
      }();

      return Promise.resolve(_temp8 && _temp8.then ? _temp8.then(function () {}) : void 0);
    } catch (e) {
      return Promise.reject(e);
    }
  });
  firstValueFrom(state.canceled.pipe(filter(function (canceled) {
    return !!canceled;
  }))).then(function () {
    return sub.unsubscribe();
  });
}
export function getCheckpointKey(input) {
  var hash = fastUnsecureHash([input.identifier, input.masterInstance.storage.name, input.masterInstance.databaseName, input.masterInstance.collectionName, input.forkInstance.storage.name, input.forkInstance.databaseName, input.forkInstance.collectionName].join('||'));
  return 'rx-storage-replication-' + hash;
}
export function isDocumentStateFromDownstream(state, docData) {
  var latestMasterDocState = docData._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX];

  if (latestMasterDocState && latestMasterDocState._rev === docData._rev) {
    return true;
  } else {
    return false;
  }
}
export function isDocumentStateFromUpstream(state, docData) {
  var upstreamRev = docData._meta[state.checkpointKey + FROM_FORK_FLAG_SUFFIX];

  if (upstreamRev && upstreamRev === docData._rev || docData._meta[state.checkpointKey + UPSTREAM_MARKING_WRITE_FLAG_SUFFIX] === docData._rev) {
    return true;
  } else {
    return false;
  }
}
//# sourceMappingURL=rx-storage-replication.js.map