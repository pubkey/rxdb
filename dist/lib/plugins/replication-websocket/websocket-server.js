"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startSocketServer = startSocketServer;
exports.startWebsocketServer = startWebsocketServer;
var _replicationProtocol = require("../../replication-protocol");
var _utils = require("../../plugins/utils");
var _rxjs = require("rxjs");
function startSocketServer(options) {
  var {
    WebSocketServer
  } = require('isomorphic-ws' + '');
  var wss = new WebSocketServer({
    port: options.port,
    path: options.path
  });
  var closed = false;
  function closeServer() {
    if (closed) {
      return _utils.PROMISE_RESOLVE_VOID;
    }
    closed = true;
    onConnection$.complete();
    return new Promise((res, rej) => {
      /**
       * We have to close all client connections,
       * otherwise wss.close() will never call the callback.
       * @link https://github.com/websockets/ws/issues/1288#issuecomment-360594458
       */
      for (var ws of wss.clients) {
        ws.close();
      }
      wss.close(err => {
        if (err) {
          rej(err);
        } else {
          res();
        }
      });
    });
  }
  var onConnection$ = new _rxjs.Subject();
  wss.on('connection', ws => onConnection$.next(ws));
  return {
    server: wss,
    close: closeServer,
    onConnection$: onConnection$.asObservable()
  };
}
function startWebsocketServer(options) {
  var serverState = startSocketServer(options);
  var database = options.database;

  // auto close when the database gets destroyed
  database.onDestroy.push(() => serverState.close());
  var replicationHandlerByCollection = new Map();
  function getReplicationHandler(collectionName) {
    if (!database.collections[collectionName]) {
      throw new Error('collection ' + collectionName + ' does not exist');
    }
    var handler = replicationHandlerByCollection.get(collectionName);
    if (!handler) {
      var collection = database.collections[collectionName];
      handler = (0, _replicationProtocol.rxStorageInstanceToReplicationHandler)(collection.storageInstance, collection.conflictHandler, database.token);
      replicationHandlerByCollection.set(collectionName, handler);
    }
    return handler;
  }
  serverState.onConnection$.subscribe(ws => {
    var onCloseHandlers = [];
    ws.onclose = () => {
      onCloseHandlers.map(fn => fn());
    };
    ws.on('message', async messageString => {
      var message = JSON.parse(messageString);
      var handler = getReplicationHandler(message.collection);
      var method = handler[message.method];

      /**
       * If it is not a function,
       * it means that the client requested the masterChangeStream$
       */
      if (typeof method !== 'function') {
        var changeStreamSub = handler.masterChangeStream$.subscribe(ev => {
          var streamResponse = {
            id: 'stream',
            collection: message.collection,
            result: ev
          };
          ws.send(JSON.stringify(streamResponse));
        });
        onCloseHandlers.push(() => changeStreamSub.unsubscribe());
        return;
      }
      var result = await method(...message.params);
      var response = {
        id: message.id,
        collection: message.collection,
        result
      };
      ws.send(JSON.stringify(response));
    });
  });
  return serverState;
}
//# sourceMappingURL=websocket-server.js.map