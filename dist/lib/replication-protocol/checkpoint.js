"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCheckpointKey = getCheckpointKey;
exports.getLastCheckpointDoc = getLastCheckpointDoc;
exports.setCheckpoint = setCheckpoint;
var _rxSchemaHelper = require("../rx-schema-helper");
var _rxStorageHelper = require("../rx-storage-helper");
var _utils = require("../plugins/utils");
var _metaInstance = require("./meta-instance");
async function getLastCheckpointDoc(state, direction) {
  var checkpointDocId = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(_metaInstance.RX_REPLICATION_META_INSTANCE_SCHEMA, {
    isCheckpoint: '1',
    itemId: direction,
    replicationIdentifier: state.checkpointKey
  });
  var checkpointResult = await state.input.metaInstance.findDocumentsById([checkpointDocId], false);
  var checkpointDoc = checkpointResult[checkpointDocId];
  state.lastCheckpointDoc[direction] = checkpointDoc;
  if (checkpointDoc) {
    return checkpointDoc.data;
  } else {
    return undefined;
  }
}

/**
 * Sets the checkpoint,
 * automatically resolves conflicts that appear.
 */
async function setCheckpoint(state, direction, checkpoint) {
  var previousCheckpointDoc = state.lastCheckpointDoc[direction];
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
      _meta: (0, _utils.getDefaultRxDocumentMeta)(),
      _rev: (0, _utils.getDefaultRevision)()
    };
    newDoc.id = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(_metaInstance.RX_REPLICATION_META_INSTANCE_SCHEMA, newDoc);
    while (true) {
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
      newDoc._meta.lwt = (0, _utils.now)();
      newDoc._rev = (0, _utils.createRevision)(state.input.identifier, previousCheckpointDoc);
      var result = await state.input.metaInstance.bulkWrite([{
        previous: previousCheckpointDoc,
        document: newDoc
      }], 'replication-set-checkpoint');
      if (result.success[newDoc.id]) {
        state.lastCheckpointDoc[direction] = (0, _utils.getFromObjectOrThrow)(result.success, newDoc.id);
        return;
      } else {
        var error = (0, _utils.getFromObjectOrThrow)(result.error, newDoc.id);
        if (error.status !== 409) {
          throw error;
        } else {
          previousCheckpointDoc = (0, _utils.ensureNotFalsy)(error.documentInDb);
          newDoc._rev = (0, _utils.createRevision)(state.input.identifier, previousCheckpointDoc);
        }
      }
    }
  }
}
function getCheckpointKey(input) {
  var hash = (0, _utils.fastUnsecureHash)([input.identifier, input.forkInstance.databaseName, input.forkInstance.collectionName].join('||'));
  return 'rx-storage-replication-' + hash;
}
//# sourceMappingURL=checkpoint.js.map