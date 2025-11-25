import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import type { RxCollection, RxError, RxReplicationHandler, RxTypeError } from '../../types/index.d.ts';
import type { WebRTCConnectionHandler, WebRTCPeerState, WebRTCReplicationCheckpoint, RxWebRTCReplicationState, SyncOptionsWebRTC } from './webrtc-types.ts';
export declare function replicateWebRTC<RxDocType, PeerType>(options: SyncOptionsWebRTC<RxDocType, PeerType>): Promise<RxWebRTCReplicationPool<RxDocType, PeerType>>;
/**
 * Because the WebRTC replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
export declare class RxWebRTCReplicationPool<RxDocType, PeerType> {
    readonly collection: RxCollection<RxDocType, any, any, any>;
    readonly options: SyncOptionsWebRTC<RxDocType, PeerType>;
    readonly connectionHandler: WebRTCConnectionHandler<PeerType>;
    peerStates$: BehaviorSubject<Map<PeerType, WebRTCPeerState<RxDocType, PeerType>>>;
    canceled: boolean;
    masterReplicationHandler: RxReplicationHandler<RxDocType, WebRTCReplicationCheckpoint>;
    subs: Subscription[];
    error$: Subject<RxError | RxTypeError>;
    constructor(collection: RxCollection<RxDocType, any, any, any>, options: SyncOptionsWebRTC<RxDocType, PeerType>, connectionHandler: WebRTCConnectionHandler<PeerType>);
    addPeer(peer: PeerType, replicationState?: RxWebRTCReplicationState<RxDocType>): void;
    removePeer(peer: PeerType): void;
    awaitFirstPeer(): Promise<Map<PeerType, WebRTCPeerState<RxDocType, PeerType>>>;
    cancel(): Promise<void>;
}
export * from './webrtc-helper.ts';
export * from './signaling-server.ts';
export * from './webrtc-types.ts';
export * from './connection-handler-simple-peer.ts';
