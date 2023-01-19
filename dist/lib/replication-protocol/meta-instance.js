"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAssumedMasterState = getAssumedMasterState;
exports.getMetaWriteRow = getMetaWriteRow;
exports.getRxReplicationMetaInstanceSchema = getRxReplicationMetaInstanceSchema;
var _rxSchemaHelper = require("../rx-schema-helper");
var _rxStorageHelper = require("../rx-storage-helper");
var _utils = require("../plugins/utils");
function getRxReplicationMetaInstanceSchema(replicatedDocumentsSchema) {
  var parentPrimaryKeyLength = (0, _rxSchemaHelper.getLengthOfPrimaryKey)(replicatedDocumentsSchema);
  var metaInstanceSchema = (0, _rxSchemaHelper.fillWithDefaultSettings)({
    primaryKey: {
      key: 'id',
      fields: ['itemId', 'isCheckpoint'],
      separator: '|'
    },
    type: 'object',
    version: 0,
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
        maxLength: parentPrimaryKeyLength
      },
      data: {
        type: 'object',
        additionalProperties: true
      },
      isResolvedConflict: {
        type: 'string'
      }
    },
    required: ['id', 'isCheckpoint', 'itemId', 'data']
  });
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
        docData: metaDoc.data,
        metaDocument: metaDoc
      };
    });
    return ret;
  });
}
function getMetaWriteRow(state, newMasterDocState, previous, isResolvedConflict) {
  var docId = newMasterDocState[state.primaryPath];
  var newMeta = previous ? (0, _rxStorageHelper.flatCloneDocWithMeta)(previous) : {
    id: '',
    isCheckpoint: '0',
    itemId: docId,
    data: newMasterDocState,
    _attachments: {},
    _deleted: false,
    _rev: (0, _utils.getDefaultRevision)(),
    _meta: {
      lwt: 0
    }
  };
  newMeta.data = newMasterDocState;
  newMeta.isResolvedConflict = isResolvedConflict;
  newMeta._meta.lwt = (0, _utils.now)();
  newMeta.id = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(state.input.metaInstance.schema, newMeta);
  newMeta._rev = (0, _utils.createRevision)(state.input.identifier, previous);
  return {
    previous,
    document: newMeta
  };
}
//# sourceMappingURL=meta-instance.js.map