import { createClient } from 'graphql-ws';
import { getFromMapOrThrow } from '../../plugins/utils';
import ws from 'isomorphic-ws';
var {
  WebSocket: IsomorphicWebSocket
} = ws;
export var GRAPHQL_WEBSOCKET_BY_URL = new Map();
export function getGraphQLWebSocket(url) {
  var has = GRAPHQL_WEBSOCKET_BY_URL.get(url);
  if (!has) {
    var wsClient = createClient({
      url,
      shouldRetry: () => true,
      webSocketImpl: IsomorphicWebSocket
    });
    has = {
      url,
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
    GRAPHQL_WEBSOCKET_BY_URL.delete(url);
    obj.socket.dispose();
  }
}
//# sourceMappingURL=graphql-websocket.js.map