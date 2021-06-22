"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRevisionForPulledDocument = createRevisionForPulledDocument;
exports.wasRevisionfromPullReplication = wasRevisionfromPullReplication;
exports.DEFAULT_MODIFIER = exports.GRAPHQL_REPLICATION_PLUGIN_IDENT = void 0;

var _util = require("../../util");

var GRAPHQL_REPLICATION_PLUGIN_IDENT = 'rxdbreplicationgraphql'; // does nothing

exports.GRAPHQL_REPLICATION_PLUGIN_IDENT = GRAPHQL_REPLICATION_PLUGIN_IDENT;

var DEFAULT_MODIFIER = function DEFAULT_MODIFIER(d) {
  return Promise.resolve(d);
};
/**
 * Returns a new revision key without the revision height.
 * The revision is crafted for the graphql replication
 * and contains the information that this document data was pulled
 * from the remote server and not saved by the client.
 */


exports.DEFAULT_MODIFIER = DEFAULT_MODIFIER;

function createRevisionForPulledDocument(endpointHash, doc) {
  var dataHash = (0, _util.hash)(doc);
  var ret = dataHash.substring(0, 8) + endpointHash.substring(0, 8) + GRAPHQL_REPLICATION_PLUGIN_IDENT;
  return ret;
}

function wasRevisionfromPullReplication(endpointHash, revision) {
  var ending = endpointHash.substring(0, 8) + GRAPHQL_REPLICATION_PLUGIN_IDENT;
  var ret = revision.endsWith(ending);
  return ret;
}

//# sourceMappingURL=helper.js.map