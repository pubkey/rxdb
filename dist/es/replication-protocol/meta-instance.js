import { fillWithDefaultSettings, getComposedPrimaryKeyOfDocumentData, getLengthOfPrimaryKey } from '../rx-schema-helper';
import { flatCloneDocWithMeta } from '../rx-storage-helper';
import { getDefaultRevision, createRevision, now } from '../plugins/utils';
export function getRxReplicationMetaInstanceSchema(replicatedDocumentsSchema, encrypted) {
  var parentPrimaryKeyLength = getLengthOfPrimaryKey(replicatedDocumentsSchema);
  var baseSchema = {
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
  };
  if (encrypted) {
    baseSchema.encrypted = ['data'];
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
        docData: metaDoc.data,
        metaDocument: metaDoc
      };
    });
    return ret;
  });
}
export function getMetaWriteRow(state, newMasterDocState, previous, isResolvedConflict) {
  var docId = newMasterDocState[state.primaryPath];
  var newMeta = previous ? flatCloneDocWithMeta(previous) : {
    id: '',
    isCheckpoint: '0',
    itemId: docId,
    data: newMasterDocState,
    _attachments: {},
    _deleted: false,
    _rev: getDefaultRevision(),
    _meta: {
      lwt: 0
    }
  };
  newMeta.data = newMasterDocState;
  newMeta.isResolvedConflict = isResolvedConflict;
  newMeta._meta.lwt = now();
  newMeta.id = getComposedPrimaryKeyOfDocumentData(state.input.metaInstance.schema, newMeta);
  newMeta._rev = createRevision(state.input.identifier, previous);
  return {
    previous,
    document: newMeta
  };
}
//# sourceMappingURL=meta-instance.js.map