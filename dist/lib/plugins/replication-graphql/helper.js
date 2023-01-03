"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = void 0;
exports.graphQLRequest = graphQLRequest;
var _utils = require("../../plugins/utils");
var GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'graphql';
exports.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX;
function graphQLRequest(httpUrl, clientState, queryParams) {
  var headers = new Headers(clientState.headers || {});
  headers.append('Content-Type', 'application/json');
  var req = new Request((0, _utils.ensureNotFalsy)(httpUrl), {
    method: 'POST',
    body: JSON.stringify(queryParams),
    headers,
    credentials: clientState.credentials
  });
  return fetch(req).then(res => res.json()).then(body => {
    return body;
  });
}
//# sourceMappingURL=helper.js.map