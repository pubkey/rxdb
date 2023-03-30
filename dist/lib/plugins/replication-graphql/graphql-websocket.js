"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GRAPHQL_WEBSOCKET_BY_URL = void 0;
exports.getGraphQLWebSocket = getGraphQLWebSocket;
exports.removeGraphQLWebSocketRef = removeGraphQLWebSocketRef;
var _graphqlWs = require("graphql-ws");
var _utils = require("../../plugins/utils");
var _isomorphicWs = _interopRequireDefault(require("isomorphic-ws"));
var {
  WebSocket: IsomorphicWebSocket
} = _isomorphicWs.default;
var GRAPHQL_WEBSOCKET_BY_URL = new Map();
exports.GRAPHQL_WEBSOCKET_BY_URL = GRAPHQL_WEBSOCKET_BY_URL;
function getGraphQLWebSocket(url, headers) {
  var has = (0, _utils.getFromMapOrCreate)(GRAPHQL_WEBSOCKET_BY_URL, url, () => {
    var wsClient = (0, _graphqlWs.createClient)({
      url,
      shouldRetry: () => true,
      webSocketImpl: IsomorphicWebSocket,
      connectionParams: headers ? {
        headers
      } : undefined
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
  var obj = (0, _utils.getFromMapOrThrow)(GRAPHQL_WEBSOCKET_BY_URL, url);
  obj.refCount = obj.refCount - 1;
  if (obj.refCount === 0) {
    GRAPHQL_WEBSOCKET_BY_URL.delete(url);
    obj.socket.dispose();
  }
}
//# sourceMappingURL=graphql-websocket.js.map