/**
 * The replication handler needs to know
 * which local documents have been lastly written locally
 * and which came from the remote.
 * To determine this, we 'flag' the document
 * by setting a specially crafted revision string.
 */
import { hash } from '../../util';
/**
 * Returns a new revision key without the revision height.
 * The revision is crafted for the graphql replication
 * and contains the information that this document data was pulled
 * from the remote server and not saved by the client.
 */

export function createRevisionForPulledDocument(replicationIdentifier, doc) {
  var replicationIdentifierHash = hash(replicationIdentifier);
  var dataHash = hash(doc);
  var ret = dataHash.substring(0, 8) + replicationIdentifierHash.substring(0, 30);
  return ret;
}
export function wasRevisionfromPullReplication(replicationIdentifier, revision) {
  var replicationIdentifierHash = hash(replicationIdentifier);
  var useFromHash = replicationIdentifierHash.substring(0, 30);
  var ret = revision.endsWith(useFromHash);
  return ret;
}
//# sourceMappingURL=revision-flag.js.map