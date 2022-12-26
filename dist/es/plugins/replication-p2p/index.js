import { BehaviorSubject, filter, firstValueFrom, map, Subject } from 'rxjs';
import { addRxPlugin } from '../../plugin';
import { rxStorageInstanceToReplicationHandler } from '../../replication-protocol';
import { ensureNotFalsy, getFromMapOrThrow, randomCouchString } from '../../util';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { replicateRxCollection } from '../replication';
import { isMasterInP2PReplication, sendMessageAndAwaitAnswer } from './p2p-helper';
export var syncP2P = function syncP2P(options) {
  try {
    var _temp2 = function _temp2() {
      // used to easier debug stuff
      var requestCounter = 0;
      function getRequestId() {
        var count = requestCounter++;
        return _collection.database.token + '|' + requestFlag + '|' + count;
      }
      var requestFlag = randomCouchString(10);
      return Promise.resolve(_this.database.storageToken).then(function (storageToken) {
        var pool = new RxP2PReplicationPool(_this, options, options.connectionHandlerCreator(options));
        pool.subs.push(pool.connectionHandler.error$.subscribe(function (err) {
          return pool.error$.next(err);
        }), pool.connectionHandler.disconnect$.subscribe(function (peer) {
          return pool.removePeer(peer);
        }));

        /**
         * Answer if someone requests our storage token
         */
        pool.subs.push(pool.connectionHandler.message$.pipe(filter(function (data) {
          return data.message.method === 'token';
        })).subscribe(function (data) {
          pool.connectionHandler.send(data.peer, {
            id: data.message.id,
            result: storageToken
          });
        }));
        var connectSub = pool.connectionHandler.connect$.pipe(filter(function () {
          return !pool.canceled;
        })).subscribe(function (peer) {
          try {
            /**
             * TODO ensure both know the correct secret
             */
            return Promise.resolve(sendMessageAndAwaitAnswer(pool.connectionHandler, peer, {
              id: getRequestId(),
              method: 'token',
              params: []
            })).then(function (tokenResponse) {
              var peerToken = tokenResponse.result;
              var isMaster = isMasterInP2PReplication(_this.database.hashFunction, storageToken, peerToken);
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
                pool.subs.push(masterChangeStreamSub, pool.connectionHandler.disconnect$.pipe(filter(function (p) {
                  return p.id === peer.id;
                })).subscribe(function () {
                  return masterChangeStreamSub.unsubscribe();
                }));
                var messageSub = pool.connectionHandler.message$.pipe(filter(function (data) {
                  return data.peer.id === peer.id;
                }), filter(function (data) {
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
                replicationState = replicateRxCollection({
                  replicationIdentifier: [_this.name, options.topic, peerToken].join('||'),
                  collection: _this,
                  autoStart: true,
                  deletedField: '_deleted',
                  live: true,
                  retryTime: options.retryTime,
                  waitForLeadership: false,
                  pull: options.pull ? Object.assign({}, options.pull, {
                    handler: function handler(lastPulledCheckpoint) {
                      try {
                        return Promise.resolve(sendMessageAndAwaitAnswer(pool.connectionHandler, peer, {
                          method: 'masterChangesSince',
                          params: [lastPulledCheckpoint, ensureNotFalsy(options.pull).batchSize],
                          id: getRequestId()
                        })).then(function (answer) {
                          return answer.result;
                        });
                      } catch (e) {
                        return Promise.reject(e);
                      }
                    },
                    stream$: pool.connectionHandler.response$.pipe(filter(function (m) {
                      return m.response.id === 'masterChangeStream$';
                    }), map(function (m) {
                      return m.response.result;
                    }))
                  }) : undefined,
                  push: options.push ? Object.assign({}, options.push, {
                    handler: function handler(docs) {
                      try {
                        return Promise.resolve(sendMessageAndAwaitAnswer(pool.connectionHandler, peer, {
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
    var _this = this;
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
    var _collection = _this;
    var _temp = function () {
      if (_this.database.multiInstance) {
        return Promise.resolve(_this.database.waitForLeadership()).then(function () {});
      }
    }();
    return Promise.resolve(_temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp));
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Because the P2P replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
export var RxP2PReplicationPool = /*#__PURE__*/function () {
  function RxP2PReplicationPool(collection, options, connectionHandler) {
    var _this2 = this;
    this.peerStates$ = new BehaviorSubject(new Map());
    this.canceled = false;
    this.subs = [];
    this.error$ = new Subject();
    this.collection = collection;
    this.options = options;
    this.connectionHandler = connectionHandler;
    this.collection.onDestroy.push(function () {
      return _this2.cancel();
    });
    this.masterReplicationHandler = rxStorageInstanceToReplicationHandler(collection.storageInstance, collection.conflictHandler, collection.database.hashFunction);
  }
  var _proto = RxP2PReplicationPool.prototype;
  _proto.addPeer = function addPeer(peer, replicationState) {
    var _this3 = this;
    var peerState = {
      peer: peer,
      replicationState: replicationState,
      subs: []
    };
    this.peerStates$.next(this.peerStates$.getValue().set(peer, peerState));
    if (replicationState) {
      peerState.subs.push(replicationState.error$.subscribe(function (ev) {
        return _this3.error$.next(ev);
      }));
    }
  };
  _proto.removePeer = function removePeer(peer) {
    var peerState = getFromMapOrThrow(this.peerStates$.getValue(), peer);
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
    return firstValueFrom(this.peerStates$.pipe(filter(function (peerStates) {
      return peerStates.size > 0;
    })));
  };
  _proto.cancel = function cancel() {
    try {
      var _this4 = this;
      if (_this4.canceled) {
        return Promise.resolve();
      }
      _this4.canceled = true;
      _this4.subs.forEach(function (sub) {
        return sub.unsubscribe();
      });
      Array.from(_this4.peerStates$.getValue().keys()).forEach(function (peer) {
        _this4.removePeer(peer);
      });
      return Promise.resolve(_this4.connectionHandler.destroy()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return RxP2PReplicationPool;
}();
export var RxDBReplicationP2PPlugin = {
  name: 'replication-p2p',
  init: function init() {
    addRxPlugin(RxDBLeaderElectionPlugin);
  },
  rxdb: true,
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.syncP2P = syncP2P;
    }
  }
};
export * from './p2p-helper';
export * from './p2p-types';
// export * from './connection-handler-webtorrent';
// export * from './connection-handler-p2pcf';
export * from './connection-handler-simple-peer';
//# sourceMappingURL=index.js.map