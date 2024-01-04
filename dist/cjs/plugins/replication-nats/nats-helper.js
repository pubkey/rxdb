"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getNatsServerDocumentState = getNatsServerDocumentState;
async function getNatsServerDocumentState(natsStream, subjectPrefix, docId) {
  var remoteDocState = await natsStream.getMessage({
    last_by_subj: subjectPrefix + '.' + docId
  });
  return remoteDocState;
}
//# sourceMappingURL=nats-helper.js.map