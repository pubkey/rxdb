"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createWebSocketClient = createWebSocketClient;
exports.ensureIsWebsocket = ensureIsWebsocket;
exports.replicateWithWebsocketServer = replicateWithWebsocketServer;
var _index = require("../replication/index.js");
var _reconnectingWebsocket = _interopRequireDefault(require("reconnecting-websocket"));
var _isomorphicWs = _interopRequireDefault(require("isomorphic-ws"));
var _index2 = require("../../plugins/utils/index.js");
var _rxjs = require("rxjs");
var _rxError = require("../../rx-error.js");
/**
 * Copied and adapted from the 'reconnecting-websocket' npm module.
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
async function createWebSocketClient(options) {
  ensureIsWebsocket(_isomorphicWs.default);
  var wsClient = new _reconnectingWebsocket.default(options.url, [], {
    WebSocket: _isomorphicWs.default
  });
  var connected$ = new _rxjs.BehaviorSubject(false);
  var message$ = new _rxjs.Subject();
  var error$ = new _rxjs.Subject();
  wsClient.onerror = err => {
    console.log('--- WAS CLIENT GOT ERROR:');
    console.log(err.error.message);
    var emitError = (0, _rxError.newRxError)('RC_STREAM', {
      errors: (0, _index2.toArray)(err).map(er => (0, _index2.errorToPlainJson)(er)),
      direction: 'pull'
    });
    error$.next(emitError);
  };
  await new Promise(res => {
    wsClient.onopen = () => {
      if (options.headers) {
        var authMessage = {
          collection: options.collection.name,
          id: (0, _index2.randomToken)(10),
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
async function replicateWithWebsocketServer(options) {
  var websocketClient = await createWebSocketClient(options);
  var wsClient = websocketClient.socket;
  var messages$ = websocketClient.message$;
  var requestCounter = 0;
  var requestFlag = (0, _index2.randomToken)(10);
  function getRequestId() {
    var count = requestCounter++;
    return options.collection.database.token + '|' + requestFlag + '|' + count;
  }
  var replicationState = (0, _index.replicateRxCollection)({
    collection: options.collection,
    replicationIdentifier: options.replicationIdentifier,
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
  options.collection.onClose.push(() => websocketClient.socket.close());
  return replicationState;
}
//# sourceMappingURL=websocket-client.js.map