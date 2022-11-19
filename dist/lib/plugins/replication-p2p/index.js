"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  syncP2P: true,
  RxP2PReplicationPool: true,
  RxDBReplicationP2PPlugin: true
};
exports.syncP2P = exports.RxP2PReplicationPool = exports.RxDBReplicationP2PPlugin = void 0;
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
var syncP2P = function syncP2P(options) {
  try {
    var _temp3 = function _temp3() {
      // used to easier debug stuff
      var requestCounter = 0;
      function getRequestId() {
        var count = requestCounter++;
        return _collection.database.token + '|' + requestFlag + '|' + count;
      }
      var requestFlag = (0, _util.randomCouchString)(10);
      return Promise.resolve(_this2.database.storageToken).then(function (storageToken) {
        var pool = new RxP2PReplicationPool(_this2, options, options.connectionHandlerCreator(options));
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
        var connectSub = pool.connectionHandler.connect$.pipe((0, _rxjs.filter)(function () {
          return !pool.canceled;
        })).subscribe(function (peer) {
          try {
            /**
             * TODO ensure both know the correct secret
             */
            return Promise.resolve((0, _p2pHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
              id: getRequestId(),
              method: 'token',
              params: []
            })).then(function (tokenResponse) {
              var peerToken = tokenResponse.result;
              var isMaster = (0, _p2pHelper.isMasterInP2PReplication)(_this2.database.hashFunction, storageToken, peerToken);
              var replicationState;
              if (isMaster) {
                var masterHandler = pool.masterReplicationHandler;
                var masterChangeStreamSub = masterHandler.masterChangeStream$.subscribe(function (ev) {
                  var streamResponse = {
                    id: 'masterChangeStream$',
                    result: ev
                  };
                  pool.connectionHandler.send(peer, streamResponse);
                });

                // clean up the subscription
                pool.subs.push(masterChangeStreamSub, pool.connectionHandler.disconnect$.pipe((0, _rxjs.filter)(function (p) {
                  return p.id === peer.id;
                })).subscribe(function () {
                  return masterChangeStreamSub.unsubscribe();
                }));
                var messageSub = pool.connectionHandler.message$.pipe((0, _rxjs.filter)(function (data) {
                  return data.peer.id === peer.id;
                }), (0, _rxjs.filter)(function (data) {
                  return data.message.method !== 'token';
                })).subscribe(function (data) {
                  try {
                    var msgPeer = data.peer,
                      message = data.message;
                    /**
                     * If it is not a function,
                     * it means that the client requested the masterChangeStream$
                     */
                    var method = masterHandler[message.method].bind(masterHandler);
                    return Promise.resolve(method.apply(void 0, message.params)).then(function (result) {
                      var response = {
                        id: message.id,
                        result: result
                      };
                      pool.connectionHandler.send(msgPeer, response);
                    });
                  } catch (e) {
                    return Promise.reject(e);
                  }
                });
                pool.subs.push(messageSub);
              } else {
                replicationState = (0, _replication.replicateRxCollection)({
                  replicationIdentifier: [_this2.name, options.topic, peerToken].join('||'),
                  collection: _this2,
                  autoStart: true,
                  deletedField: '_deleted',
                  live: true,
                  retryTime: options.retryTime,
                  waitForLeadership: false,
                  pull: options.pull ? Object.assign({}, options.pull, {
                    handler: function handler(lastPulledCheckpoint) {
                      try {
                        return Promise.resolve((0, _p2pHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
                          method: 'masterChangesSince',
                          params: [lastPulledCheckpoint, (0, _util.ensureNotFalsy)(options.pull).batchSize],
                          id: getRequestId()
                        })).then(function (answer) {
                          return answer.result;
                        });
                      } catch (e) {
                        return Promise.reject(e);
                      }
                    },
                    stream$: pool.connectionHandler.response$.pipe((0, _rxjs.filter)(function (m) {
                      return m.response.id === 'masterChangeStream$';
                    }), (0, _rxjs.map)(function (m) {
                      return m.response.result;
                    }))
                  }) : undefined,
                  push: options.push ? Object.assign({}, options.push, {
                    handler: function handler(docs) {
                      try {
                        return Promise.resolve((0, _p2pHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
                          method: 'masterWrite',
                          params: [docs],
                          id: getRequestId()
                        })).then(function (answer) {
                          return answer.result;
                        });
                      } catch (e) {
                        return Promise.reject(e);
                      }
                    }
                  }) : undefined
                });
              }
              pool.addPeer(peer, replicationState);
            });
          } catch (e) {
            return Promise.reject(e);
          }
        });
        pool.subs.push(connectSub);
        return pool;
      });
    };
    var _this2 = this;
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
    var _collection = _this2;
    var _temp4 = function () {
      if (_this2.database.multiInstance) {
        return Promise.resolve(_this2.database.waitForLeadership()).then(function () {});
      }
    }();
    return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Because the P2P replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
exports.syncP2P = syncP2P;
var RxP2PReplicationPool = /*#__PURE__*/function () {
  function RxP2PReplicationPool(collection, options, connectionHandler) {
    var _this3 = this;
    this.peerStates$ = new _rxjs.BehaviorSubject(new Map());
    this.canceled = false;
    this.subs = [];
    this.error$ = new _rxjs.Subject();
    this.collection = collection;
    this.options = options;
    this.connectionHandler = connectionHandler;
    this.collection.onDestroy.push(function () {
      return _this3.cancel();
    });
    this.masterReplicationHandler = (0, _replicationProtocol.rxStorageInstanceToReplicationHandler)(collection.storageInstance, collection.conflictHandler, collection.database.hashFunction);
  }
  var _proto = RxP2PReplicationPool.prototype;
  _proto.addPeer = function addPeer(peer, replicationState) {
    var _this4 = this;
    var peerState = {
      peer: peer,
      replicationState: replicationState,
      subs: []
    };
    this.peerStates$.next(this.peerStates$.getValue().set(peer, peerState));
    if (replicationState) {
      peerState.subs.push(replicationState.error$.subscribe(function (ev) {
        return _this4.error$.next(ev);
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
  _proto.cancel = function cancel() {
    try {
      var _this6 = this;
      if (_this6.canceled) {
        return Promise.resolve();
      }
      _this6.canceled = true;
      _this6.subs.forEach(function (sub) {
        return sub.unsubscribe();
      });
      Array.from(_this6.peerStates$.getValue().keys()).forEach(function (peer) {
        _this6.removePeer(peer);
      });
      return Promise.resolve(_this6.connectionHandler.destroy()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
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