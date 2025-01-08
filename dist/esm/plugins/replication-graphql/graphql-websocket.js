import { createClient } from 'graphql-ws';
import { getFromMapOrCreate, getFromMapOrThrow } from "../../plugins/utils/index.js";
import ws from 'isomorphic-ws';
var {
  WebSocket: IsomorphicWebSocket
} = ws;
export var GRAPHQL_WEBSOCKET_BY_URL = new Map();
export function getGraphQLWebSocket(url, headers, options = {}) {
  var has = getFromMapOrCreate(GRAPHQL_WEBSOCKET_BY_URL, url, () => {
    var connectionParamsHeaders = headers ? {
      headers
    } : undefined;
    var wsClient = createClient({
      ...options,
      url,
      shouldRetry: () => true,
      webSocketImpl: IsomorphicWebSocket,
      connectionParams: options.connectionParams || connectionParamsHeaders
    });
    return {
      url,
      socket: wsClient,
      refCount: 1
    };
  }, value => {
    value.refCount = value.refCount + 1;
  });
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