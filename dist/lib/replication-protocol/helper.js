"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.docStateToWriteDoc = docStateToWriteDoc;
exports.writeDocToDocState = writeDocToDocState;
var _util = require("../util");
function docStateToWriteDoc(databaseInstanceToken, docState, previous) {
  var docData = Object.assign({}, docState, {
    _attachments: {},
    _meta: {
      lwt: (0, _util.now)()
    },
    _rev: (0, _util.getDefaultRevision)()
  });
  docData._rev = (0, _util.createRevision)(databaseInstanceToken, previous);
  return docData;
}
function writeDocToDocState(writeDoc) {
  var ret = (0, _util.flatClone)(writeDoc);
  delete ret._attachments;
  delete ret._meta;
  delete ret._rev;
  return ret;
}
//# sourceMappingURL=helper.js.map