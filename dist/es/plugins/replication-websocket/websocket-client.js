import { replicateRxCollection } from '../replication';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { WebSocket as IsomorphicWebSocket } from 'isomorphic-ws';
import { getFromMapOrThrow, randomCouchString } from '../../util';
import { filter, map, Subject, firstValueFrom } from 'rxjs';
export var replicateWithWebsocketServer = function replicateWithWebsocketServer(options) {
  try {
    return Promise.resolve(getWebSocket(options.url)).then(function (socketState) {
      var wsClient = socketState.socket;
      var messages$ = new Subject();

      wsClient.onmessage = function (messageObj) {
        var message = JSON.parse(messageObj.data);
        messages$.next(message);
      };

      var requestCounter = 0;

      function getRequestId() {
        var count = requestCounter++;
        return options.collection.database.token + '|' + requestFlag + '|' + count;
      }

      var requestFlag = randomCouchString(10);
      var streamRequest = {
        id: 'stream',
        collection: options.collection.name,
        method: 'masterChangeStream$',
        params: []
      };
      wsClient.send(JSON.stringify(streamRequest));
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
      /**
       * When the client goes offline and online again,
       * we have to send a 'RESYNC' signal because the client
       * might have missed out events while being offline.
       */

      socketState.connect$.subscribe(function () {
        replicationState.reSync();
      });
      return replicationState;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export var getWebSocket = function getWebSocket(url) {
  try {
    var has = WEBSOCKET_BY_URL.get(url);

    if (!has) {
      var wsClient = new ReconnectingWebSocket(url, undefined, {
        WebSocket: IsomorphicWebSocket
      });
      var connect$ = new Subject();
      var openPromise = new Promise(function (res) {
        wsClient.onopen = function () {
          connect$.next();
          res();
        };
      });
      has = {
        url: url,
        socket: wsClient,
        openPromise: openPromise,
        refCount: 1,
        connect$: connect$
      };
      WEBSOCKET_BY_URL.set(url, has);
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
export var WEBSOCKET_BY_URL = new Map();
export function removeWebSocketRef(url) {
  var obj = getFromMapOrThrow(WEBSOCKET_BY_URL, url);
  obj.refCount = obj.refCount - 1;

  if (obj.refCount === 0) {
    WEBSOCKET_BY_URL["delete"](url);
    obj.connect$.complete();
    obj.socket.close();
  }
}
//# sourceMappingURL=websocket-client.js.map