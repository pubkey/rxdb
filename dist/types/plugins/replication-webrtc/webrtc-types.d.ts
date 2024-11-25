import { Observable, Subscription } from 'rxjs';
import type { MaybePromise, ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions, RxError, RxReplicationHandler, RxStorageDefaultCheckpoint, RxTypeError, StringKeys } from '../../types/index.d.ts';
import { RxReplicationState } from '../replication/index.ts';
import { WebsocketMessageResponseType, WebsocketMessageType } from '../replication-websocket/index.ts';
export type WebRTCReplicationCheckpoint = RxStorageDefaultCheckpoint;
export type WebRTCMessage = Omit<WebsocketMessageType, 'method' | 'collection'> & {
    method: StringKeys<RxReplicationHandler<any, any>> | 'token';
};
export type WebRTCResponse = Omit<WebsocketMessageResponseType, 'collection'>;
export type PeerWithMessage<PeerType> = {
    peer: PeerType;
    message: WebRTCMessage;
};
export type PeerWithResponse<PeerType> = {
    peer: PeerType;
    response: WebRTCResponse;
};
export type WebRTCConnectionHandler<PeerType> = {
    connect$: Observable<PeerType>;
    disconnect$: Observable<PeerType>;
    message$: Observable<PeerWithMessage<PeerType>>;
    response$: Observable<PeerWithResponse<PeerType>>;
    error$: Observable<RxError | RxTypeError>;
    send(peer: PeerType, message: WebRTCMessage | WebRTCResponse): Promise<void>;
    close(): Promise<void>;
};
export type WebRTCConnectionHandlerCreator<PeerType> = (opts: SyncOptionsWebRTC<any, PeerType>) => Promise<WebRTCConnectionHandler<PeerType>>;
export type WebRTCSyncPushOptions<RxDocType> = Omit<ReplicationPushOptions<RxDocType>, 'handler'> & {};
export type WebRTCSyncPullOptions<RxDocType> = Omit<ReplicationPullOptions<RxDocType, WebRTCReplicationCheckpoint>, 'handler' | 'stream$'> & {};
export type SyncOptionsWebRTC<RxDocType, PeerType> = Omit<ReplicationOptions<RxDocType, WebRTCReplicationCheckpoint>, 'pull' | 'push' | 'replicationIdentifier' | 'deletedField' | 'live' | 'autostart' | 'waitForLeadership'> & {
    /**
     * It will only replicate with other instances
     * that use the same topic.
     */
    topic: string;
    connectionHandlerCreator: WebRTCConnectionHandlerCreator<PeerType>;
    /**
     * Run on new peers so that bad peers can be blocked.
     * If returns true, the peer is valid and it will replicate.
     * If returns false, it will drop the peer.
     */
    isPeerValid?: (peer: PeerType) => MaybePromise<boolean>;
    pull?: WebRTCSyncPullOptions<RxDocType>;
    push?: WebRTCSyncPushOptions<RxDocType>;
};
export type RxWebRTCReplicationState<RxDocType> = RxReplicationState<RxDocType, WebRTCReplicationCheckpoint>;
export type WebRTCPeerState<RxDocType, PeerType> = {
    peer: PeerType;
    replicationState?: RxWebRTCReplicationState<RxDocType>;
    subs: Subscription[];
};
