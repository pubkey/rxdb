"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = void 0;
exports.getDataFromResult = getDataFromResult;
exports.graphQLRequest = graphQLRequest;
var _index = require("../../plugins/utils/index.js");
var GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = exports.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'graphql';
function graphQLRequest(fetchRequest, httpUrl, clientState, queryParams) {
  var headers = new Headers(clientState.headers || {});
  headers.append('Content-Type', 'application/json');
  var req = new Request((0, _index.ensureNotFalsy)(httpUrl), {
    method: 'POST',
    body: JSON.stringify(queryParams),
    headers,
    credentials: clientState.credentials
  });
  return fetchRequest(req).then(res => res.json()).then(body => {
    return body;
  });
}
function getDataFromResult(result, userDefinedDataPath) {
  var dataPath = userDefinedDataPath || ['data', Object.keys(result.data)[0]];
  var data = (0, _index.getProperty)(result, dataPath);
  return data;
}
//# sourceMappingURL=helper.js.map