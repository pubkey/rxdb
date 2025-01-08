"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GRAPHQL_WEBSOCKET_BY_URL = void 0;
exports.getGraphQLWebSocket = getGraphQLWebSocket;
exports.removeGraphQLWebSocketRef = removeGraphQLWebSocketRef;
var _graphqlWs = require("graphql-ws");
var _index = require("../../plugins/utils/index.js");
var _isomorphicWs = _interopRequireDefault(require("isomorphic-ws"));
var {
  WebSocket: IsomorphicWebSocket
} = _isomorphicWs.default;
var GRAPHQL_WEBSOCKET_BY_URL = exports.GRAPHQL_WEBSOCKET_BY_URL = new Map();
function getGraphQLWebSocket(url, headers, options = {}) {
  var has = (0, _index.getFromMapOrCreate)(GRAPHQL_WEBSOCKET_BY_URL, url, () => {
    var connectionParamsHeaders = headers ? {
      headers
    } : undefined;
    var wsClient = (0, _graphqlWs.createClient)({
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
function removeGraphQLWebSocketRef(url) {
  var obj = (0, _index.getFromMapOrThrow)(GRAPHQL_WEBSOCKET_BY_URL, url);
  obj.refCount = obj.refCount - 1;
  if (obj.refCount === 0) {
    GRAPHQL_WEBSOCKET_BY_URL.delete(url);
    obj.socket.dispose();
  }
}
//# sourceMappingURL=graphql-websocket.js.map