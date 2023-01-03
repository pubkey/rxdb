"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  replicateP2P: true,
  RxP2PReplicationPool: true
};
exports.RxP2PReplicationPool = void 0;
exports.replicateP2P = replicateP2P;
var _rxjs = require("rxjs");
var _plugin = require("../../plugin");
var _replicationProtocol = require("../../replication-protocol");
var _utils = require("../../plugins/utils");
var _leaderElection = require("../leader-election");
var _replication = require("../replication");
var _p2pHelper = require("./p2p-helper");
Object.keys(_p2pHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _p2pHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
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
    get: function () {
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
    get: function () {
      return _connectionHandlerSimplePeer[key];
    }
  });
});
async function replicateP2P(options) {
  var collection = options.collection;
  (0, _plugin.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);

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
  if (collection.database.multiInstance) {
    await collection.database.waitForLeadership();
  }

  // used to easier debug stuff
  var requestCounter = 0;
  var requestFlag = (0, _utils.randomCouchString)(10);
  function getRequestId() {
    var count = requestCounter++;
    return collection.database.token + '|' + requestFlag + '|' + count;
  }
  var storageToken = await collection.database.storageToken;
  var pool = new RxP2PReplicationPool(collection, options, options.connectionHandlerCreator(options));
  pool.subs.push(pool.connectionHandler.error$.subscribe(err => pool.error$.next(err)), pool.connectionHandler.disconnect$.subscribe(peer => pool.removePeer(peer)));

  /**
   * Answer if someone requests our storage token
   */
  pool.subs.push(pool.connectionHandler.message$.pipe((0, _rxjs.filter)(data => data.message.method === 'token')).subscribe(data => {
    pool.connectionHandler.send(data.peer, {
      id: data.message.id,
      result: storageToken
    });
  }));
  var connectSub = pool.connectionHandler.connect$.pipe((0, _rxjs.filter)(() => !pool.canceled)).subscribe(async peer => {
    /**
     * TODO ensure both know the correct secret
     */
    var tokenResponse = await (0, _p2pHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
      id: getRequestId(),
      method: 'token',
      params: []
    });
    var peerToken = tokenResponse.result;
    var isMaster = (0, _p2pHelper.isMasterInP2PReplication)(collection.database.hashFunction, storageToken, peerToken);
    var replicationState;
    if (isMaster) {
      var masterHandler = pool.masterReplicationHandler;
      var masterChangeStreamSub = masterHandler.masterChangeStream$.subscribe(ev => {
        var streamResponse = {
          id: 'masterChangeStream$',
          result: ev
        };
        pool.connectionHandler.send(peer, streamResponse);
      });

      // clean up the subscription
      pool.subs.push(masterChangeStreamSub, pool.connectionHandler.disconnect$.pipe((0, _rxjs.filter)(p => p.id === peer.id)).subscribe(() => masterChangeStreamSub.unsubscribe()));
      var messageSub = pool.connectionHandler.message$.pipe((0, _rxjs.filter)(data => data.peer.id === peer.id), (0, _rxjs.filter)(data => data.message.method !== 'token')).subscribe(async data => {
        var {
          peer: msgPeer,
          message
        } = data;
        /**
         * If it is not a function,
         * it means that the client requested the masterChangeStream$
         */
        var method = masterHandler[message.method].bind(masterHandler);
        var result = await method(...message.params);
        var response = {
          id: message.id,
          result
        };
        pool.connectionHandler.send(msgPeer, response);
      });
      pool.subs.push(messageSub);
    } else {
      replicationState = (0, _replication.replicateRxCollection)({
        replicationIdentifier: [collection.name, options.topic, peerToken].join('||'),
        collection: collection,
        autoStart: true,
        deletedField: '_deleted',
        live: true,
        retryTime: options.retryTime,
        waitForLeadership: false,
        pull: options.pull ? Object.assign({}, options.pull, {
          async handler(lastPulledCheckpoint) {
            var answer = await (0, _p2pHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
              method: 'masterChangesSince',
              params: [lastPulledCheckpoint, (0, _utils.ensureNotFalsy)(options.pull).batchSize],
              id: getRequestId()
            });
            return answer.result;
          },
          stream$: pool.connectionHandler.response$.pipe((0, _rxjs.filter)(m => m.response.id === 'masterChangeStream$'), (0, _rxjs.map)(m => m.response.result))
        }) : undefined,
        push: options.push ? Object.assign({}, options.push, {
          async handler(docs) {
            var answer = await (0, _p2pHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
              method: 'masterWrite',
              params: [docs],
              id: getRequestId()
            });
            return answer.result;
          }
        }) : undefined
      });
    }
    pool.addPeer(peer, replicationState);
  });
  pool.subs.push(connectSub);
  return pool;
}

/**
 * Because the P2P replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
var RxP2PReplicationPool = /*#__PURE__*/function () {
  function RxP2PReplicationPool(collection, options, connectionHandler) {
    this.peerStates$ = new _rxjs.BehaviorSubject(new Map());
    this.canceled = false;
    this.subs = [];
    this.error$ = new _rxjs.Subject();
    this.collection = collection;
    this.options = options;
    this.connectionHandler = connectionHandler;
    this.collection.onDestroy.push(() => this.cancel());
    this.masterReplicationHandler = (0, _replicationProtocol.rxStorageInstanceToReplicationHandler)(collection.storageInstance, collection.conflictHandler, collection.database.token);
  }
  var _proto = RxP2PReplicationPool.prototype;
  _proto.addPeer = function addPeer(peer, replicationState) {
    var peerState = {
      peer,
      replicationState,
      subs: []
    };
    this.peerStates$.next(this.peerStates$.getValue().set(peer, peerState));
    if (replicationState) {
      peerState.subs.push(replicationState.error$.subscribe(ev => this.error$.next(ev)));
    }
  };
  _proto.removePeer = function removePeer(peer) {
    var peerState = (0, _utils.getFromMapOrThrow)(this.peerStates$.getValue(), peer);
    this.peerStates$.getValue().delete(peer);
    this.peerStates$.next(this.peerStates$.getValue());
    peerState.subs.forEach(sub => sub.unsubscribe());
    if (peerState.replicationState) {
      peerState.replicationState.cancel();
    }
  }

  // often used in unit tests
  ;
  _proto.awaitFirstPeer = function awaitFirstPeer() {
    return (0, _rxjs.firstValueFrom)(this.peerStates$.pipe((0, _rxjs.filter)(peerStates => peerStates.size > 0)));
  };
  _proto.cancel = async function cancel() {
    if (this.canceled) {
      return;
    }
    this.canceled = true;
    this.subs.forEach(sub => sub.unsubscribe());
    Array.from(this.peerStates$.getValue().keys()).forEach(peer => {
      this.removePeer(peer);
    });
    await this.connectionHandler.destroy();
  };
  return RxP2PReplicationPool;
}();
exports.RxP2PReplicationPool = RxP2PReplicationPool;
//# sourceMappingURL=index.js.map