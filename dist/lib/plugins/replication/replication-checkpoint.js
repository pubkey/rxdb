"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getChangesSinceLastPushCheckpoint = void 0;
exports.getLastPullDocument = getLastPullDocument;
exports.getLastPushCheckpoint = getLastPushCheckpoint;
exports.setLastPushCheckpoint = exports.setLastPullDocument = void 0;

var _rxStorageHelper = require("../../rx-storage-helper");

var _util = require("../../util");

var _revisionFlag = require("./revision-flag");

var _rxDatabaseInternalStore = require("../../rx-database-internal-store");

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

var setLastPullDocument = function setLastPullDocument(collection, replicationIdentifierHash, lastPulledDoc) {
  try {
    var pullCheckpointId = (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(pullLastDocumentKey(replicationIdentifierHash), _rxDatabaseInternalStore.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES);
    return Promise.resolve((0, _rxStorageHelper.getSingleDocument)(collection.database.internalStore, pullCheckpointId)).then(function (lastPullCheckpointDoc) {
      if (!lastPullCheckpointDoc) {
        var insertData = {
          id: pullCheckpointId,
          key: pullLastDocumentKey(replicationIdentifierHash),
          context: _rxDatabaseInternalStore.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES,
          data: {
            lastPulledDoc: lastPulledDoc
          },
          _meta: (0, _util.getDefaultRxDocumentMeta)(),
          _rev: (0, _util.getDefaultRevision)(),
          _deleted: false,
          _attachments: {}
        };
        insertData._rev = (0, _util.createRevision)(insertData);
        return (0, _rxStorageHelper.writeSingle)(collection.database.internalStore, {
          document: insertData
        }, 'replication-checkpoint');
      } else {
        var newDoc = (0, _rxStorageHelper.flatCloneDocWithMeta)(lastPullCheckpointDoc);
        newDoc.data = {
          lastPulledDoc: lastPulledDoc
        };
        newDoc._rev = (0, _util.createRevision)(newDoc, lastPullCheckpointDoc);
        return (0, _rxStorageHelper.writeSingle)(collection.database.internalStore, {
          previous: lastPullCheckpointDoc,
          document: newDoc
        }, 'replication-checkpoint');
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.setLastPullDocument = setLastPullDocument;

var getChangesSinceLastPushCheckpoint = function getChangesSinceLastPushCheckpoint(collection, replicationIdentifierHash,
/**
 * A function that returns true
 * when the underlaying RxReplication is stopped.
 * So that we do not run requests against a close RxStorageInstance.
 */
isStopped) {
  try {
    var _arguments2 = arguments;
    var batchSize = _arguments2.length > 3 && _arguments2[3] !== undefined ? _arguments2[3] : 10;
    var primaryPath = collection.schema.primaryPath;
    return Promise.resolve(getLastPushCheckpoint(collection, replicationIdentifierHash)).then(function (lastPushCheckpoint) {
      var _interrupt = false;

      function _temp2() {
        return {
          changedDocIds: changedDocIds,
          changedDocs: changedDocs,
          checkpoint: lastCheckpoint
        };
      }

      var retry = true;
      var lastCheckpoint = lastPushCheckpoint;
      var changedDocs = new Map();
      var changedDocIds = new Set();
      /**
       * it can happen that all docs in the batch
       * do not have to be replicated.
       * Then we have to continue grapping the feed
       * until we reach the end of it
       */

      var _temp = _for(function () {
        return !_interrupt && !!retry && !isStopped();
      }, void 0, function () {
        return Promise.resolve(collection.storageInstance.getChangedDocumentsSince(batchSize, lastPushCheckpoint)).then(function (changesResults) {
          if (changesResults.documents.length > 0) {
            lastCheckpoint = changesResults.checkpoint;
          } // optimisation shortcut, do not proceed if there are no changed documents


          if (changesResults.documents.length === 0) {
            retry = false;
            return;
          }

          if (isStopped()) {
            _interrupt = true;
            return;
          }

          changesResults.documents.forEach(function (docData) {
            var docId = docData[primaryPath];

            if (changedDocs.has(docId)) {
              return;
            }
            /**
             * filter out changes with revisions resulting from the pull-stream
             * so that they will not be upstreamed again
             */


            if ((0, _revisionFlag.wasLastWriteFromPullReplication)(replicationIdentifierHash, docData)) {
              return false;
            }

            changedDocIds.add(docId);
            changedDocs.set(docId, {
              id: docId,
              doc: docData
            });
          });

          if (changedDocs.size < batchSize && changesResults.documents.length === batchSize) {
            // no pushable docs found but also not reached the end -> re-run
            lastPushCheckpoint = lastCheckpoint;
            retry = true;
          } else {
            retry = false;
          }
        });
      });

      return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
    });
  } catch (e) {
    return Promise.reject(e);
  }
}; //
// things for pull-checkpoint
//


exports.getChangesSinceLastPushCheckpoint = getChangesSinceLastPushCheckpoint;

var setLastPushCheckpoint = function setLastPushCheckpoint(collection, replicationIdentifierHash, checkpoint) {
  try {
    var docId = (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(pushSequenceDocumentKey(replicationIdentifierHash), _rxDatabaseInternalStore.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES);
    return Promise.resolve((0, _rxStorageHelper.getSingleDocument)(collection.database.internalStore, docId)).then(function (doc) {
      if (!doc) {
        var insertData = {
          id: docId,
          key: pushSequenceDocumentKey(replicationIdentifierHash),
          context: _rxDatabaseInternalStore.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES,
          data: {
            checkpoint: checkpoint
          },
          _deleted: false,
          _meta: (0, _util.getDefaultRxDocumentMeta)(),
          _rev: (0, _util.getDefaultRevision)(),
          _attachments: {}
        };
        insertData._rev = (0, _util.createRevision)(insertData);
        return Promise.resolve((0, _rxStorageHelper.writeSingle)(collection.database.internalStore, {
          document: insertData
        }, 'replication-set-push-checkpoint'));
      } else {
        var docData = {
          id: docId,
          key: pushSequenceDocumentKey(replicationIdentifierHash),
          context: _rxDatabaseInternalStore.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES,
          data: {
            checkpoint: checkpoint
          },
          _meta: (0, _util.flatClone)(doc._meta),
          _rev: (0, _util.getDefaultRevision)(),
          _deleted: false,
          _attachments: {}
        };
        docData._rev = (0, _util.createRevision)(docData, doc);
        return Promise.resolve((0, _rxStorageHelper.writeSingle)(collection.database.internalStore, {
          previous: doc,
          document: docData
        }, 'replication-set-push-checkpoint'));
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.setLastPushCheckpoint = setLastPushCheckpoint;

//
// things for the push-checkpoint
//
var pushSequenceDocumentKey = function pushSequenceDocumentKey(replicationIdentifierHash) {
  return 'replication-checkpoint-push-' + replicationIdentifierHash;
};

var pullLastDocumentKey = function pullLastDocumentKey(replicationIdentifierHash) {
  return 'replication-checkpoint-pull-' + replicationIdentifierHash;
};
/**
 * Get the last push checkpoint
 */


function getLastPushCheckpoint(collection, replicationIdentifierHash) {
  return (0, _rxStorageHelper.getSingleDocument)(collection.database.internalStore, (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(pushSequenceDocumentKey(replicationIdentifierHash), _rxDatabaseInternalStore.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES)).then(function (doc) {
    if (!doc) {
      return undefined;
    } else {
      return doc.data.checkpoint;
    }
  });
}

function getLastPullDocument(collection, replicationIdentifierHash) {
  return (0, _rxStorageHelper.getSingleDocument)(collection.database.internalStore, (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(pullLastDocumentKey(replicationIdentifierHash), _rxDatabaseInternalStore.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES)).then(function (lastPullCheckpoint) {
    if (!lastPullCheckpoint) {
      return null;
    } else {
      return lastPullCheckpoint.data.lastPulledDoc;
    }
  });
}
//# sourceMappingURL=replication-checkpoint.js.map