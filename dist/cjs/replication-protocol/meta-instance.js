"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.META_INSTANCE_SCHEMA_TITLE = void 0;
exports.getAssumedMasterState = getAssumedMasterState;
exports.getMetaWriteRow = getMetaWriteRow;
exports.getRxReplicationMetaInstanceSchema = getRxReplicationMetaInstanceSchema;
var _rxSchemaHelper = require("../rx-schema-helper.js");
var _rxStorageHelper = require("../rx-storage-helper.js");
var _index = require("../plugins/utils/index.js");
var META_INSTANCE_SCHEMA_TITLE = exports.META_INSTANCE_SCHEMA_TITLE = 'RxReplicationProtocolMetaData';
function getRxReplicationMetaInstanceSchema(replicatedDocumentsSchema, encrypted) {
  var parentPrimaryKeyLength = (0, _rxSchemaHelper.getLengthOfPrimaryKey)(replicatedDocumentsSchema);
  var baseSchema = {
    title: META_INSTANCE_SCHEMA_TITLE,
    primaryKey: {
      key: 'id',
      fields: ['itemId', 'isCheckpoint'],
      separator: '|'
    },
    type: 'object',
    version: replicatedDocumentsSchema.version,
    additionalProperties: false,
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        // add +1 for the '|' and +1 for the 'isCheckpoint' flag
        maxLength: parentPrimaryKeyLength + 2
      },
      isCheckpoint: {
        type: 'string',
        enum: ['0', '1'],
        minLength: 1,
        maxLength: 1
      },
      itemId: {
        type: 'string',
        /**
         * ensure that all values of RxStorageReplicationDirection ('DOWN' has 4 chars) fit into it
         * because checkpoints use the itemId field for that.
         */
        maxLength: parentPrimaryKeyLength > 4 ? parentPrimaryKeyLength : 4
      },
      checkpointData: {
        type: 'object',
        additionalProperties: true
      },
      docData: {
        type: 'object',
        properties: replicatedDocumentsSchema.properties
      },
      isResolvedConflict: {
        type: 'string'
      }
    },
    keyCompression: replicatedDocumentsSchema.keyCompression,
    required: ['id', 'isCheckpoint', 'itemId']
  };
  if (encrypted) {
    baseSchema.encrypted = ['docData'];
  }
  var metaInstanceSchema = (0, _rxSchemaHelper.fillWithDefaultSettings)(baseSchema);
  return metaInstanceSchema;
}

/**
 * Returns the document states of what the fork instance
 * assumes to be the latest state on the master instance.
 */
function getAssumedMasterState(state, docIds) {
  return state.input.metaInstance.findDocumentsById(docIds.map(docId => {
    var useId = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(state.input.metaInstance.schema, {
      itemId: docId,
      isCheckpoint: '0'
    });
    return useId;
  }), true).then(metaDocs => {
    var ret = {};
    Object.values(metaDocs).forEach(metaDoc => {
      ret[metaDoc.itemId] = {
        docData: metaDoc.docData,
        metaDocument: metaDoc
      };
    });
    return ret;
  });
}
async function getMetaWriteRow(state, newMasterDocState, previous, isResolvedConflict) {
  var docId = newMasterDocState[state.primaryPath];
  var newMeta = previous ? (0, _rxStorageHelper.flatCloneDocWithMeta)(previous) : {
    id: '',
    isCheckpoint: '0',
    itemId: docId,
    docData: newMasterDocState,
    _attachments: {},
    _deleted: false,
    _rev: (0, _index.getDefaultRevision)(),
    _meta: {
      lwt: 0
    }
  };
  newMeta.docData = newMasterDocState;

  /**
   * Sending isResolvedConflict with the value undefined
   * will throw a schema validation error because it must be either
   * not set or have a string.
   */
  if (isResolvedConflict) {
    newMeta.isResolvedConflict = isResolvedConflict;
  }
  newMeta._meta.lwt = (0, _index.now)();
  newMeta.id = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(state.input.metaInstance.schema, newMeta);
  newMeta._rev = (0, _index.createRevision)(await state.checkpointKey, previous);
  var ret = {
    previous,
    document: newMeta
  };
  return ret;
}
//# sourceMappingURL=meta-instance.js.map