import {
    BehaviorSubject,
    filter,
    firstValueFrom,
    map,
    Subject,
    Subscription
} from 'rxjs';
import { addRxPlugin } from '../../plugin.ts';
import { rxStorageInstanceToReplicationHandler } from '../../replication-protocol/index.ts';
import type {
    RxCollection,
    RxError,
    RxReplicationHandler,
    RxReplicationWriteToMasterRow,
    RxTypeError
} from '../../types/index.d.ts';
import {
    ensureNotFalsy,
    errorToPlainJson,
    PROMISE_RESOLVE_TRUE,
    PROMISE_RESOLVE_VOID,
    randomToken
} from '../../plugins/utils/index.ts';
import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import { replicateRxCollection } from '../replication/index.ts';
import {
    isMasterInWebRTCReplication,
    sendMessageAndAwaitAnswer,
    WEBRTC_DEFAULT_REQUEST_TIMEOUT
} from './webrtc-helper.ts';
import type {
    PeerWithMessage,
    PeerWithResponse,
    WebRTCConnectionHandler,
    WebRTCMessage,
    WebRTCPeerState,
    WebRTCReplicationCheckpoint,
    WebRTCResponse,
    RxWebRTCReplicationState,
    SyncOptionsWebRTC
} from './webrtc-types.ts';
import { newRxError } from '../../rx-error.ts';


/**
 * The methods of the master replication handler
 * that remote peers are allowed to call.
 */
const WEBRTC_MASTER_METHODS: string[] = [
    'masterChangesSince',
    'masterWrite'
];

