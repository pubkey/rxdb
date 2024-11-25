import { BehaviorSubject, filter, firstValueFrom, map, Subject } from 'rxjs';
import { addRxPlugin } from "../../plugin.js";
import { rxStorageInstanceToReplicationHandler } from "../../replication-protocol/index.js";
import { ensureNotFalsy, getFromMapOrThrow, randomToken } from "../../plugins/utils/index.js";
import { RxDBLeaderElectionPlugin } from "../leader-election/index.js";
import { replicateRxCollection } from "../replication/index.js";
import { isMasterInWebRTCReplication, sendMessageAndAwaitAnswer } from "./webrtc-helper.js";
import { newRxError } from "../../rx-error.js";
export async function replicateWebRTC(options) {
  var collection = options.collection;
  addRxPlugin(RxDBLeaderElectionPlugin);

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
  var requestFlag = randomToken(10);
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
  pool.subs.push(pool.connectionHandler.message$.pipe(filter(data => data.message.method === 'token')).subscribe(data => {
    pool.connectionHandler.send(data.peer, {
      id: data.message.id,
      result: storageToken
    });
  }));
  var connectSub = pool.connectionHandler.connect$.pipe(filter(() => !pool.canceled)).subscribe(async peer => {
    if (options.isPeerValid) {
      var isValid = await options.isPeerValid(peer);
      if (!isValid) {
        return;
      }
    }
    var peerToken;
    try {
      var tokenResponse = await sendMessageAndAwaitAnswer(pool.connectionHandler, peer, {
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
      pool.error$.next(newRxError('RC_WEBRTC_PEER', {
        error
      }));
      return;
    }
    var isMaster = await isMasterInWebRTCReplication(collection.database.hashFunction, storageToken, peerToken);
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
      pool.subs.push(masterChangeStreamSub, pool.connectionHandler.disconnect$.pipe(filter(p => p === peer)).subscribe(() => masterChangeStreamSub.unsubscribe()));
      var messageSub = pool.connectionHandler.message$.pipe(filter(data => data.peer === peer), filter(data => data.message.method !== 'token')).subscribe(async data => {
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
      replicationState = replicateRxCollection({
        replicationIdentifier: [collection.name, options.topic, peerToken].join('||'),
        collection: collection,
        autoStart: true,
        deletedField: '_deleted',
        live: true,
        retryTime: options.retryTime,
        waitForLeadership: false,
        pull: options.pull ? Object.assign({}, options.pull, {
          async handler(lastPulledCheckpoint) {
            var answer = await sendMessageAndAwaitAnswer(pool.connectionHandler, peer, {
              method: 'masterChangesSince',
              params: [lastPulledCheckpoint, ensureNotFalsy(options.pull).batchSize],
              id: getRequestId()
            });
            return answer.result;
          },
          stream$: pool.connectionHandler.response$.pipe(filter(m => m.response.id === 'masterChangeStream$'), map(m => m.response.result))
        }) : undefined,
        push: options.push ? Object.assign({}, options.push, {
          async handler(docs) {
            var answer = await sendMessageAndAwaitAnswer(pool.connectionHandler, peer, {
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
export var RxWebRTCReplicationPool = /*#__PURE__*/function () {
  function RxWebRTCReplicationPool(collection, options, connectionHandler) {
    this.peerStates$ = new BehaviorSubject(new Map());
    this.canceled = false;
    this.subs = [];
    this.error$ = new Subject();
    this.collection = collection;
    this.options = options;
    this.connectionHandler = connectionHandler;
    this.collection.onClose.push(() => this.cancel());
    this.masterReplicationHandler = rxStorageInstanceToReplicationHandler(collection.storageInstance, collection.conflictHandler, collection.database.token);
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
    var peerState = getFromMapOrThrow(this.peerStates$.getValue(), peer);
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
    return firstValueFrom(this.peerStates$.pipe(filter(peerStates => peerStates.size > 0)));
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
}();
export * from "./webrtc-helper.js";
export * from "./signaling-server.js";
export * from "./webrtc-types.js";
// export * from './connection-handler-webtorrent';
// export * from './connection-handler-p2pcf';
export * from "./connection-handler-simple-peer.js";
//# sourceMappingURL=index.js.map