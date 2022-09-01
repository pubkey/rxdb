"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_REPLICATION_META_INSTANCE_SCHEMA = void 0;
exports.getAssumedMasterState = getAssumedMasterState;
exports.getMetaWriteRow = getMetaWriteRow;

var _rxSchemaHelper = require("../rx-schema-helper");

var _rxStorageHelper = require("../rx-storage-helper");

var _util = require("../util");

var RX_REPLICATION_META_INSTANCE_SCHEMA = (0, _rxSchemaHelper.fillWithDefaultSettings)({
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
      "enum": ['0', '1'],
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

exports.RX_REPLICATION_META_INSTANCE_SCHEMA = RX_REPLICATION_META_INSTANCE_SCHEMA;

function getAssumedMasterState(state, docIds) {
  return state.input.metaInstance.findDocumentsById(docIds.map(function (docId) {
    var useId = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(RX_REPLICATION_META_INSTANCE_SCHEMA, {
      itemId: docId,
      replicationIdentifier: state.checkpointKey,
      isCheckpoint: '0'
    });
    return useId;
  }), true).then(function (metaDocs) {
    var ret = {};
    Object.values(metaDocs).forEach(function (metaDoc) {
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
    replicationIdentifier: state.checkpointKey,
    isCheckpoint: '0',
    itemId: docId,
    data: newMasterDocState,
    _attachments: {},
    _deleted: false,
    _rev: (0, _util.getDefaultRevision)(),
    _meta: {
      lwt: 0
    }
  };
  newMeta.data = newMasterDocState;
  newMeta.isResolvedConflict = isResolvedConflict;
  newMeta._meta.lwt = (0, _util.now)();
  newMeta.id = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(RX_REPLICATION_META_INSTANCE_SCHEMA, newMeta);
  newMeta._rev = (0, _util.createRevision)(state.input.hashFunction, newMeta, previous);
  return {
    previous: previous,
    document: newMeta
  };
}
//# sourceMappingURL=meta-instance.js.map