export async function replicateWebRTC<RxDocType, PeerType>(
    options: SyncOptionsWebRTC<RxDocType, PeerType>
): Promise<RxWebRTCReplicationPool<RxDocType, PeerType>> {
    const collection = options.collection;
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
    let requestCounter = 0;
    const requestFlag = randomToken(10);
    function getRequestId() {
        const count = requestCounter++;
        return collection.database.token + '|' + requestFlag + '|' + count;
    }

    const storageToken = await collection.database.storageToken;
    const pool = new RxWebRTCReplicationPool(
        collection,
        options,
        await options.connectionHandlerCreator(options)
    );
    const requestTimeout = options.requestTimeout ? options.requestTimeout : WEBRTC_DEFAULT_REQUEST_TIMEOUT;
    const masterHandler = pool.masterReplicationHandler;

    function sendToPeer(peer: PeerType, messageOrResponse: WebRTCMessage | WebRTCResponse) {
        return Promise.resolve()
            .then(() => pool.connectionHandler.send(peer, messageOrResponse))
            .catch(() => {
                /**
                 * Sending fails when the peer disconnected in the meantime.
                 * This is handled by the disconnect$ stream so it can be ignored here.
                 */
            });
    }

    pool.subs.push(
        pool.connectionHandler.error$.subscribe((err: RxError | RxTypeError) => pool.error$.next(err)),
        pool.connectionHandler.disconnect$.subscribe((peer: PeerType) => {
            pool.connectedPeers.delete(peer);
            pool.peerValidity.delete(peer);
            pool.removePeer(peer);
        })
    );

    /**
     * Answer the requests of other peers.
     * This is subscribed once for all peers
     * and independent of which side is master,
     * so that no request gets lost when the remote peer
     * finishes its handshake before the own side has finished it.
     */
    pool.subs.push(
        pool.connectionHandler.message$.subscribe(async (data: PeerWithMessage<PeerType>) => {
            const { peer, message } = data;
            if (message.method === 'token') {
                sendToPeer(peer, {
                    id: message.id,
                    result: storageToken
                });
                return;
            }
            if (!WEBRTC_MASTER_METHODS.includes(message.method)) {
                return;
            }
            const isValid = await pool.isPeerValid(peer);
            if (!isValid || pool.canceled) {
                return;
            }
            let response: WebRTCResponse;
            try {
                const result = await (masterHandler as any)[message.method](...message.params);
                response = {
                    id: message.id,
                    result
                };
            } catch (err: any) {
                response = {
                    id: message.id,
                    result: null,
                    error: errorToPlainJson(err)
                };
            }
            sendToPeer(peer, response);
        })
    );

    const connectSub = pool.connectionHandler.connect$
        .pipe(
            filter(() => !pool.canceled)
        )
        .subscribe(async (peer: PeerType) => {
            pool.connectedPeers.add(peer);
            const isValid = await pool.isPeerValid(peer);
            if (!isValid || !pool.isPeerConnected(peer)) {
                return;
            }

            let peerToken: string;
            try {
                const tokenResponse = await sendMessageAndAwaitAnswer(
                    pool.connectionHandler,
                    peer,
                    {
                        id: getRequestId(),
                        method: 'token',
                        params: []
                    },
                    requestTimeout
                );
                peerToken = tokenResponse.result;
            } catch (error: any) {
                /**
                 * If could not get the tokenResponse,
                 * just ignore that peer.
                 */
                if (pool.isPeerConnected(peer)) {
                    pool.error$.next(newRxError('RC_WEBRTC_PEER', {
                        error: errorToPlainJson(error)
                    }));
                }
                return;
            }
            const isMaster = await isMasterInWebRTCReplication(collection.database.hashFunction, storageToken, peerToken);
            if (!pool.isPeerConnected(peer)) {
                return;
            }

            let replicationState: RxWebRTCReplicationState<RxDocType> | undefined;
            const subs: Subscription[] = [];
            if (isMaster) {
                subs.push(
                    masterHandler.masterChangeStream$.subscribe((ev: any) => {
                        sendToPeer(peer, {
                            id: 'masterChangeStream$',
                            result: ev
                        });
                    })
                );
                /**
                 * Changes that happened between the initial pull of the
                 * remote fork and the start of the change stream would be missed.
                 * So we tell the fork to run a checkpoint iteration.
                 */
                sendToPeer(peer, {
                    id: 'masterChangeStream$',
                    result: 'RESYNC'
                });
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
                        async handler(lastPulledCheckpoint: WebRTCReplicationCheckpoint | undefined) {
                            const answer = await sendMessageAndAwaitAnswer(
                                pool.connectionHandler,
                                peer,
                                {
                                    method: 'masterChangesSince',
                                    params: [
                                        lastPulledCheckpoint,
                                        ensureNotFalsy(options.pull).batchSize
                                    ],
                                    id: getRequestId()
                                },
                                requestTimeout
                            );
                            return answer.result;
                        },
                        stream$: pool.connectionHandler.response$.pipe(
                            filter((m: PeerWithResponse<PeerType>) => m.peer === peer),
                            filter((m: PeerWithResponse<PeerType>) => m.response.id === 'masterChangeStream$'),
                            map((m: PeerWithResponse<PeerType>) => m.response.result)
                        )

                    }) : undefined,
                    push: options.push ? Object.assign({}, options.push, {
                        async handler(docs: RxReplicationWriteToMasterRow<RxDocType>[]) {
                            const answer = await sendMessageAndAwaitAnswer(
                                pool.connectionHandler,
                                peer,
                                {
                                    method: 'masterWrite',
                                    params: [docs],
                                    id: getRequestId()
                                },
                                requestTimeout
                            );
                            return answer.result;
                        }
                    }) : undefined
                });
            }
            pool.addPeer(peer, peerToken, replicationState, subs);
        });
    pool.subs.push(connectSub);
    return pool;
}


