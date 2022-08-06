"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GRAPHQL_WEBSOCKET_BY_URL = void 0;
exports.getGraphQLWebSocket = getGraphQLWebSocket;
exports.removeGraphQLWebSocketRef = removeGraphQLWebSocketRef;

var _subscriptionsTransportWs = require("subscriptions-transport-ws");

var _util = require("../../util");

var _isomorphicWs = require("isomorphic-ws");

var GRAPHQL_WEBSOCKET_BY_URL = new Map();
exports.GRAPHQL_WEBSOCKET_BY_URL = GRAPHQL_WEBSOCKET_BY_URL;

function getGraphQLWebSocket(url) {
  var has = GRAPHQL_WEBSOCKET_BY_URL.get(url);

  if (!has) {
    var wsClient = new _subscriptionsTransportWs.SubscriptionClient(url, {
      reconnect: true
    }, _isomorphicWs.WebSocket);
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

function removeGraphQLWebSocketRef(url) {
  console.log('removeGraphQLWebSocketRef: ' + url);
  var obj = (0, _util.getFromMapOrThrow)(GRAPHQL_WEBSOCKET_BY_URL, url);
  obj.refCount = obj.refCount - 1;
  console.log('obj.refCount: ' + obj.refCount);

  if (obj.refCount === 0) {
    GRAPHQL_WEBSOCKET_BY_URL["delete"](url);
    obj.socket.close();
  }
}
//# sourceMappingURL=graphql-websocket.js.map