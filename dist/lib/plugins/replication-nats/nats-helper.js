"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NATS_REPLICATION_PLUGIN_IDENTITY_PREFIX = void 0;
exports.getNatsServerDocumentState = getNatsServerDocumentState;
var NATS_REPLICATION_PLUGIN_IDENTITY_PREFIX = exports.NATS_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'nats';
async function getNatsServerDocumentState(natsStream, subjectPrefix, docId) {
  var remoteDocState = await natsStream.getMessage({
    last_by_subj: subjectPrefix + '.' + docId
  });
  return remoteDocState;
}
//# sourceMappingURL=nats-helper.js.map