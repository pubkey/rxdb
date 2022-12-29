"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  syncP2P: true,
  RxP2PReplicationPool: true,
  RxDBReplicationP2PPlugin: true
};
exports.RxP2PReplicationPool = exports.RxDBReplicationP2PPlugin = void 0;
exports.syncP2P = syncP2P;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _rxjs = require("rxjs");
var _plugin = require("../../plugin");
var _replicationProtocol = require("../../replication-protocol");
var _util = require("../../util");
var _leaderElection = require("../leader-election");
var _replication = require("../replication");
var _p2pHelper = require("./p2p-helper");
Object.keys(_p2pHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _p2pHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _p2pHelper[key];
    }
  });
});
var _p2pTypes = require("./p2p-types");
Object.keys(_p2pTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _p2pTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _p2pTypes[key];
    }
  });
});
var _connectionHandlerSimplePeer = require("./connection-handler-simple-peer");
Object.keys(_connectionHandlerSimplePeer).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _connectionHandlerSimplePeer[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _connectionHandlerSimplePeer[key];
    }
  });
});
function syncP2P(_x) {
  return _syncP2P.apply(this, arguments);
}
/**
 * Because the P2P replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
function _syncP2P() {
  _syncP2P = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(options) {
    var _this4 = this;
    var collection, requestCounter, requestFlag, getRequestId, storageToken, pool, connectSub;
    return _regenerator["default"].wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          getRequestId = function _getRequestId() {
            var count = requestCounter++;
            return collection.database.token + '|' + requestFlag + '|' + count;
          };
          // fill defaults
          if (options.pull) {
            if (!options.pull.batchSize) {
              options.pull.batchSize = 20;
            }
          }
          if (options.push) {
            if (!options.push.batchSize) {
              options.push.batchSize = 20;
            }
          }
          collection = this;
          if (!this.database.multiInstance) {
            _context6.next = 7;
            break;
          }
          _context6.next = 7;
          return this.database.waitForLeadership();
        case 7:
          // used to easier debug stuff
          requestCounter = 0;
          requestFlag = (0, _util.randomCouchString)(10);
          _context6.next = 11;
          return this.database.storageToken;
        case 11:
          storageToken = _context6.sent;
          pool = new RxP2PReplicationPool(this, options, options.connectionHandlerCreator(options));
          pool.subs.push(pool.connectionHandler.error$.subscribe(function (err) {
            return pool.error$.next(err);
          }), pool.connectionHandler.disconnect$.subscribe(function (peer) {
            return pool.removePeer(peer);
          }));

          /**
           * Answer if someone requests our storage token
           */
          pool.subs.push(pool.connectionHandler.message$.pipe((0, _rxjs.filter)(function (data) {
            return data.message.method === 'token';
          })).subscribe(function (data) {
            pool.connectionHandler.send(data.peer, {
              id: data.message.id,
              result: storageToken
            });
          }));
          connectSub = pool.connectionHandler.connect$.pipe((0, _rxjs.filter)(function () {
            return !pool.canceled;
          })).subscribe( /*#__PURE__*/function () {
            var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(peer) {
              var tokenResponse, peerToken, isMaster, replicationState, masterHandler, masterChangeStreamSub, messageSub;
              return _regenerator["default"].wrap(function _callee5$(_context5) {
                while (1) switch (_context5.prev = _context5.next) {
                  case 0:
                    _context5.next = 2;
                    return (0, _p2pHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
                      id: getRequestId(),
                      method: 'token',
                      params: []
                    });
                  case 2:
                    tokenResponse = _context5.sent;
                    peerToken = tokenResponse.result;
                    isMaster = (0, _p2pHelper.isMasterInP2PReplication)(_this4.database.hashFunction, storageToken, peerToken);
                    if (isMaster) {
                      masterHandler = pool.masterReplicationHandler;
                      masterChangeStreamSub = masterHandler.masterChangeStream$.subscribe(function (ev) {
                        var streamResponse = {
                          id: 'masterChangeStream$',
                          result: ev
                        };
                        pool.connectionHandler.send(peer, streamResponse);
                      }); // clean up the subscription
                      pool.subs.push(masterChangeStreamSub, pool.connectionHandler.disconnect$.pipe((0, _rxjs.filter)(function (p) {
                        return p.id === peer.id;
                      })).subscribe(function () {
                        return masterChangeStreamSub.unsubscribe();
                      }));
                      messageSub = pool.connectionHandler.message$.pipe((0, _rxjs.filter)(function (data) {
                        return data.peer.id === peer.id;
                      }), (0, _rxjs.filter)(function (data) {
                        return data.message.method !== 'token';
                      })).subscribe( /*#__PURE__*/function () {
                        var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(data) {
                          var msgPeer, message, method, result, response;
                          return _regenerator["default"].wrap(function _callee2$(_context2) {
                            while (1) switch (_context2.prev = _context2.next) {
                              case 0:
                                msgPeer = data.peer, message = data.message;
                                /**
                                 * If it is not a function,
                                 * it means that the client requested the masterChangeStream$
                                 */
                                method = masterHandler[message.method].bind(masterHandler);
                                _context2.next = 4;
                                return method.apply(void 0, message.params);
                              case 4:
                                result = _context2.sent;
                                response = {
                                  id: message.id,
                                  result: result
                                };
                                pool.connectionHandler.send(msgPeer, response);
                              case 7:
                              case "end":
                                return _context2.stop();
                            }
                          }, _callee2);
                        }));
                        return function (_x3) {
                          return _ref2.apply(this, arguments);
                        };
                      }());
                      pool.subs.push(messageSub);
                    } else {
                      replicationState = (0, _replication.replicateRxCollection)({
                        replicationIdentifier: [_this4.name, options.topic, peerToken].join('||'),
                        collection: _this4,
                        autoStart: true,
                        deletedField: '_deleted',
                        live: true,
                        retryTime: options.retryTime,
                        waitForLeadership: false,
                        pull: options.pull ? Object.assign({}, options.pull, {
                          handler: function () {
                            var _handler = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(lastPulledCheckpoint) {
                              var answer;
                              return _regenerator["default"].wrap(function _callee3$(_context3) {
                                while (1) switch (_context3.prev = _context3.next) {
                                  case 0:
                                    _context3.next = 2;
                                    return (0, _p2pHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
                                      method: 'masterChangesSince',
                                      params: [lastPulledCheckpoint, (0, _util.ensureNotFalsy)(options.pull).batchSize],
                                      id: getRequestId()
                                    });
                                  case 2:
                                    answer = _context3.sent;
                                    return _context3.abrupt("return", answer.result);
                                  case 4:
                                  case "end":
                                    return _context3.stop();
                                }
                              }, _callee3);
                            }));
                            function handler(_x4) {
                              return _handler.apply(this, arguments);
                            }
                            return handler;
                          }(),
                          stream$: pool.connectionHandler.response$.pipe((0, _rxjs.filter)(function (m) {
                            return m.response.id === 'masterChangeStream$';
                          }), (0, _rxjs.map)(function (m) {
                            return m.response.result;
                          }))
                        }) : undefined,
                        push: options.push ? Object.assign({}, options.push, {
                          handler: function () {
                            var _handler2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(docs) {
                              var answer;
                              return _regenerator["default"].wrap(function _callee4$(_context4) {
                                while (1) switch (_context4.prev = _context4.next) {
                                  case 0:
                                    _context4.next = 2;
                                    return (0, _p2pHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
                                      method: 'masterWrite',
                                      params: [docs],
                                      id: getRequestId()
                                    });
                                  case 2:
                                    answer = _context4.sent;
                                    return _context4.abrupt("return", answer.result);
                                  case 4:
                                  case "end":
                                    return _context4.stop();
                                }
                              }, _callee4);
                            }));
                            function handler(_x5) {
                              return _handler2.apply(this, arguments);
                            }
                            return handler;
                          }()
                        }) : undefined
                      });
                    }
                    pool.addPeer(peer, replicationState);
                  case 7:
                  case "end":
                    return _context5.stop();
                }
              }, _callee5);
            }));
            return function (_x2) {
              return _ref.apply(this, arguments);
            };
          }());
          pool.subs.push(connectSub);
          return _context6.abrupt("return", pool);
        case 18:
        case "end":
          return _context6.stop();
      }
    }, _callee6, this);
  }));
  return _syncP2P.apply(this, arguments);
}
var RxP2PReplicationPool = /*#__PURE__*/function () {
  function RxP2PReplicationPool(collection, options, connectionHandler) {
    var _this = this;
    this.peerStates$ = new _rxjs.BehaviorSubject(new Map());
    this.canceled = false;
    this.subs = [];
    this.error$ = new _rxjs.Subject();
    this.collection = collection;
    this.options = options;
    this.connectionHandler = connectionHandler;
    this.collection.onDestroy.push(function () {
      return _this.cancel();
    });
    this.masterReplicationHandler = (0, _replicationProtocol.rxStorageInstanceToReplicationHandler)(collection.storageInstance, collection.conflictHandler, collection.database.token);
  }
  var _proto = RxP2PReplicationPool.prototype;
  _proto.addPeer = function addPeer(peer, replicationState) {
    var _this2 = this;
    var peerState = {
      peer: peer,
      replicationState: replicationState,
      subs: []
    };
    this.peerStates$.next(this.peerStates$.getValue().set(peer, peerState));
    if (replicationState) {
      peerState.subs.push(replicationState.error$.subscribe(function (ev) {
        return _this2.error$.next(ev);
      }));
    }
  };
  _proto.removePeer = function removePeer(peer) {
    var peerState = (0, _util.getFromMapOrThrow)(this.peerStates$.getValue(), peer);
    this.peerStates$.getValue()["delete"](peer);
    this.peerStates$.next(this.peerStates$.getValue());
    peerState.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    if (peerState.replicationState) {
      peerState.replicationState.cancel();
    }
  }

  // often used in unit tests
  ;
  _proto.awaitFirstPeer = function awaitFirstPeer() {
    return (0, _rxjs.firstValueFrom)(this.peerStates$.pipe((0, _rxjs.filter)(function (peerStates) {
      return peerStates.size > 0;
    })));
  };
  _proto.cancel = /*#__PURE__*/function () {
    var _cancel = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var _this3 = this;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (!this.canceled) {
              _context.next = 2;
              break;
            }
            return _context.abrupt("return");
          case 2:
            this.canceled = true;
            this.subs.forEach(function (sub) {
              return sub.unsubscribe();
            });
            Array.from(this.peerStates$.getValue().keys()).forEach(function (peer) {
              _this3.removePeer(peer);
            });
            _context.next = 7;
            return this.connectionHandler.destroy();
          case 7:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function cancel() {
      return _cancel.apply(this, arguments);
    }
    return cancel;
  }();
  return RxP2PReplicationPool;
}();
exports.RxP2PReplicationPool = RxP2PReplicationPool;
var RxDBReplicationP2PPlugin = {
  name: 'replication-p2p',
  init: function init() {
    (0, _plugin.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
  },
  rxdb: true,
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.syncP2P = syncP2P;
    }
  }
};
exports.RxDBReplicationP2PPlugin = RxDBReplicationP2PPlugin;
//# sourceMappingURL=index.js.map