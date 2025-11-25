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
var _index = require("../../plugins/utils/index.js");
var _index2 = require("../replication-websocket/index.js");
var _remote = require("../storage-remote/remote.js");
var _rxStorageRemote = require("../storage-remote/rx-storage-remote.js");
var _storageRemoteHelpers = require("../storage-remote/storage-remote-helpers.js");
var _types = require("./types.js");
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
  options.perMessageDeflate = true;
  var serverState = (0, _index2.startSocketServer)(options);
  var websocketByConnectionId = new Map();
  var messages$ = new _rxjs.Subject();
  var exposeSettings = {
    messages$: messages$.asObservable(),
    storage: options.storage,
    database: options.database,
    customRequestHandler: options.customRequestHandler,
    send(msg) {
      var ws = (0, _index.getFromMapOrThrow)(websocketByConnectionId, msg.connectionId);
      ws.send(JSON.stringify(msg));
    },
    fakeVersion: options.fakeVersion
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
        if (message.method !== 'create' && message.method !== 'custom') {
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
function getRxStorageRemoteWebsocket(options) {
  var identifier = [options.url, 'rx-remote-storage-websocket'].join('');
  var storage = (0, _rxStorageRemote.getRxStorageRemote)({
    identifier,
    mode: options.mode,
    async messageChannelCreator() {
      var messages$ = new _rxjs.Subject();
      var websocketClient = await (0, _index2.createWebSocketClient)(options);
      websocketClient.message$.subscribe(msg => messages$.next(msg));
      return {
        messages$,
        send(msg) {
          return websocketClient.socket.send(JSON.stringify(msg));
        },
        close() {
          websocketClient.socket.close();
          return _index.PROMISE_RESOLVE_VOID;
        }
      };
    }
  });
  return storage;
}
//# sourceMappingURL=index.js.map