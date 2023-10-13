export async function getNatsServerDocumentState(natsStream, subjectPrefix, docId) {
  var remoteDocState = await natsStream.getMessage({
    last_by_subj: subjectPrefix + '.' + docId
  });
  return remoteDocState;
}
//# sourceMappingURL=nats-helper.js.map