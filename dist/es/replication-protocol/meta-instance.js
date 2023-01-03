import { fillWithDefaultSettings, getComposedPrimaryKeyOfDocumentData } from '../rx-schema-helper';
import { flatCloneDocWithMeta } from '../rx-storage-helper';
import { getDefaultRevision, createRevision, now } from '../plugins/utils';
export var RX_REPLICATION_META_INSTANCE_SCHEMA = fillWithDefaultSettings({
  primaryKey: {
    key: 'id',
    fields: ['replicationIdentifier', 'itemId', 'isCheckpoint'],
    separator: '|'
  },
  type: 'object',
  version: 0,
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    replicationIdentifier: {
      type: 'string'
    },
    isCheckpoint: {
      type: 'string',
      enum: ['0', '1'],
      maxLength: 1
    },
    itemId: {
      type: 'string'
    },
    data: {
      type: 'object',
      additionalProperties: true
    },
    isResolvedConflict: {
      type: 'string'
    }
  },
  required: ['id', 'replicationIdentifier', 'isCheckpoint', 'itemId', 'data']
});

/**
 * Returns the document states of what the fork instance
 * assumes to be the latest state on the master instance.
 */
export function getAssumedMasterState(state, docIds) {
  return state.input.metaInstance.findDocumentsById(docIds.map(docId => {
    var useId = getComposedPrimaryKeyOfDocumentData(RX_REPLICATION_META_INSTANCE_SCHEMA, {
      itemId: docId,
      replicationIdentifier: state.checkpointKey,
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
    replicationIdentifier: state.checkpointKey,
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
  newMeta.id = getComposedPrimaryKeyOfDocumentData(RX_REPLICATION_META_INSTANCE_SCHEMA, newMeta);
  newMeta._rev = createRevision(state.input.identifier, previous);
  return {
    previous,
    document: newMeta
  };
}
//# sourceMappingURL=meta-instance.js.map