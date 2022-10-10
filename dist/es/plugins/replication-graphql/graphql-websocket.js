import { createClient } from 'graphql-ws';
import { getFromMapOrThrow } from '../../util';
import { WebSocket as IsomorphicWebSocket } from 'isomorphic-ws';
export var GRAPHQL_WEBSOCKET_BY_URL = new Map();
export function getGraphQLWebSocket(url) {
  var has = GRAPHQL_WEBSOCKET_BY_URL.get(url);
  if (!has) {
    var wsClient = createClient({
      url: url,
      shouldRetry: function shouldRetry() {
        return true;
      },
      webSocketImpl: IsomorphicWebSocket
    });
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
    obj.socket.dispose();
  }
}
//# sourceMappingURL=graphql-websocket.js.map