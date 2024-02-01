import { fillWithDefaultSettings, getComposedPrimaryKeyOfDocumentData, getLengthOfPrimaryKey } from "../rx-schema-helper.js";
import { flatCloneDocWithMeta } from "../rx-storage-helper.js";
import { getDefaultRevision, createRevision, now } from "../plugins/utils/index.js";
export var META_INSTANCE_SCHEMA_TITLE = 'RxReplicationProtocolMetaData';
export function getRxReplicationMetaInstanceSchema(replicatedDocumentsSchema, encrypted) {
  var parentPrimaryKeyLength = getLengthOfPrimaryKey(replicatedDocumentsSchema);
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
  var metaInstanceSchema = fillWithDefaultSettings(baseSchema);
  return metaInstanceSchema;
}

/**
 * Returns the document states of what the fork instance
 * assumes to be the latest state on the master instance.
 */
export function getAssumedMasterState(state, docIds) {
  return state.input.metaInstance.findDocumentsById(docIds.map(docId => {
    var useId = getComposedPrimaryKeyOfDocumentData(state.input.metaInstance.schema, {
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
export async function getMetaWriteRow(state, newMasterDocState, previous, isResolvedConflict) {
  var docId = newMasterDocState[state.primaryPath];
  var newMeta = previous ? flatCloneDocWithMeta(previous) : {
    id: '',
    isCheckpoint: '0',
    itemId: docId,
    docData: newMasterDocState,
    _attachments: {},
    _deleted: false,
    _rev: getDefaultRevision(),
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
  newMeta._meta.lwt = now();
  newMeta.id = getComposedPrimaryKeyOfDocumentData(state.input.metaInstance.schema, newMeta);
  newMeta._rev = createRevision(await state.checkpointKey, previous);
  var ret = {
    previous,
    document: newMeta
  };
  return ret;
}
//# sourceMappingURL=meta-instance.js.map