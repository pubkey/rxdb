import { replicateRxCollection } from "../replication/index.js";
import ReconnectingWebSocket from 'reconnecting-websocket';
import IsomorphicWebSocket from 'isomorphic-ws';
import { errorToPlainJson, randomToken, toArray } from "../../plugins/utils/index.js";
import { filter, map, Subject, firstValueFrom, BehaviorSubject } from 'rxjs';
import { newRxError } from "../../rx-error.js";
/**
 * Copied and adapted from the 'reconnecting-websocket' npm module.
 * Some bundlers have problems with bundling the isomorphic-ws plugin
 * so we directly check the correctness in RxDB to ensure that we can
 * throw a helpful error.
 */
export function ensureIsWebsocket(w) {
  var is = typeof w !== 'undefined' && !!w && w.CLOSING === 2;
  if (!is) {
    console.dir(w);
    throw new Error('websocket not valid');
  }
}
export async function createWebSocketClient(options) {
  ensureIsWebsocket(IsomorphicWebSocket);
  var wsClient = new ReconnectingWebSocket(options.url, [], {
    WebSocket: IsomorphicWebSocket
  });
  var connected$ = new BehaviorSubject(false);
  var message$ = new Subject();
  var error$ = new Subject();
  wsClient.onerror = err => {
    console.log('--- WAS CLIENT GOT ERROR:');
    console.log(err.error.message);
    var emitError = newRxError('RC_STREAM', {
      errors: toArray(err).map(er => errorToPlainJson(er)),
      direction: 'pull'
    });
    error$.next(emitError);
  };
  await new Promise(res => {
    wsClient.onopen = () => {
      if (options.headers) {
        var authMessage = {
          collection: options.collection.name,
          id: randomToken(10),
          params: [options.headers],
          method: 'auth'
        };
        wsClient.send(JSON.stringify(authMessage));
      }
      connected$.next(true);
      res();
    };
  });
  wsClient.onclose = () => {
    connected$.next(false);
  };
  wsClient.onmessage = messageObj => {
    var message = JSON.parse(messageObj.data);
    message$.next(message);
  };
  return {
    url: options.url,
    socket: wsClient,
    connected$,
    message$,
    error$
  };
}
export async function replicateWithWebsocketServer(options) {
  var websocketClient = await createWebSocketClient(options);
  var wsClient = websocketClient.socket;
  var messages$ = websocketClient.message$;
  var requestCounter = 0;
  var requestFlag = randomToken(10);
  function getRequestId() {
    var count = requestCounter++;
    return options.collection.database.token + '|' + requestFlag + '|' + count;
  }
  var replicationState = replicateRxCollection({
    collection: options.collection,
    replicationIdentifier: options.replicationIdentifier,
    live: options.live,
    pull: {
      batchSize: options.batchSize,
      stream$: messages$.pipe(filter(msg => msg.id === 'stream' && msg.collection === options.collection.name), map(msg => msg.result)),
      async handler(lastPulledCheckpoint, batchSize) {
        var requestId = getRequestId();
        var request = {
          id: requestId,
          collection: options.collection.name,
          method: 'masterChangesSince',
          params: [lastPulledCheckpoint, batchSize]
        };
        wsClient.send(JSON.stringify(request));
        var result = await firstValueFrom(messages$.pipe(filter(msg => msg.id === requestId), map(msg => msg.result)));
        return result;
      }
    },
    push: {
      batchSize: options.batchSize,
      handler(docs) {
        var requestId = getRequestId();
        var request = {
          id: requestId,
          collection: options.collection.name,
          method: 'masterWrite',
          params: [docs]
        };
        wsClient.send(JSON.stringify(request));
        return firstValueFrom(messages$.pipe(filter(msg => msg.id === requestId), map(msg => msg.result)));
      }
    }
  });
  websocketClient.error$.subscribe(err => replicationState.subjects.error.next(err));
  websocketClient.connected$.subscribe(isConnected => {
    if (isConnected) {
      /**
       * When the client goes offline and online again,
       * we have to send a 'RESYNC' signal because the client
       * might have missed out events while being offline.
       */
      replicationState.reSync();

      /**
       * Because reconnecting creates a new websocket-instance,
       * we have to start the changestream from the remote again
       * each time.
       */
      var streamRequest = {
        id: 'stream',
        collection: options.collection.name,
        method: 'masterChangeStream$',
        params: []
      };
      wsClient.send(JSON.stringify(streamRequest));
    }
  });
  options.collection.onClose.push(() => websocketClient.socket.close());
  return replicationState;
}
//# sourceMappingURL=websocket-client.js.map