/**
 * Because the WebRTC replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
export class RxWebRTCReplicationPool<RxDocType, PeerType> {
    peerStates$: BehaviorSubject<Map<PeerType, WebRTCPeerState<RxDocType, PeerType>>> = new BehaviorSubject(new Map());
    canceled: boolean = false;
    masterReplicationHandler: RxReplicationHandler<RxDocType, WebRTCReplicationCheckpoint>;
    subs: Subscription[] = [];
    peerValidity = new Map<PeerType, Promise<boolean>>();
    connectedPeers = new Set<PeerType>();

    public error$ = new Subject<RxError | RxTypeError>();

    constructor(
        public readonly collection: RxCollection<RxDocType, any, any, any>,
        public readonly options: SyncOptionsWebRTC<RxDocType, PeerType>,
        public readonly connectionHandler: WebRTCConnectionHandler<PeerType>
    ) {
        this.collection.onClose.push(() => this.cancel());
        this.masterReplicationHandler = rxStorageInstanceToReplicationHandler(
            collection.storageInstance,
            collection.conflictHandler,
            collection.database.token,
        );
    }

    /**
     * Returns true if the peer is valid.
     * The result is cached per peer so that
     * options.isPeerValid() is only called once.
     */
    isPeerValid(peer: PeerType): Promise<boolean> {
        let ret = this.peerValidity.get(peer);
        if (!ret) {
            const isPeerValidFn = this.options.isPeerValid;
            ret = isPeerValidFn ?
                Promise.resolve()
                    .then(() => isPeerValidFn(peer))
                    .catch(() => false) :
                PROMISE_RESOLVE_TRUE;
            this.peerValidity.set(peer, ret);
        }
        return ret;
    }

    isPeerConnected(peer: PeerType): boolean {
        return !this.canceled && this.connectedPeers.has(peer);
    }

    addPeer(
        peer: PeerType,
        peerToken: string,
        // only if isMaster=false it has a replicationState
        replicationState?: RxWebRTCReplicationState<RxDocType>,
        subs: Subscription[] = []
    ) {
        const peerState: WebRTCPeerState<RxDocType, PeerType> = {
            peer,
            peerToken,
            replicationState,
            subs
        };
        if (!this.isPeerConnected(peer)) {
            this.cleanupPeerState(peerState);
            return;
        }

        if (replicationState) {
            /**
             * When the connection to the signaling server is re-established,
             * it can happen that a second connection to the same remote instance is created.
             * Running two replications with the same replicationIdentifier would conflict,
             * so the replication of the outdated connection is canceled.
             */
            (Array.from(this.peerStates$.getValue().values()) as WebRTCPeerState<RxDocType, PeerType>[])
                .filter(otherState => otherState.peerToken === peerToken && otherState.replicationState)
                .forEach(otherState => this.removePeer(otherState.peer));

            peerState.subs.push(
                replicationState.error$.subscribe((ev: RxError | RxTypeError) => this.error$.next(ev))
            );
        }
        this.peerStates$.next(this.peerStates$.getValue().set(peer, peerState));
    }
    removePeer(peer: PeerType): Promise<any> {
        const peerStates = this.peerStates$.getValue();
        const peerState = peerStates.get(peer);
        if (!peerState) {
            return PROMISE_RESOLVE_VOID;
        }
        peerStates.delete(peer);
        this.peerStates$.next(peerStates);
        return this.cleanupPeerState(peerState);
    }
    private cleanupPeerState(peerState: WebRTCPeerState<RxDocType, PeerType>): Promise<any> {
        peerState.subs.forEach((sub: Subscription) => sub.unsubscribe());
        if (peerState.replicationState) {
            return peerState.replicationState.cancel();
        }
        return PROMISE_RESOLVE_VOID;
    }

    // often used in unit tests
    awaitFirstPeer() {
        return firstValueFrom(
            this.peerStates$.pipe(
                filter((peerStates: Map<PeerType, WebRTCPeerState<RxDocType, PeerType>>) => peerStates.size > 0)
            )
        );
    }

    public async cancel() {
        if (this.canceled) {
            return;
        }
        this.canceled = true;
        this.subs.forEach((sub: Subscription) => sub.unsubscribe());
        this.connectedPeers.clear();
        this.peerValidity.clear();
        /**
         * The replications must be fully canceled before the cancel() promise resolves,
         * otherwise they could still write to the storage after the database was closed.
         */
        await Promise.all(
            (Array.from(this.peerStates$.getValue().keys()) as PeerType[])
                .map((peer: PeerType) => this.removePeer(peer))
        );
        await this.connectionHandler.close();
    }
}

export * from './webrtc-helper.ts';
export * from './signaling-server.ts';
export * from './webrtc-types.ts';
// export * from './connection-handler-webtorrent';
// export * from './connection-handler-p2pcf';
export * from './connection-handler-simple-peer.ts';
