import { replicateRxCollection } from '../replication';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { WebSocket as IsomorphicWebSocket } from 'isomorphic-ws';
import { getFromMapOrThrow, randomCouchString } from '../../util';
import { filter, map, Subject, firstValueFrom, BehaviorSubject } from 'rxjs';
import { newRxError } from '../../rx-error';
export var replicateWithWebsocketServer = function replicateWithWebsocketServer(options) {
  try {
    return Promise.resolve(getWebSocket(options.url, options.collection.database)).then(function (socketState) {
      var wsClient = socketState.socket;
      var messages$ = socketState.message$;
      var requestCounter = 0;

      function getRequestId() {
        var count = requestCounter++;
        return options.collection.database.token + '|' + requestFlag + '|' + count;
      }

      var requestFlag = randomCouchString(10);
      var replicationState = replicateRxCollection({
        collection: options.collection,
        replicationIdentifier: 'websocket-' + options.url,
        pull: {
          batchSize: options.batchSize,
          stream$: messages$.pipe(filter(function (msg) {
            return msg.id === 'stream' && msg.collection === options.collection.name;
          }), map(function (msg) {
            return msg.result;
          })),
          handler: function handler(lastPulledCheckpoint, batchSize) {
            try {
              var requestId = getRequestId();
              var request = {
                id: requestId,
                collection: options.collection.name,
                method: 'masterChangesSince',
                params: [lastPulledCheckpoint, batchSize]
              };
              wsClient.send(JSON.stringify(request));
              return Promise.resolve(firstValueFrom(messages$.pipe(filter(function (msg) {
                return msg.id === requestId;
              }), map(function (msg) {
                return msg.result;
              }))));
            } catch (e) {
              return Promise.reject(e);
            }
          }
        },
        push: {
          batchSize: options.batchSize,
          handler: function handler(docs) {
            var requestId = getRequestId();
            var request = {
              id: requestId,
              collection: options.collection.name,
              method: 'masterWrite',
              params: [docs]
            };
            wsClient.send(JSON.stringify(request));
            return firstValueFrom(messages$.pipe(filter(function (msg) {
              return msg.id === requestId;
            }), map(function (msg) {
              return msg.result;
            })));
          }
        }
      });
      socketState.error$.subscribe(function (err) {
        return replicationState.subjects.error.next(err);
      });
      socketState.connected$.subscribe(function (isConnected) {
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
      options.collection.onDestroy.push(function () {
        return removeWebSocketRef(options.url, options.collection.database);
      });
      return replicationState;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export var getWebSocket = function getWebSocket(url, database) {
  try {
    /**
     * Also use the database token as cache-key
     * to make it easier to test and debug
     * multi-instance setups.
     */
    var cacheKey = url + '|||' + database.token;
    var has = WEBSOCKET_BY_CACHE_KEY.get(cacheKey);

    if (!has) {
      var wsClient = new ReconnectingWebSocket(url, [], {
        WebSocket: IsomorphicWebSocket
      });
      var connected$ = new BehaviorSubject(false);
      var openPromise = new Promise(function (res) {
        wsClient.onopen = function () {
          connected$.next(true);
          res();
        };
      });

      wsClient.onclose = function () {
        connected$.next(false);
      };

      var message$ = new Subject();

      wsClient.onmessage = function (messageObj) {
        var message = JSON.parse(messageObj.data);
        message$.next(message);
      };

      var error$ = new Subject();

      wsClient.onerror = function (err) {
        var emitError = newRxError('RC_STREAM', {
          errors: Array.isArray(err) ? err : [err],
          direction: 'pull'
        });
        error$.next(emitError);
      };

      has = {
        url: url,
        socket: wsClient,
        openPromise: openPromise,
        refCount: 1,
        connected$: connected$,
        message$: message$,
        error$: error$
      };
      WEBSOCKET_BY_CACHE_KEY.set(cacheKey, has);
    } else {
      has.refCount = has.refCount + 1;
    }

    return Promise.resolve(has.openPromise).then(function () {
      return has;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Reuse the same socket even when multiple
 * collection replicate with the same server at once.
 */
export var WEBSOCKET_BY_CACHE_KEY = new Map();
export function removeWebSocketRef(url, database) {
  var cacheKey = url + '|||' + database.token;
  var obj = getFromMapOrThrow(WEBSOCKET_BY_CACHE_KEY, cacheKey);
  obj.refCount = obj.refCount - 1;

  if (obj.refCount === 0) {
    WEBSOCKET_BY_CACHE_KEY["delete"](cacheKey);
    obj.connected$.complete();
    obj.socket.close();
  }
}
//# sourceMappingURL=websocket-client.js.map