import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import type { RxCollection, RxError, RxReplicationHandler, RxTypeError } from '../../types';
import type { P2PConnectionHandler, P2PPeer, P2PPeerState, P2PReplicationCheckpoint, RxP2PReplicationState, SyncOptionsP2P } from './p2p-types';
export declare function replicateP2P<RxDocType>(options: SyncOptionsP2P<RxDocType>): Promise<RxP2PReplicationPool<RxDocType>>;
/**
 * Because the P2P replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
export declare class RxP2PReplicationPool<RxDocType> {
    readonly collection: RxCollection<RxDocType>;
    readonly options: SyncOptionsP2P<RxDocType>;
    readonly connectionHandler: P2PConnectionHandler;
    peerStates$: BehaviorSubject<Map<P2PPeer, P2PPeerState<RxDocType>>>;
    canceled: boolean;
    masterReplicationHandler: RxReplicationHandler<RxDocType, P2PReplicationCheckpoint>;
    subs: Subscription[];
    error$: Subject<RxError | RxTypeError>;
    constructor(collection: RxCollection<RxDocType>, options: SyncOptionsP2P<RxDocType>, connectionHandler: P2PConnectionHandler);
    addPeer(peer: P2PPeer, replicationState?: RxP2PReplicationState<RxDocType>): void;
    removePeer(peer: P2PPeer): void;
    awaitFirstPeer(): Promise<Map<P2PPeer, P2PPeerState<RxDocType>>>;
    cancel(): Promise<void>;
}
export * from './p2p-helper';
export * from './p2p-types';
export * from './connection-handler-simple-peer';
