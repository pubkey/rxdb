import { BehaviorSubject, filter, firstValueFrom, map, Subject } from 'rxjs';
import { addRxPlugin } from '../../plugin';
import { rxStorageInstanceToReplicationHandler } from '../../replication-protocol';
import { ensureNotFalsy, getFromMapOrThrow, randomCouchString } from '../../plugins/utils';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { replicateRxCollection } from '../replication';
import { isMasterInP2PReplication, sendMessageAndAwaitAnswer } from './p2p-helper';
export async function replicateP2P(options) {
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
  var requestFlag = randomCouchString(10);
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
  pool.subs.push(pool.connectionHandler.message$.pipe(filter(data => data.message.method === 'token')).subscribe(data => {
    pool.connectionHandler.send(data.peer, {
      id: data.message.id,
      result: storageToken
    });
  }));
  var connectSub = pool.connectionHandler.connect$.pipe(filter(() => !pool.canceled)).subscribe(async peer => {
    /**
     * TODO ensure both know the correct secret
     */
    var tokenResponse = await sendMessageAndAwaitAnswer(pool.connectionHandler, peer, {
      id: getRequestId(),
      method: 'token',
      params: []
    });
    var peerToken = tokenResponse.result;
    var isMaster = isMasterInP2PReplication(collection.database.hashFunction, storageToken, peerToken);
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
      pool.subs.push(masterChangeStreamSub, pool.connectionHandler.disconnect$.pipe(filter(p => p.id === peer.id)).subscribe(() => masterChangeStreamSub.unsubscribe()));
      var messageSub = pool.connectionHandler.message$.pipe(filter(data => data.peer.id === peer.id), filter(data => data.message.method !== 'token')).subscribe(async data => {
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
 * Because the P2P replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
export var RxP2PReplicationPool = /*#__PURE__*/function () {
  function RxP2PReplicationPool(collection, options, connectionHandler) {
    this.peerStates$ = new BehaviorSubject(new Map());
    this.canceled = false;
    this.subs = [];
    this.error$ = new Subject();
    this.collection = collection;
    this.options = options;
    this.connectionHandler = connectionHandler;
    this.collection.onDestroy.push(() => this.cancel());
    this.masterReplicationHandler = rxStorageInstanceToReplicationHandler(collection.storageInstance, collection.conflictHandler, collection.database.token);
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
    await this.connectionHandler.destroy();
  };
  return RxP2PReplicationPool;
}();
export * from './p2p-helper';
export * from './p2p-types';
// export * from './connection-handler-webtorrent';
// export * from './connection-handler-p2pcf';
export * from './connection-handler-simple-peer';
//# sourceMappingURL=index.js.map