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
function getGraphQLWebSocket(url) {
  var has = GRAPHQL_WEBSOCKET_BY_URL.get(url);
  if (!has) {
    var wsClient = (0, _graphqlWs.createClient)({
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
function removeGraphQLWebSocketRef(url) {
  var obj = (0, _utils.getFromMapOrThrow)(GRAPHQL_WEBSOCKET_BY_URL, url);
  obj.refCount = obj.refCount - 1;
  if (obj.refCount === 0) {
    GRAPHQL_WEBSOCKET_BY_URL.delete(url);
    obj.socket.dispose();
  }
}
//# sourceMappingURL=graphql-websocket.js.map