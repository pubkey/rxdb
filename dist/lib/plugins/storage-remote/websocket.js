"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRxStorageRemoteWebsocket = getRxStorageRemoteWebsocket;
exports.startRxStorageRemoteWebsocketServer = startRxStorageRemoteWebsocketServer;
var _rxjs = require("rxjs");
var _util = require("../../util");
var _replicationWebsocket = require("../replication-websocket");
var _remote = require("./remote");
var _rxStorageRemote = require("./rx-storage-remote");
var _storageRemoteHelpers = require("./storage-remote-helpers");
function startRxStorageRemoteWebsocketServer(options) {
  var serverState = (0, _replicationWebsocket.startSocketServer)(options);
  var websocketByConnectionId = new Map();
  var messages$ = new _rxjs.Subject();
  var exposeSettings = {
    messages$: messages$.asObservable(),
    storage: options.storage,
    send: function send(msg) {
      var ws = (0, _util.getFromMapOrThrow)(websocketByConnectionId, msg.connectionId);
      ws.send(JSON.stringify(msg));
    }
  };
  var exposeState = (0, _remote.exposeRxStorageRemote)(exposeSettings);
  serverState.onConnection$.subscribe(function (ws) {
    var onCloseHandlers = [];
    ws.onclose = function () {
      onCloseHandlers.map(function (fn) {
        return fn();
      });
    };
    ws.on('message', function (messageString) {
      var message = JSON.parse(messageString);
      var connectionId = message.connectionId;
      if (!websocketByConnectionId.has(connectionId)) {
        /**
         * If first message is not 'create',
         * it is an error.
         */
        if (message.method !== 'create') {
          ws.send(JSON.stringify((0, _storageRemoteHelpers.createErrorAnswer)(message, 'First call must be a create call')));
          return;
        }
        websocketByConnectionId.set(connectionId, ws);
      }
      messages$.next(message);
    });
  });
  return {
    serverState: serverState,
    exposeState: exposeState
  };
}

/**
 * Reuse connections to the same url.
 * This makes testing easier because we do not run into a connection limit.
 * It might be better to instead track the amount of open storage instances
 * and open/close the websocket client depending on the counter.
 */
var WebsocketClientByUrl = new Map();
function getRxStorageRemoteWebsocket(options) {
  var identifier = options.url + 'rx-remote-storage-websocket';
  var messages$ = new _rxjs.Subject();
  var websocketClientPromise = WebsocketClientByUrl.has(options.url) ? (0, _util.getFromMapOrThrow)(WebsocketClientByUrl, options.url) : (0, _replicationWebsocket.getWebSocket)(options.url, identifier);
  WebsocketClientByUrl.set(options.url, websocketClientPromise);
  var storage = (0, _rxStorageRemote.getRxStorageRemote)({
    identifier: identifier,
    statics: options.statics,
    messages$: messages$,
    send: function send(msg) {
      return websocketClientPromise.then(function (websocketClient) {
        return websocketClient.socket.send(JSON.stringify(msg));
      });
    }
  });
  websocketClientPromise.then(function (websocketClient) {
    websocketClient.message$.subscribe(function (msg) {
      return messages$.next(msg);
    });
  });
  return storage;
}
//# sourceMappingURL=websocket.js.map