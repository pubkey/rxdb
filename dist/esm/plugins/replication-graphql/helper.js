import { ensureNotFalsy } from "../../plugins/utils/index.js";
export var GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'graphql';
export function graphQLRequest(fetchRequest, httpUrl, clientState, queryParams) {
  var headers = new Headers(clientState.headers || {});
  headers.append('Content-Type', 'application/json');
  var req = new Request(ensureNotFalsy(httpUrl), {
    method: 'POST',
    body: JSON.stringify(queryParams),
    headers,
    credentials: clientState.credentials
  });
  return fetchRequest(req).then(res => res.json()).then(body => {
    return body;
  });
}
//# sourceMappingURL=helper.js.map