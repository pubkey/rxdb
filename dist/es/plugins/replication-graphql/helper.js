import { hash } from '../../util';
export var GRAPHQL_REPLICATION_PLUGIN_IDENT = 'rxdbreplicationgraphql'; // does nothing

export var DEFAULT_MODIFIER = function DEFAULT_MODIFIER(d) {
  return Promise.resolve(d);
};
/**
 * Returns a new revision key without the revision height.
 * The revision is crafted for the graphql replication
 * and contains the information that this document data was pulled
 * from the remote server and not saved by the client.
 */

export function createRevisionForPulledDocument(endpointHash, doc) {
  var dataHash = hash(doc);
  var ret = dataHash.substring(0, 8) + endpointHash.substring(0, 8) + GRAPHQL_REPLICATION_PLUGIN_IDENT;
  return ret;
}
export function wasRevisionfromPullReplication(endpointHash, revision) {
  var ending = endpointHash.substring(0, 8) + GRAPHQL_REPLICATION_PLUGIN_IDENT;
  var ret = revision.endsWith(ending);
  return ret;
}
//# sourceMappingURL=helper.js.map