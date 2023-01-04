"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  startRxStorageRemoteWebsocketServer: true,
  getRxStorageRemoteWebsocket: true
};
exports.getRxStorageRemoteWebsocket = getRxStorageRemoteWebsocket;
exports.startRxStorageRemoteWebsocketServer = startRxStorageRemoteWebsocketServer;
var _rxjs = require("rxjs");
var _utils = require("../../plugins/utils");
var _replicationWebsocket = require("../replication-websocket");
var _remote = require("../storage-remote/remote");
var _rxStorageRemote = require("../storage-remote/rx-storage-remote");
var _storageRemoteHelpers = require("../storage-remote/storage-remote-helpers");
var _types = require("./types");
Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _types[key];
    }
  });
});
function startRxStorageRemoteWebsocketServer(options) {
  var serverState = (0, _replicationWebsocket.startSocketServer)(options);
  var websocketByConnectionId = new Map();
  var messages$ = new _rxjs.Subject();
  var exposeSettings = {
    messages$: messages$.asObservable(),
    storage: options.storage,
    send(msg) {
      var ws = (0, _utils.getFromMapOrThrow)(websocketByConnectionId, msg.connectionId);
      ws.send(JSON.stringify(msg));
    }
  };
  var exposeState = (0, _remote.exposeRxStorageRemote)(exposeSettings);
  serverState.onConnection$.subscribe(ws => {
    var onCloseHandlers = [];
    ws.onclose = () => {
      onCloseHandlers.map(fn => fn());
    };
    ws.on('message', messageString => {
      var message = JSON.parse(messageString);
      var connectionId = message.connectionId;
      if (!websocketByConnectionId.has(connectionId)) {
        /**
         * If first message is not 'create',
         * it is an error.
         */
        if (message.method !== 'create') {
          ws.send(JSON.stringify((0, _storageRemoteHelpers.createErrorAnswer)(message, new Error('First call must be a create call but is: ' + JSON.stringify(message)))));
          return;
        }
        websocketByConnectionId.set(connectionId, ws);
      }
      messages$.next(message);
    });
  });
  return {
    serverState,
    exposeState
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
  var websocketClientPromise = WebsocketClientByUrl.has(options.url) ? (0, _utils.getFromMapOrThrow)(WebsocketClientByUrl, options.url) : (0, _replicationWebsocket.getWebSocket)(options.url, identifier);
  WebsocketClientByUrl.set(options.url, websocketClientPromise);
  var storage = (0, _rxStorageRemote.getRxStorageRemote)({
    identifier,
    statics: options.statics,
    messages$,
    send(msg) {
      return websocketClientPromise.then(websocketClient => websocketClient.socket.send(JSON.stringify(msg)));
    }
  });
  websocketClientPromise.then(websocketClient => {
    websocketClient.message$.subscribe(msg => messages$.next(msg));
  });
  return storage;
}
//# sourceMappingURL=index.js.map