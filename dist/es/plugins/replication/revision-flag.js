/**
 * The replication handler needs to know
 * which local documents have been lastly written locally
 * and which came from the remote.
 * To determine this, we 'flag' the document
 * by setting a specially crafted revision string.
 */
import { parseRevision } from '../../util';
export function getPullReplicationFlag(replicationIdentifierHash) {
  return 'rep-' + replicationIdentifierHash;
}
/**
 * Sets the pull replication flag to the _meta
 * to contain the next revision height.
 * Used to identify the document as 'pulled-from-remote'
 * so we do not send it to remote again.
 */

export function setLastWritePullReplication(replicationIdentifierHash, documentData,
/**
 * Height of the revision
 * with which the pull flag will be saved.
 */
revisionHeight) {
  documentData._meta[getPullReplicationFlag(replicationIdentifierHash)] = revisionHeight;
}
export function wasLastWriteFromPullReplication(replicationIdentifierHash, documentData) {
  var lastRevision = parseRevision(documentData._rev);

  var replicationFlagValue = documentData._meta[getPullReplicationFlag(replicationIdentifierHash)];

  if (replicationFlagValue && lastRevision.height === replicationFlagValue) {
    return true;
  } else {
    return false;
  }
}
//# sourceMappingURL=revision-flag.js.map