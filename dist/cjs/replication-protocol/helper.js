"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.docStateToWriteDoc = docStateToWriteDoc;
exports.getUnderlyingPersistentStorage = getUnderlyingPersistentStorage;
exports.stripAttachmentsDataFromMetaWriteRows = stripAttachmentsDataFromMetaWriteRows;
exports.writeDocToDocState = writeDocToDocState;
var _index = require("../plugins/utils/index.js");
var _rxStorageHelper = require("../rx-storage-helper.js");
function docStateToWriteDoc(databaseInstanceToken, hasAttachments, keepMeta, docState, previous) {
  var docData = Object.assign({}, docState, {
    _attachments: hasAttachments && docState._attachments ? docState._attachments : {},
    _meta: keepMeta ? docState._meta : Object.assign({}, previous ? previous._meta : {}, {
      lwt: (0, _index.now)()
    }),
    _rev: keepMeta ? docState._rev : (0, _index.getDefaultRevision)()
  });
  if (!docData._rev) {
    docData._rev = (0, _index.createRevision)(databaseInstanceToken, previous);
  }
  return docData;
}
function writeDocToDocState(writeDoc, keepAttachments, keepMeta) {
  var ret = (0, _index.flatClone)(writeDoc);
  if (!keepAttachments) {
    delete ret._attachments;
  }
  if (!keepMeta) {
    delete ret._meta;
    delete ret._rev;
  }
  return ret;
}
function stripAttachmentsDataFromMetaWriteRows(state, rows) {
  if (!state.hasAttachments) {
    return rows;
  }
  return rows.map(row => {
    var document = (0, _index.clone)(row.document);
    document.docData = (0, _rxStorageHelper.stripAttachmentsDataFromDocument)(document.docData);
    return {
      document,
      previous: row.previous
    };
  });
}
function getUnderlyingPersistentStorage(instance) {
  while (true) {
    if (instance.underlyingPersistentStorage) {
      instance = instance.underlyingPersistentStorage;
    } else {
      return instance;
    }
  }
}
//# sourceMappingURL=helper.js.map