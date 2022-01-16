import { wasRevisionfromPullReplication, GRAPHQL_REPLICATION_PLUGIN_IDENT } from './helper';
import { findLocalDocument, writeSingleLocal } from '../../rx-storage-helper';
import { flatClone } from '../../util';
import { newRxError } from '../../rx-error';
import { runPluginHooks } from '../../hooks';
/**
 * when the replication starts,
 * we need a way to find out where it ended the last time.
 *
 * For push-replication, we use the storageInstance-sequence:
 * We get the documents newer then the last sequence-id
 * and push them to the server.
 *
 * For pull-replication, we use the last document we got from the server:
 * We send the last document to the queryBuilder()
 * and recieve newer documents sorted in a batch
 */
//
// things for the push-checkpoint
//

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

export var setLastPullDocument = function setLastPullDocument(collection, endpointHash, doc) {
  try {
    var _id = pullLastDocumentId(endpointHash);

    return Promise.resolve(collection.database.lockedRun(function () {
      return findLocalDocument(collection.localDocumentsStore, _id);
    })).then(function (localDoc) {
      if (!localDoc) {
        return collection.database.lockedRun(function () {
          return writeSingleLocal(collection.localDocumentsStore, {
            document: {
              _id: _id,
              doc: doc,
              _attachments: {}
            }
          });
        });
      } else {
        var newDoc = flatClone(localDoc);
        newDoc.doc = doc;
        return collection.database.lockedRun(function () {
          return writeSingleLocal(collection.localDocumentsStore, {
            previous: localDoc,
            document: newDoc
          });
        });
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export var getLastPullDocument = function getLastPullDocument(collection, endpointHash) {
  try {
    return Promise.resolve(collection.database.lockedRun(function () {
      return findLocalDocument(collection.localDocumentsStore, pullLastDocumentId(endpointHash));
    })).then(function (localDoc) {
      if (!localDoc) {
        return null;
      } else {
        return localDoc.doc;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export var getChangesSinceLastPushSequence = function getChangesSinceLastPushSequence(collection, endpointHash) {
  try {
    var _arguments2 = arguments;
    var batchSize = _arguments2.length > 2 && _arguments2[2] !== undefined ? _arguments2[2] : 10;
    return Promise.resolve(getLastPushSequence(collection, endpointHash)).then(function (lastPushSequence) {
      function _temp2() {
        return {
          changedDocs: changedDocs,
          lastSequence: lastSequence,
          hasChangesSinceLastSequence: lastPushSequence !== lastSequence
        };
      }

      var retry = true;
      var lastSequence = lastPushSequence;
      var changedDocs = new Map();
      /**
       * it can happen that all docs in the batch
       * do not have to be replicated.
       * Then we have to continue grapping the feed
       * until we reach the end of it
       */

      var _temp = _for(function () {
        return !!retry;
      }, void 0, function () {
        return Promise.resolve(collection.database.lockedRun(function () {
          return collection.storageInstance.getChangedDocuments({
            sinceSequence: lastPushSequence,
            limit: batchSize,
            direction: 'after'
          });
        })).then(function (changesResults) {
          lastSequence = changesResults.lastSequence; // optimisation shortcut, do not proceed if there are no changed documents

          if (changesResults.changedDocuments.length === 0) {
            retry = false;
            return;
          }

          return Promise.resolve(collection.database.lockedRun(function () {
            return collection.storageInstance.findDocumentsById(changesResults.changedDocuments.map(function (row) {
              return row.id;
            }), true);
          })).then(function (plainDocs) {
            var docs = new Map();
            Object.entries(plainDocs).forEach(function (_ref) {
              var docId = _ref[0],
                  docData = _ref[1];
              var hookParams = {
                collection: collection,
                doc: docData
              };
              runPluginHooks('postReadFromInstance', hookParams);
              docs.set(docId, hookParams.doc);
            });
            changesResults.changedDocuments.forEach(function (row) {
              var id = row.id;

              if (changedDocs.has(id)) {
                return;
              }

              var changedDoc = docs.get(id);

              if (!changedDoc) {
                throw newRxError('SNH', {
                  args: {
                    docs: docs
                  }
                });
              }
              /**
               * filter out changes with revisions resulting from the pull-stream
               * so that they will not be upstreamed again
               */


              if (wasRevisionfromPullReplication(endpointHash, changedDoc._rev)) {
                return false;
              }

              changedDocs.set(id, {
                id: id,
                doc: changedDoc,
                sequence: row.sequence
              });
            });

            if (changedDocs.size < batchSize && changesResults.changedDocuments.length === batchSize) {
              // no pushable docs found but also not reached the end -> re-run
              lastPushSequence = lastSequence;
              retry = true;
            } else {
              retry = false;
            }
          });
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

export var setLastPushSequence = function setLastPushSequence(collection, endpointHash, sequence) {
  try {
    var _id = pushSequenceId(endpointHash);

    return Promise.resolve(collection.database.lockedRun(function () {
      return findLocalDocument(collection.localDocumentsStore, _id);
    })).then(function (doc) {
      if (!doc) {
        return Promise.resolve(collection.database.lockedRun(function () {
          return writeSingleLocal(collection.localDocumentsStore, {
            document: {
              _id: _id,
              value: sequence,
              _attachments: {}
            }
          });
        })).then(function (res) {
          return res;
        });
      } else {
        var newDoc = flatClone(doc);
        newDoc.value = sequence;
        return Promise.resolve(collection.database.lockedRun(function () {
          return writeSingleLocal(collection.localDocumentsStore, {
            previous: doc,
            document: {
              _id: _id,
              value: sequence,
              _attachments: {}
            }
          });
        })).then(function (res) {
          return res;
        });
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * @return last sequence checkpoint
 */
export var getLastPushSequence = function getLastPushSequence(collection, endpointHash) {
  try {
    return Promise.resolve(collection.database.lockedRun(function () {
      return findLocalDocument(collection.localDocumentsStore, pushSequenceId(endpointHash));
    })).then(function (doc) {
      if (!doc) {
        return 0;
      } else {
        return doc.value;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

var pushSequenceId = function pushSequenceId(endpointHash) {
  return GRAPHQL_REPLICATION_PLUGIN_IDENT + '-push-checkpoint-' + endpointHash;
};

var pullLastDocumentId = function pullLastDocumentId(endpointHash) {
  return GRAPHQL_REPLICATION_PLUGIN_IDENT + '-pull-checkpoint-' + endpointHash;
};
//# sourceMappingURL=crawling-checkpoint.js.map