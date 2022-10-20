"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCheckpointKey = getCheckpointKey;
exports.setCheckpoint = exports.getLastCheckpointDoc = void 0;
var _rxSchemaHelper = require("../rx-schema-helper");
var _rxStorageHelper = require("../rx-storage-helper");
var _util = require("../util");
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
 * Sets the checkpoint,
 * automatically resolves conflicts that appear.
 */
var setCheckpoint = function setCheckpoint(state, direction, checkpoint) {
  try {
    var _exit2 = false;
    var previousCheckpointDoc = state.lastCheckpointDoc[direction];
    return Promise.resolve(function () {
      if (checkpoint &&
      /**
       * If the replication is already canceled,
       * we do not write a checkpoint
       * because that could mean we write a checkpoint
       * for data that has been fetched from the master
       * but not been written to the child.
       */
      !state.events.canceled.getValue() && (
      /**
       * Only write checkpoint if it is different from before
       * to have less writes to the storage.
       */

      !previousCheckpointDoc || JSON.stringify(previousCheckpointDoc.data) !== JSON.stringify(checkpoint))) {
        var newDoc = {
          id: '',
          isCheckpoint: '1',
          itemId: direction,
          replicationIdentifier: state.checkpointKey,
          _deleted: false,
          _attachments: {},
          data: checkpoint,
          _meta: (0, _util.getDefaultRxDocumentMeta)(),
          _rev: (0, _util.getDefaultRevision)()
        };
        newDoc.id = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(_metaInstance.RX_REPLICATION_META_INSTANCE_SCHEMA, newDoc);
        return _for(function () {
          return !_exit2;
        }, void 0, function () {
          /**
           * Instead of just storign the new checkpoint,
           * we have to stack up the checkpoint with the previous one.
           * This is required for plugins like the sharding RxStorage
           * where the changeStream events only contain a Partial of the
           * checkpoint.
           */
          if (previousCheckpointDoc) {
            newDoc.data = (0, _rxStorageHelper.stackCheckpoints)([previousCheckpointDoc.data, newDoc.data]);
          }
          newDoc._meta.lwt = (0, _util.now)();
          newDoc._rev = (0, _util.createRevision)(state.input.hashFunction, newDoc, previousCheckpointDoc);
          return Promise.resolve(state.input.metaInstance.bulkWrite([{
            previous: previousCheckpointDoc,
            document: newDoc
          }], 'replication-set-checkpoint')).then(function (result) {
            if (result.success[newDoc.id]) {
              state.lastCheckpointDoc[direction] = (0, _util.getFromObjectOrThrow)(result.success, newDoc.id);
              _exit2 = true;
            } else {
              var error = (0, _util.getFromObjectOrThrow)(result.error, newDoc.id);
              if (error.status !== 409) {
                throw error;
              } else {
                previousCheckpointDoc = (0, _util.ensureNotFalsy)(error.documentInDb);
                newDoc._rev = (0, _util.createRevision)(state.input.hashFunction, newDoc, previousCheckpointDoc);
              }
            }
          });
        });
      }
    }());
  } catch (e) {
    return Promise.reject(e);
  }
};
exports.setCheckpoint = setCheckpoint;
var getLastCheckpointDoc = function getLastCheckpointDoc(state, direction) {
  try {
    var checkpointDocId = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(_metaInstance.RX_REPLICATION_META_INSTANCE_SCHEMA, {
      isCheckpoint: '1',
      itemId: direction,
      replicationIdentifier: state.checkpointKey
    });
    return Promise.resolve(state.input.metaInstance.findDocumentsById([checkpointDocId], false)).then(function (checkpointResult) {
      var checkpointDoc = checkpointResult[checkpointDocId];
      state.lastCheckpointDoc[direction] = checkpointDoc;
      if (checkpointDoc) {
        return checkpointDoc.data;
      } else {
        return undefined;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
exports.getLastCheckpointDoc = getLastCheckpointDoc;
function getCheckpointKey(input) {
  var hash = (0, _util.fastUnsecureHash)([input.identifier, input.forkInstance.databaseName, input.forkInstance.collectionName].join('||'));
  return 'rx-storage-replication-' + hash;
}
//# sourceMappingURL=checkpoint.js.map