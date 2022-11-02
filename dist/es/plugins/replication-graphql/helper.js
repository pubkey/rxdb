import { ensureNotFalsy } from '../../util';
export var GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-graphql-';
export function graphQLRequest(httpUrl, clientState, queryParams) {
  var headers = new Headers(clientState.headers || {});
  headers.append('Content-Type', 'application/json');
  var req = new Request(ensureNotFalsy(httpUrl), {
    method: 'POST',
    body: JSON.stringify(queryParams),
    headers: headers,
    credentials: clientState.credentials
  });
  return fetch(req).then(function (res) {
    return res.json();
  }).then(function (body) {
    return body;
  });
}
//# sourceMappingURL=helper.js.map