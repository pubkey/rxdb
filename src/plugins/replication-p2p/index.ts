import { Subject, Subscription } from 'rxjs';
import { addRxPlugin } from '../../plugin';
import { rxStorageInstanceToReplicationHandler } from '../../replication-protocol';
import type {
    RxCollection,
    RxError,
    RxPlugin,
    RxReplicationHandler,
    RxReplicationWriteToMasterRow,
    RxTypeError
} from '../../types';
import { getFromMapOrThrow, randomCouchString } from '../../util';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { replicateRxCollection } from '../replication';
import { isMasterInP2PReplication } from './p2p-helper';
import type {
    P2PConnectionHandler,
    P2PPeer,
    P2PPeerState,
    P2PReplicationCheckpoint,
    P2PResponse,
    RxP2PReplicationState,
    SyncOptionsP2P
} from './p2p-types';


export async function syncP2P<RxDocType>(
    this: RxCollection<RxDocType>,
    options: SyncOptionsP2P<RxDocType>
): Promise<RxP2PReplicationPool<RxDocType>> {
    const collection = this;
    if (this.database.multiInstance) {
        await this.database.waitForLeadership();
    }

    // used to easier debug stuff
    let requestCounter = 0;
    const requestFlag = randomCouchString(10);
    function getRequestId() {
        const count = requestCounter++;
        return collection.database.token + '|' + requestFlag + '|' + count;
    }

    const storageToken = await this.database.storageToken;
    const pool = new RxP2PReplicationPool(
        this,
        options,
        options.connectionHandlerCreator(storageToken, options)
    );


    pool.subs.push(
        pool.connectionHandler.disconnect$.subscribe(peer => pool.removePeer(peer))
    );


    const connectSub = pool.connectionHandler.connect$.subscribe((peer) => {
        if (pool.canceled) {
            return;
        }

        /**
         * To deterministicly define which peer is master and
         * which peer is fork, we compare the storage tokens.
         * But we have to hash them before, to ensure that
         * a storageToken like 'aaaaaa' is not always the master.
         */
        const isMaster = isMasterInP2PReplication(this.database.hashFunction, storageToken, peer.id);

        let replicationState: RxP2PReplicationState<RxDocType> | undefined;
        if (isMaster) {
            const masterHandler = pool.masterReplicationHandler;
            const messageSub = pool.connectionHandler.message$.subscribe(async (data) => {
                const { peer: msgPeer, message } = data;
                if (peer.id !== msgPeer.id) {
                    return;
                }
                const method = masterHandler[message.method];
                /**
                 * If it is not a function,
                 * it means that the client requested the masterChangeStream$
                 */
                if (typeof method !== 'function') {
                    // TODO shouldn't we cleanup subscriptions when the peer disconnects?
                    masterHandler.masterChangeStream$.subscribe(ev => {
                        const streamResponse: P2PResponse = {
                            id: 'stream',
                            collection: message.collection,
                            result: ev
                        };
                        msgPeer.respond(streamResponse);
                    });
                } else {
                    const result = await (method as any)(...message.params);
                    const response: P2PResponse = {
                        id: message.id,
                        collection: message.collection,
                        result
                    };
                    msgPeer.respond(response);
                }
            });
            pool.subs.push(messageSub);
        } else {
            replicationState = replicateRxCollection({
                replicationIdentifier: options.topic + '||' + peer.id,
                collection: this,
                autoStart: true,
                deletedField: '_deleted',
                live: true,
                retryTime: options.retryTime,
                waitForLeadership: false,
                pull: options.pull ? Object.assign({}, options.pull, {
                    handler(lastPulledCheckpoint: P2PReplicationCheckpoint) {
                        return pool.connectionHandler.send(peer, {
                            method: 'masterChangesSince',
                            params: [lastPulledCheckpoint],
                            collection: collection.name,
                            id: getRequestId()
                        }).then(([_p, response]) => {
                            return response.result;
                        })
                    }
                }) : undefined,
                push: options.push ? Object.assign({}, options.push, {
                    handler(docs: RxReplicationWriteToMasterRow<RxDocType>[]) {
                        return pool.connectionHandler.send(peer, {
                            method: 'masterWrite',
                            params: [docs],
                            collection: collection.name,
                            id: getRequestId()
                        }).then(([_p, response]) => {
                            return response.result;
                        })
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
export class RxP2PReplicationPool<RxDocType> {

    peerStates: Map<P2PPeer, P2PPeerState<RxDocType>> = new Map();
    canceled: boolean = false;
    masterReplicationHandler: RxReplicationHandler<RxDocType, P2PReplicationCheckpoint>;
    subs: Subscription[] = [];

    public error$ = new Subject<RxError | RxTypeError>();

    constructor(
        public readonly collection: RxCollection<RxDocType>,
        public readonly options: SyncOptionsP2P<RxDocType>,
        public readonly connectionHandler: P2PConnectionHandler
    ) {
        this.collection.onDestroy.push(() => this.cancel());
        this.masterReplicationHandler = rxStorageInstanceToReplicationHandler(
            collection.storageInstance,
            collection.conflictHandler,
            collection.database.hashFunction
        );
    }

    addPeer(
        peer: P2PPeer,
        replicationState?: RxP2PReplicationState<RxDocType>
    ) {
        const peerState: P2PPeerState<RxDocType> = {
            peer,
            replicationState,
            subs: []
        };
        this.peerStates.set(peer, peerState);
        if (replicationState) {
            peerState.subs.push(
                replicationState.error$.subscribe(ev => this.error$.next(ev))
            );
        }
    }
    removePeer(peer: P2PPeer) {
        const peerState = getFromMapOrThrow(this.peerStates, peer);
        this.peerStates.delete(peer);
        peerState.subs.forEach(sub => sub.unsubscribe());
        if (peerState.replicationState) {
            peerState.replicationState.cancel();
        }
    }

    public async cancel() {
        if (this.canceled) {
            return;
        }
        this.canceled = true;
        this.subs.forEach(sub => sub.unsubscribe());
        Array.from(this.peerStates.keys()).forEach(peer => {
            this.removePeer(peer);
        });
        await this.connectionHandler.destroy();
    }
}


export const RxDBReplicationP2PPlugin: RxPlugin = {
    name: 'replication-p2p',
    init() {
        addRxPlugin(RxDBLeaderElectionPlugin);
    },
    rxdb: true,
    prototypes: {
        RxCollection: (proto: any) => {
            proto.syncP2P = syncP2P;
        }
    }
};


export * from './p2p-helper';
export * from './p2p-types';
