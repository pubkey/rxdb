"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getWebSocket = exports.WEBSOCKET_BY_URL = void 0;
exports.removeWebSocketRef = removeWebSocketRef;
exports.replicateWithWebsocketServer = void 0;

var _replication = require("../replication");

var _reconnectingWebsocket = _interopRequireDefault(require("reconnecting-websocket"));

var _isomorphicWs = require("isomorphic-ws");

var _util = require("../../util");

var _rxjs = require("rxjs");

var replicateWithWebsocketServer = function replicateWithWebsocketServer(options) {
  try {
    return Promise.resolve(getWebSocket(options.url)).then(function (socketState) {
      var wsClient = socketState.socket;
      var messages$ = new _rxjs.Subject();

      wsClient.onmessage = function (messageObj) {
        var message = JSON.parse(messageObj.data);
        messages$.next(message);
      };

      var requestCounter = 0;

      function getRequestId() {
        var count = requestCounter++;
        return options.collection.database.token + '|' + requestFlag + '|' + count;
      }

      var requestFlag = (0, _util.randomCouchString)(10);
      var streamRequest = {
        id: 'stream',
        collection: options.collection.name,
        method: 'masterChangeStream$',
        params: []
      };
      wsClient.send(JSON.stringify(streamRequest));
      var replicationState = (0, _replication.replicateRxCollection)({
        collection: options.collection,
        replicationIdentifier: 'websocket-' + options.url,
        pull: {
          batchSize: options.batchSize,
          stream$: messages$.pipe((0, _rxjs.filter)(function (msg) {
            return msg.id === 'stream' && msg.collection === options.collection.name;
          }), (0, _rxjs.map)(function (msg) {
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
              return Promise.resolve((0, _rxjs.firstValueFrom)(messages$.pipe((0, _rxjs.filter)(function (msg) {
                return msg.id === requestId;
              }), (0, _rxjs.map)(function (msg) {
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
            return (0, _rxjs.firstValueFrom)(messages$.pipe((0, _rxjs.filter)(function (msg) {
              return msg.id === requestId;
            }), (0, _rxjs.map)(function (msg) {
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

exports.replicateWithWebsocketServer = replicateWithWebsocketServer;

var getWebSocket = function getWebSocket(url) {
  try {
    var has = WEBSOCKET_BY_URL.get(url);

    if (!has) {
      var wsClient = new _reconnectingWebsocket["default"](url, undefined, {
        WebSocket: _isomorphicWs.WebSocket
      });
      var connect$ = new _rxjs.Subject();
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

exports.getWebSocket = getWebSocket;

/**
 * Reuse the same socket even when multiple
 * collection replicate with the same server at once.
 */
var WEBSOCKET_BY_URL = new Map();
exports.WEBSOCKET_BY_URL = WEBSOCKET_BY_URL;

function removeWebSocketRef(url) {
  var obj = (0, _util.getFromMapOrThrow)(WEBSOCKET_BY_URL, url);
  obj.refCount = obj.refCount - 1;

  if (obj.refCount === 0) {
    WEBSOCKET_BY_URL["delete"](url);
    obj.connect$.complete();
    obj.socket.close();
  }
}
//# sourceMappingURL=websocket-client.js.map