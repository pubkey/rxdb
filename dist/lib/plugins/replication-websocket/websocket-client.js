"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createWebSocketClient = createWebSocketClient;
exports.ensureIsWebsocket = ensureIsWebsocket;
exports.replicateWithWebsocketServer = replicateWithWebsocketServer;
var _replication = require("../replication");
var _reconnectingWebsocket = _interopRequireDefault(require("reconnecting-websocket"));
var _isomorphicWs = _interopRequireDefault(require("isomorphic-ws"));
var _utils = require("../../plugins/utils");
var _rxjs = require("rxjs");
var _rxError = require("../../rx-error");
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
async function createWebSocketClient(url) {
  ensureIsWebsocket(_isomorphicWs.default);
  var wsClient = new _reconnectingWebsocket.default(url, [], {
    WebSocket: _isomorphicWs.default
  });
  var connected$ = new _rxjs.BehaviorSubject(false);
  await new Promise(res => {
    wsClient.onopen = () => {
      connected$.next(true);
      res();
    };
  });
  wsClient.onclose = () => {
    connected$.next(false);
  };
  var message$ = new _rxjs.Subject();
  wsClient.onmessage = messageObj => {
    var message = JSON.parse(messageObj.data);
    message$.next(message);
  };
  var error$ = new _rxjs.Subject();
  wsClient.onerror = err => {
    var emitError = (0, _rxError.newRxError)('RC_STREAM', {
      errors: (0, _utils.toArray)(err).map(er => (0, _utils.errorToPlainJson)(er)),
      direction: 'pull'
    });
    error$.next(emitError);
  };
  return {
    url,
    socket: wsClient,
    connected$,
    message$,
    error$
  };
}
async function replicateWithWebsocketServer(options) {
  var websocketClient = await createWebSocketClient(options.url);
  var wsClient = websocketClient.socket;
  var messages$ = websocketClient.message$;
  var requestCounter = 0;
  var requestFlag = (0, _utils.randomCouchString)(10);
  function getRequestId() {
    var count = requestCounter++;
    return options.collection.database.token + '|' + requestFlag + '|' + count;
  }
  var replicationState = (0, _replication.replicateRxCollection)({
    collection: options.collection,
    replicationIdentifier: 'websocket-' + options.url,
    live: options.live,
    pull: {
      batchSize: options.batchSize,
      stream$: messages$.pipe((0, _rxjs.filter)(msg => msg.id === 'stream' && msg.collection === options.collection.name), (0, _rxjs.map)(msg => msg.result)),
      async handler(lastPulledCheckpoint, batchSize) {
        var requestId = getRequestId();
        var request = {
          id: requestId,
          collection: options.collection.name,
          method: 'masterChangesSince',
          params: [lastPulledCheckpoint, batchSize]
        };
        wsClient.send(JSON.stringify(request));
        var result = await (0, _rxjs.firstValueFrom)(messages$.pipe((0, _rxjs.filter)(msg => msg.id === requestId), (0, _rxjs.map)(msg => msg.result)));
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
        return (0, _rxjs.firstValueFrom)(messages$.pipe((0, _rxjs.filter)(msg => msg.id === requestId), (0, _rxjs.map)(msg => msg.result)));
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
  options.collection.onDestroy.push(() => websocketClient.socket.close());
  return replicationState;
}
//# sourceMappingURL=websocket-client.js.map