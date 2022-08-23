import { SubscriptionClient } from 'subscriptions-transport-ws';
import { getFromMapOrThrow } from '../../util';
import { WebSocket as IsomorphicWebSocket } from 'isomorphic-ws';
export var GRAPHQL_WEBSOCKET_BY_URL = new Map();
export function getGraphQLWebSocket(url) {
  var has = GRAPHQL_WEBSOCKET_BY_URL.get(url);

  if (!has) {
    var wsClient = new SubscriptionClient(url, {
      reconnect: true
    }, IsomorphicWebSocket);
    has = {
      url: url,
      socket: wsClient,
      refCount: 1
    };
    GRAPHQL_WEBSOCKET_BY_URL.set(url, has);
  } else {
    has.refCount = has.refCount + 1;
  }

  return has.socket;
}
export function removeGraphQLWebSocketRef(url) {
  var obj = getFromMapOrThrow(GRAPHQL_WEBSOCKET_BY_URL, url);
  obj.refCount = obj.refCount - 1;

  if (obj.refCount === 0) {
    GRAPHQL_WEBSOCKET_BY_URL["delete"](url);
    obj.socket.close();
  }
}
//# sourceMappingURL=graphql-websocket.js.map