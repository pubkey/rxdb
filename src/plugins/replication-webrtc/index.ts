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
    getFromMapOrThrow,
    randomCouchString
} from '../../plugins/utils/index.ts';
import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import { replicateRxCollection } from '../replication/index.ts';
import {
    isMasterInWebRTCReplication,
    sendMessageAndAwaitAnswer
} from './webrtc-helper.ts';
import type {
    WebRTCConnectionHandler,
    WebRTCPeer,
    WebRTCPeerState,
    WebRTCReplicationCheckpoint,
    WebRTCResponse,
    RxWebRTCReplicationState,
    SyncOptionsWebRTC
} from './webrtc-types.ts';


export async function replicateWebRTC<RxDocType>(
    options: SyncOptionsWebRTC<RxDocType>
): Promise<RxWebRTCReplicationPool<RxDocType>> {
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
    const requestFlag = randomCouchString(10);
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


    pool.subs.push(
        pool.connectionHandler.error$.subscribe(err => pool.error$.next(err)),
        pool.connectionHandler.disconnect$.subscribe(peer => pool.removePeer(peer))
    );

    /**
     * Answer if someone requests our storage token
     */
    pool.subs.push(
        pool.connectionHandler.message$.pipe(
            filter(data => data.message.method === 'token')
        ).subscribe(data => {
            pool.connectionHandler.send(data.peer, {
                id: data.message.id,
                result: storageToken
            });
        })
    );

    const connectSub = pool.connectionHandler.connect$
        .pipe(
            filter(() => !pool.canceled)
        )
        .subscribe(async (peer) => {
            /**
             * TODO ensure both know the correct secret
             */
            const tokenResponse = await sendMessageAndAwaitAnswer(
                pool.connectionHandler,
                peer,
                {
                    id: getRequestId(),
                    method: 'token',
                    params: []
                }
            );
            const peerToken: string = tokenResponse.result;
            const isMaster = await isMasterInWebRTCReplication(collection.database.hashFunction, storageToken, peerToken);

            let replicationState: RxWebRTCReplicationState<RxDocType> | undefined;
            if (isMaster) {
                const masterHandler = pool.masterReplicationHandler;
                const masterChangeStreamSub = masterHandler.masterChangeStream$.subscribe(ev => {
                    const streamResponse: WebRTCResponse = {
                        id: 'masterChangeStream$',
                        result: ev
                    };
                    pool.connectionHandler.send(peer, streamResponse);
                });

                // clean up the subscription
                pool.subs.push(
                    masterChangeStreamSub,
                    pool.connectionHandler.disconnect$.pipe(
                        filter(p => p.id === peer.id)
                    ).subscribe(() => masterChangeStreamSub.unsubscribe())
                );

                const messageSub = pool.connectionHandler.message$
                    .pipe(
                        filter(data => data.peer.id === peer.id),
                        filter(data => data.message.method !== 'token')
                    )
                    .subscribe(async (data) => {
                        const { peer: msgPeer, message } = data;
                        /**
                         * If it is not a function,
                         * it means that the client requested the masterChangeStream$
                         */
                        const method = (masterHandler as any)[message.method].bind(masterHandler);
                        const result = await (method as any)(...message.params);
                        const response: WebRTCResponse = {
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
                                }
                            );
                            return answer.result;
                        },
                        stream$: pool.connectionHandler.response$.pipe(
                            filter(m => m.response.id === 'masterChangeStream$'),
                            map(m => m.response.result)
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
                                }
                            );
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
export class RxWebRTCReplicationPool<RxDocType> {

    peerStates$: BehaviorSubject<Map<WebRTCPeer, WebRTCPeerState<RxDocType>>> = new BehaviorSubject(new Map());
    canceled: boolean = false;
    masterReplicationHandler: RxReplicationHandler<RxDocType, WebRTCReplicationCheckpoint>;
    subs: Subscription[] = [];

    public error$ = new Subject<RxError | RxTypeError>();

    constructor(
        public readonly collection: RxCollection<RxDocType>,
        public readonly options: SyncOptionsWebRTC<RxDocType>,
        public readonly connectionHandler: WebRTCConnectionHandler
    ) {
        this.collection.onDestroy.push(() => this.cancel());
        this.masterReplicationHandler = rxStorageInstanceToReplicationHandler(
            collection.storageInstance,
            collection.conflictHandler,
            collection.database.token,
        );
    }

    addPeer(
        peer: WebRTCPeer,
        replicationState?: RxWebRTCReplicationState<RxDocType>
    ) {
        const peerState: WebRTCPeerState<RxDocType> = {
            peer,
            replicationState,
            subs: []
        };
        this.peerStates$.next(this.peerStates$.getValue().set(peer, peerState));
        if (replicationState) {
            peerState.subs.push(
                replicationState.error$.subscribe(ev => this.error$.next(ev))
            );
        }
    }
    removePeer(peer: WebRTCPeer) {
        const peerState = getFromMapOrThrow(this.peerStates$.getValue(), peer);
        this.peerStates$.getValue().delete(peer);
        this.peerStates$.next(this.peerStates$.getValue());
        peerState.subs.forEach(sub => sub.unsubscribe());
        if (peerState.replicationState) {
            peerState.replicationState.cancel();
        }
    }

    // often used in unit tests
    awaitFirstPeer() {
        return firstValueFrom(
            this.peerStates$.pipe(
                filter(peerStates => peerStates.size > 0)
            )
        );
    }

    public async cancel() {
        if (this.canceled) {
            return;
        }
        this.canceled = true;
        this.subs.forEach(sub => sub.unsubscribe());
        Array.from(this.peerStates$.getValue().keys()).forEach(peer => {
            this.removePeer(peer);
        });
        await this.connectionHandler.destroy();
    }
}

export * from './webrtc-helper.ts';
export * from './webrtc-types.ts';
// export * from './connection-handler-webtorrent';
// export * from './connection-handler-p2pcf';
export * from './connection-handler-simple-peer.ts';
