function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
import { rxStorageInstanceToReplicationHandler } from '../../replication-protocol';
import { PROMISE_RESOLVE_VOID } from '../../util';
import { Subject } from 'rxjs';
export function startSocketServer(options) {
  var _require = require('isomorphic-ws' + ''),
    WebSocketServer = _require.WebSocketServer;
  var wss = new WebSocketServer({
    port: options.port,
    path: options.path
  });
  var closed = false;
  function closeServer() {
    if (closed) {
      return PROMISE_RESOLVE_VOID;
    }
    closed = true;
    onConnection$.complete();
    return new Promise(function (res, rej) {
      /**
       * We have to close all client connections,
       * otherwise wss.close() will never call the callback.
       * @link https://github.com/websockets/ws/issues/1288#issuecomment-360594458
       */
      for (var _iterator = _createForOfIteratorHelperLoose(wss.clients), _step; !(_step = _iterator()).done;) {
        var ws = _step.value;
        ws.close();
      }
      wss.close(function (err) {
        if (err) {
          rej(err);
        } else {
          res();
        }
      });
    });
  }
  var onConnection$ = new Subject();
  wss.on('connection', function (ws) {
    return onConnection$.next(ws);
  });
  return {
    server: wss,
    close: closeServer,
    onConnection$: onConnection$.asObservable()
  };
}
export function startWebsocketServer(options) {
  var serverState = startSocketServer(options);
  var database = options.database;

  // auto close when the database gets destroyed
  database.onDestroy.push(function () {
    return serverState.close();
  });
  var replicationHandlerByCollection = new Map();
  function getReplicationHandler(collectionName) {
    if (!database.collections[collectionName]) {
      throw new Error('collection ' + collectionName + ' does not exist');
    }
    var handler = replicationHandlerByCollection.get(collectionName);
    if (!handler) {
      var collection = database.collections[collectionName];
      handler = rxStorageInstanceToReplicationHandler(collection.storageInstance, collection.conflictHandler, database.hashFunction);
      replicationHandlerByCollection.set(collectionName, handler);
    }
    return handler;
  }
  serverState.onConnection$.subscribe(function (ws) {
    var onCloseHandlers = [];
    ws.onclose = function () {
      onCloseHandlers.map(function (fn) {
        return fn();
      });
    };
    ws.on('message', function (messageString) {
      try {
        var message = JSON.parse(messageString);
        var handler = getReplicationHandler(message.collection);
        var method = handler[message.method];

        /**
         * If it is not a function,
         * it means that the client requested the masterChangeStream$
         */
        if (typeof method !== 'function') {
          var changeStreamSub = handler.masterChangeStream$.subscribe(function (ev) {
            var streamResponse = {
              id: 'stream',
              collection: message.collection,
              result: ev
            };
            ws.send(JSON.stringify(streamResponse));
          });
          onCloseHandlers.push(function () {
            return changeStreamSub.unsubscribe();
          });
          return Promise.resolve();
        }
        return Promise.resolve(method.apply(void 0, message.params)).then(function (result) {
          var response = {
            id: message.id,
            collection: message.collection,
            result: result
          };
          ws.send(JSON.stringify(response));
        });
      } catch (e) {
        return Promise.reject(e);
      }
    });
  });
  return serverState;
}
//# sourceMappingURL=websocket-server.js.map