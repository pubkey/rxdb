"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRevisionForPulledDocument = createRevisionForPulledDocument;
exports.wasRevisionfromPullReplication = wasRevisionfromPullReplication;

var _util = require("../../util");

/**
 * The replication handler needs to know
 * which local documents have been lastly written locally
 * and which came from the remote.
 * To determine this, we 'flag' the document
 * by setting a specially crafted revision string.
 */

/**
 * Returns a new revision key without the revision height.
 * The revision is crafted for the graphql replication
 * and contains the information that this document data was pulled
 * from the remote server and not saved by the client.
 */
function createRevisionForPulledDocument(replicationIdentifierHash, doc) {
  var dataHash = (0, _util.hash)(doc);
  var ret = dataHash.substring(0, 8) + replicationIdentifierHash.substring(0, 30);
  return ret;
}

function wasRevisionfromPullReplication(replicationIdentifierHash, revision) {
  var useFromHash = replicationIdentifierHash.substring(0, 30);
  var ret = revision.endsWith(useFromHash);
  return ret;
}
//# sourceMappingURL=revision-flag.js.map