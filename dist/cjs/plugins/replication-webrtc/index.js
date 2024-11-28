"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  replicateWebRTC: true,
  RxWebRTCReplicationPool: true
};
exports.RxWebRTCReplicationPool = void 0;
exports.replicateWebRTC = replicateWebRTC;
var _rxjs = require("rxjs");
var _plugin = require("../../plugin.js");
var _index = require("../../replication-protocol/index.js");
var _index2 = require("../../plugins/utils/index.js");
var _index3 = require("../leader-election/index.js");
var _index4 = require("../replication/index.js");
var _webrtcHelper = require("./webrtc-helper.js");
Object.keys(_webrtcHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _webrtcHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _webrtcHelper[key];
    }
  });
});
var _rxError = require("../../rx-error.js");
var _signalingServer = require("./signaling-server.js");
Object.keys(_signalingServer).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _signalingServer[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _signalingServer[key];
    }
  });
});
var _webrtcTypes = require("./webrtc-types.js");
Object.keys(_webrtcTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _webrtcTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _webrtcTypes[key];
    }
  });
});
var _connectionHandlerSimplePeer = require("./connection-handler-simple-peer.js");
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
async function replicateWebRTC(options) {
  var collection = options.collection;
  (0, _plugin.addRxPlugin)(_index3.RxDBLeaderElectionPlugin);

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
  var requestFlag = (0, _index2.randomToken)(10);
  function getRequestId() {
    var count = requestCounter++;
    return collection.database.token + '|' + requestFlag + '|' + count;
  }
  var storageToken = await collection.database.storageToken;
  var pool = new RxWebRTCReplicationPool(collection, options, await options.connectionHandlerCreator(options));
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
    if (options.isPeerValid) {
      var isValid = await options.isPeerValid(peer);
      if (!isValid) {
        return;
      }
    }
    var peerToken;
    try {
      var tokenResponse = await (0, _webrtcHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
        id: getRequestId(),
        method: 'token',
        params: []
      });
      peerToken = tokenResponse.result;
    } catch (error) {
      /**
       * If could not get the tokenResponse,
       * just ignore that peer.
       */
      pool.error$.next((0, _rxError.newRxError)('RC_WEBRTC_PEER', {
        error
      }));
      return;
    }
    var isMaster = await (0, _webrtcHelper.isMasterInWebRTCReplication)(collection.database.hashFunction, storageToken, peerToken);
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
      pool.subs.push(masterChangeStreamSub, pool.connectionHandler.disconnect$.pipe((0, _rxjs.filter)(p => p === peer)).subscribe(() => masterChangeStreamSub.unsubscribe()));
      var messageSub = pool.connectionHandler.message$.pipe((0, _rxjs.filter)(data => data.peer === peer), (0, _rxjs.filter)(data => data.message.method !== 'token')).subscribe(async data => {
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
      replicationState = (0, _index4.replicateRxCollection)({
        replicationIdentifier: [collection.name, options.topic, peerToken].join('||'),
        collection: collection,
        autoStart: true,
        deletedField: '_deleted',
        live: true,
        retryTime: options.retryTime,
        waitForLeadership: false,
        pull: options.pull ? Object.assign({}, options.pull, {
          async handler(lastPulledCheckpoint) {
            var answer = await (0, _webrtcHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
              method: 'masterChangesSince',
              params: [lastPulledCheckpoint, (0, _index2.ensureNotFalsy)(options.pull).batchSize],
              id: getRequestId()
            });
            return answer.result;
          },
          stream$: pool.connectionHandler.response$.pipe((0, _rxjs.filter)(m => m.response.id === 'masterChangeStream$'), (0, _rxjs.map)(m => m.response.result))
        }) : undefined,
        push: options.push ? Object.assign({}, options.push, {
          async handler(docs) {
            var answer = await (0, _webrtcHelper.sendMessageAndAwaitAnswer)(pool.connectionHandler, peer, {
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
 * Because the WebRTC replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
var RxWebRTCReplicationPool = exports.RxWebRTCReplicationPool = /*#__PURE__*/function () {
  function RxWebRTCReplicationPool(collection, options, connectionHandler) {
    this.peerStates$ = new _rxjs.BehaviorSubject(new Map());
    this.canceled = false;
    this.subs = [];
    this.error$ = new _rxjs.Subject();
    this.collection = collection;
    this.options = options;
    this.connectionHandler = connectionHandler;
    this.collection.onClose.push(() => this.cancel());
    this.masterReplicationHandler = (0, _index.rxStorageInstanceToReplicationHandler)(collection.storageInstance, collection.conflictHandler, collection.database.token);
  }
  var _proto = RxWebRTCReplicationPool.prototype;
  _proto.addPeer = function addPeer(peer,
  // only if isMaster=false it has a replicationState
  replicationState) {
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
    var peerState = (0, _index2.getFromMapOrThrow)(this.peerStates$.getValue(), peer);
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
    await this.connectionHandler.close();
  };
  return RxWebRTCReplicationPool;
}(); // export * from './connection-handler-webtorrent';
// export * from './connection-handler-p2pcf';
//# sourceMappingURL=index.js.map