"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WEBSOCKET_BY_CACHE_KEY = void 0;
exports.getWebSocket = getWebSocket;
exports.removeWebSocketRef = removeWebSocketRef;
exports.replicateWithWebsocketServer = replicateWithWebsocketServer;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _replication = require("../replication");
var _reconnectingWebsocket = _interopRequireDefault(require("reconnecting-websocket"));
var _isomorphicWs = _interopRequireDefault(require("isomorphic-ws"));
var _util = require("../../util");
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

/**
 * Reuse the same socket even when multiple
 * collection replicate with the same server at once.
 */
var WEBSOCKET_BY_CACHE_KEY = new Map();
exports.WEBSOCKET_BY_CACHE_KEY = WEBSOCKET_BY_CACHE_KEY;
function getWebSocket(_x, _x2) {
  return _getWebSocket.apply(this, arguments);
}
function _getWebSocket() {
  _getWebSocket = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(url,
  /**
   * The value of RxDatabase.token.
   */
  databaseToken) {
    var cacheKey, has, wsClient, connected$, openPromise, message$, error$;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          /**
           * Also use the database token as cache-key
           * to make it easier to test and debug
           * multi-instance setups.
           */
          cacheKey = url + '|||' + databaseToken;
          has = WEBSOCKET_BY_CACHE_KEY.get(cacheKey);
          if (!has) {
            ensureIsWebsocket(_isomorphicWs["default"]);
            wsClient = new _reconnectingWebsocket["default"](url, [], {
              WebSocket: _isomorphicWs["default"]
            });
            connected$ = new _rxjs.BehaviorSubject(false);
            openPromise = new Promise(function (res) {
              wsClient.onopen = function () {
                connected$.next(true);
                res();
              };
            });
            wsClient.onclose = function () {
              connected$.next(false);
            };
            message$ = new _rxjs.Subject();
            wsClient.onmessage = function (messageObj) {
              var message = JSON.parse(messageObj.data);
              message$.next(message);
            };
            error$ = new _rxjs.Subject();
            wsClient.onerror = function (err) {
              var emitError = (0, _rxError.newRxError)('RC_STREAM', {
                errors: (0, _util.toArray)(err).map(function (er) {
                  return (0, _util.errorToPlainJson)(er);
                }),
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
          _context.next = 5;
          return has.openPromise;
        case 5:
          return _context.abrupt("return", has);
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _getWebSocket.apply(this, arguments);
}
function removeWebSocketRef(url, database) {
  var cacheKey = url + '|||' + database.token;
  var obj = (0, _util.getFromMapOrThrow)(WEBSOCKET_BY_CACHE_KEY, cacheKey);
  obj.refCount = obj.refCount - 1;
  if (obj.refCount === 0) {
    WEBSOCKET_BY_CACHE_KEY["delete"](cacheKey);
    obj.connected$.complete();
    obj.socket.close();
  }
}
function replicateWithWebsocketServer(_x3) {
  return _replicateWithWebsocketServer.apply(this, arguments);
}
function _replicateWithWebsocketServer() {
  _replicateWithWebsocketServer = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(options) {
    var socketState, wsClient, messages$, requestCounter, requestFlag, getRequestId, replicationState;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          getRequestId = function _getRequestId() {
            var count = requestCounter++;
            return options.collection.database.token + '|' + requestFlag + '|' + count;
          };
          _context3.next = 3;
          return getWebSocket(options.url, options.collection.database.token);
        case 3:
          socketState = _context3.sent;
          wsClient = socketState.socket;
          messages$ = socketState.message$;
          requestCounter = 0;
          requestFlag = (0, _util.randomCouchString)(10);
          replicationState = (0, _replication.replicateRxCollection)({
            collection: options.collection,
            replicationIdentifier: 'websocket-' + options.url,
            live: options.live,
            pull: {
              batchSize: options.batchSize,
              stream$: messages$.pipe((0, _rxjs.filter)(function (msg) {
                return msg.id === 'stream' && msg.collection === options.collection.name;
              }), (0, _rxjs.map)(function (msg) {
                return msg.result;
              })),
              handler: function () {
                var _handler = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(lastPulledCheckpoint, batchSize) {
                  var requestId, request, result;
                  return _regenerator["default"].wrap(function _callee2$(_context2) {
                    while (1) switch (_context2.prev = _context2.next) {
                      case 0:
                        requestId = getRequestId();
                        request = {
                          id: requestId,
                          collection: options.collection.name,
                          method: 'masterChangesSince',
                          params: [lastPulledCheckpoint, batchSize]
                        };
                        wsClient.send(JSON.stringify(request));
                        _context2.next = 5;
                        return (0, _rxjs.firstValueFrom)(messages$.pipe((0, _rxjs.filter)(function (msg) {
                          return msg.id === requestId;
                        }), (0, _rxjs.map)(function (msg) {
                          return msg.result;
                        })));
                      case 5:
                        result = _context2.sent;
                        return _context2.abrupt("return", result);
                      case 7:
                      case "end":
                        return _context2.stop();
                    }
                  }, _callee2);
                }));
                function handler(_x4, _x5) {
                  return _handler.apply(this, arguments);
                }
                return handler;
              }()
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
          return _context3.abrupt("return", replicationState);
        case 13:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _replicateWithWebsocketServer.apply(this, arguments);
}
//# sourceMappingURL=websocket-client.js.map