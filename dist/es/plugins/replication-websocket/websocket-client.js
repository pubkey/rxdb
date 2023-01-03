import { replicateRxCollection } from '../replication';
import ReconnectingWebSocket from 'reconnecting-websocket';
import IsomorphicWebSocket from 'isomorphic-ws';
import { errorToPlainJson, getFromMapOrThrow, randomCouchString, toArray } from '../../plugins/utils';
import { filter, map, Subject, firstValueFrom, BehaviorSubject } from 'rxjs';
import { newRxError } from '../../rx-error';
/**
 * Copied and adapter from the 'reconnecting-websocket' npm module.
 * Some bundlers have problems with bundling the isomorphic-ws plugin
 * so we directly check the correctness in RxDB to ensure that we can
 * throw a helpful error.
 */
function ensureIsWebsocket(w) {
  var is = typeof w !== 'undefined' && !!w && w.CLOSING === 2;
  if (!is) {
    console.dir(w);
    throw new Error('websocket not valid');
  }
}

/**
 * Reuse the same socket even when multiple
 * collection replicate with the same server at once.
 */
export var WEBSOCKET_BY_CACHE_KEY = new Map();
export async function getWebSocket(url,
/**
 * The value of RxDatabase.token.
 */
databaseToken) {
  /**
   * Also use the database token as cache-key
   * to make it easier to test and debug
   * multi-instance setups.
   */
  var cacheKey = url + '|||' + databaseToken;
  var has = WEBSOCKET_BY_CACHE_KEY.get(cacheKey);
  if (!has) {
    ensureIsWebsocket(IsomorphicWebSocket);
    var wsClient = new ReconnectingWebSocket(url, [], {
      WebSocket: IsomorphicWebSocket
    });
    var connected$ = new BehaviorSubject(false);
    var openPromise = new Promise(res => {
      wsClient.onopen = () => {
        connected$.next(true);
        res();
      };
    });
    wsClient.onclose = () => {
      connected$.next(false);
    };
    var message$ = new Subject();
    wsClient.onmessage = messageObj => {
      var message = JSON.parse(messageObj.data);
      message$.next(message);
    };
    var error$ = new Subject();
    wsClient.onerror = err => {
      var emitError = newRxError('RC_STREAM', {
        errors: toArray(err).map(er => errorToPlainJson(er)),
        direction: 'pull'
      });
      error$.next(emitError);
    };
    has = {
      url,
      socket: wsClient,
      openPromise,
      refCount: 1,
      connected$,
      message$,
      error$
    };
    WEBSOCKET_BY_CACHE_KEY.set(cacheKey, has);
  } else {
    has.refCount = has.refCount + 1;
  }
  await has.openPromise;
  return has;
}
export function removeWebSocketRef(url, database) {
  var cacheKey = url + '|||' + database.token;
  var obj = getFromMapOrThrow(WEBSOCKET_BY_CACHE_KEY, cacheKey);
  obj.refCount = obj.refCount - 1;
  if (obj.refCount === 0) {
    WEBSOCKET_BY_CACHE_KEY.delete(cacheKey);
    obj.connected$.complete();
    obj.socket.close();
  }
}
export async function replicateWithWebsocketServer(options) {
  var socketState = await getWebSocket(options.url, options.collection.database.token);
  var wsClient = socketState.socket;
  var messages$ = socketState.message$;
  var requestCounter = 0;
  var requestFlag = randomCouchString(10);
  function getRequestId() {
    var count = requestCounter++;
    return options.collection.database.token + '|' + requestFlag + '|' + count;
  }
  var replicationState = replicateRxCollection({
    collection: options.collection,
    replicationIdentifier: 'websocket-' + options.url,
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
  socketState.error$.subscribe(err => replicationState.subjects.error.next(err));
  socketState.connected$.subscribe(isConnected => {
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
  options.collection.onDestroy.push(() => removeWebSocketRef(options.url, options.collection.database));
  return replicationState;
}
//# sourceMappingURL=websocket-client.js.map