import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import type { RxCollection, RxError, RxReplicationHandler, RxTypeError } from '../../types/index.d.ts';
import type { WebRTCConnectionHandler, WebRTCPeer, WebRTCPeerState, WebRTCReplicationCheckpoint, RxWebRTCReplicationState, SyncOptionsWebRTC } from './webrtc-types.ts';
export declare function replicateWebRTC<RxDocType>(options: SyncOptionsWebRTC<RxDocType>): Promise<RxWebRTCReplicationPool<RxDocType>>;
/**
 * Because the WebRTC replication runs between many instances,
 * we use a Pool instead of returning a single replication state.
 */
export declare class RxWebRTCReplicationPool<RxDocType> {
    readonly collection: RxCollection<RxDocType>;
    readonly options: SyncOptionsWebRTC<RxDocType>;
    readonly connectionHandler: WebRTCConnectionHandler;
    peerStates$: BehaviorSubject<Map<WebRTCPeer, WebRTCPeerState<RxDocType>>>;
    canceled: boolean;
    masterReplicationHandler: RxReplicationHandler<RxDocType, WebRTCReplicationCheckpoint>;
    subs: Subscription[];
    error$: Subject<RxError | RxTypeError>;
    constructor(collection: RxCollection<RxDocType>, options: SyncOptionsWebRTC<RxDocType>, connectionHandler: WebRTCConnectionHandler);
    addPeer(peer: WebRTCPeer, replicationState?: RxWebRTCReplicationState<RxDocType>): void;
    removePeer(peer: WebRTCPeer): void;
    awaitFirstPeer(): Promise<Map<WebRTCPeer, WebRTCPeerState<RxDocType>>>;
    cancel(): Promise<void>;
}
export * from './webrtc-helper.ts';
export * from './webrtc-types.ts';
export * from './connection-handler-simple-peer.ts';
