import { Subject } from 'rxjs';
import { getFromMapOrThrow } from '../../plugins/utils';
import { getWebSocket, startSocketServer } from '../replication-websocket';
import { exposeRxStorageRemote } from '../storage-remote/remote';
import { getRxStorageRemote } from '../storage-remote/rx-storage-remote';
import { createErrorAnswer } from '../storage-remote/storage-remote-helpers';
export function startRxStorageRemoteWebsocketServer(options) {
  var serverState = startSocketServer(options);
  var websocketByConnectionId = new Map();
  var messages$ = new Subject();
  var exposeSettings = {
    messages$: messages$.asObservable(),
    storage: options.storage,
    send(msg) {
      var ws = getFromMapOrThrow(websocketByConnectionId, msg.connectionId);
      ws.send(JSON.stringify(msg));
    }
  };
  var exposeState = exposeRxStorageRemote(exposeSettings);
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
          ws.send(JSON.stringify(createErrorAnswer(message, new Error('First call must be a create call but is: ' + JSON.stringify(message)))));
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
export function getRxStorageRemoteWebsocket(options) {
  var identifier = options.url + 'rx-remote-storage-websocket';
  var messages$ = new Subject();
  var websocketClientPromise = WebsocketClientByUrl.has(options.url) ? getFromMapOrThrow(WebsocketClientByUrl, options.url) : getWebSocket(options.url, identifier);
  WebsocketClientByUrl.set(options.url, websocketClientPromise);
  var storage = getRxStorageRemote({
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
export * from './types';
//# sourceMappingURL=index.js.map