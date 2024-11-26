import pkg from 'isomorphic-ws';
var {
  WebSocketServer
} = pkg;
import { rxStorageInstanceToReplicationHandler } from "../../replication-protocol/index.js";
import { PROMISE_RESOLVE_VOID, getFromMapOrCreate } from "../../plugins/utils/index.js";
import { Subject } from 'rxjs';
export function startSocketServer(options) {
  var wss = new WebSocketServer(options);
  var closed = false;
  function closeServer() {
    if (closed) {
      return PROMISE_RESOLVE_VOID;
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
  var onConnection$ = new Subject();
  wss.on('connection', ws => onConnection$.next(ws));
  return {
    server: wss,
    close: closeServer,
    onConnection$: onConnection$.asObservable()
  };
}
var REPLICATION_HANDLER_BY_COLLECTION = new Map();
export function getReplicationHandlerByCollection(database, collectionName) {
  if (!database.collections[collectionName]) {
    throw new Error('collection ' + collectionName + ' does not exist');
  }
  var collection = database.collections[collectionName];
  var handler = getFromMapOrCreate(REPLICATION_HANDLER_BY_COLLECTION, collection, () => {
    return rxStorageInstanceToReplicationHandler(collection.storageInstance, collection.conflictHandler, database.token);
  });
  return handler;
}
export function startWebsocketServer(options) {
  var {
    database,
    ...wsOptions
  } = options;
  var serverState = startSocketServer(wsOptions);

  // auto close when the database gets closed
  database.onClose.push(() => serverState.close());
  serverState.onConnection$.subscribe(ws => {
    var onCloseHandlers = [];
    ws.onclose = () => {
      onCloseHandlers.map(fn => fn());
    };
    ws.on('message', async messageString => {
      var message = JSON.parse(messageString);
      var handler = getReplicationHandlerByCollection(database, message.collection);
      if (message.method === 'auth') {
        return;
      }
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