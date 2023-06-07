export var NATS_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'nats';
export async function getNatsServerDocumentState(natsStream, subjectPrefix, docId) {
  var remoteDocState = await natsStream.getMessage({
    last_by_subj: subjectPrefix + '.' + docId
  });
  return remoteDocState;
}
//# sourceMappingURL=nats-helper.js.map