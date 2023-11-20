import { Observable, Subscription } from 'rxjs';
import type { ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions, RxError, RxReplicationHandler, RxStorageDefaultCheckpoint, RxTypeError, StringKeys } from '../../types/index.d.ts';
import { RxReplicationState } from '../replication/index.ts';
import { WebsocketMessageResponseType, WebsocketMessageType } from '../replication-websocket/index.ts';
export type WebRTCPeer = {
    id: string;
};
export type WebRTCReplicationCheckpoint = RxStorageDefaultCheckpoint;
export type WebRTCMessage = Omit<WebsocketMessageType, 'method' | 'collection'> & {
    method: StringKeys<RxReplicationHandler<any, any>> | 'token';
};
export type WebRTCResponse = Omit<WebsocketMessageResponseType, 'collection'>;
export type PeerWithMessage = {
    peer: WebRTCPeer;
    message: WebRTCMessage;
};
export type PeerWithResponse = {
    peer: WebRTCPeer;
    response: WebRTCResponse;
};
export type WebRTCConnectionHandler = {
    connect$: Observable<WebRTCPeer>;
    disconnect$: Observable<WebRTCPeer>;
    message$: Observable<PeerWithMessage>;
    response$: Observable<PeerWithResponse>;
    error$: Observable<RxError | RxTypeError>;
    send(peer: WebRTCPeer, message: WebRTCMessage | WebRTCResponse): Promise<void>;
    destroy(): Promise<void>;
};
export type WebRTCConnectionHandlerCreator = (opts: SyncOptionsWebRTC<any>) => Promise<WebRTCConnectionHandler>;
export type WebRTCSyncPushOptions<RxDocType> = Omit<ReplicationPushOptions<RxDocType>, 'handler'> & {};
export type WebRTCSyncPullOptions<RxDocType> = Omit<ReplicationPullOptions<RxDocType, WebRTCReplicationCheckpoint>, 'handler' | 'stream$'> & {};
export type SyncOptionsWebRTC<RxDocType> = Omit<ReplicationOptions<RxDocType, WebRTCReplicationCheckpoint>, 'pull' | 'push' | 'replicationIdentifier' | 'deletedField' | 'live' | 'autostart' | 'waitForLeadership'> & {
    /**
     * It will only replicate with other instances
     * that use the same topic and
     * are able to prove that they know the secret.
     */
    topic: string;
    secret: string;
    connectionHandlerCreator: WebRTCConnectionHandlerCreator;
    pull?: WebRTCSyncPullOptions<RxDocType>;
    push?: WebRTCSyncPushOptions<RxDocType>;
};
export type RxWebRTCReplicationState<RxDocType> = RxReplicationState<RxDocType, WebRTCReplicationCheckpoint>;
export type WebRTCPeerState<RxDocType> = {
    peer: WebRTCPeer;
    replicationState?: RxWebRTCReplicationState<RxDocType>;
    subs: Subscription[];
};
