import { Observable, Subscription } from 'rxjs';
import type { ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions, RxError, RxReplicationHandler, RxStorageDefaultCheckpoint, RxTypeError, StringKeys } from '../../types';
import { RxReplicationState } from '../replication';
import { WebsocketMessageResponseType, WebsocketMessageType } from '../replication-websocket';
export type P2PPeer = {
    id: string;
};
export type P2PReplicationCheckpoint = RxStorageDefaultCheckpoint;
export type P2PMessage = Omit<WebsocketMessageType, 'method' | 'collection'> & {
    method: StringKeys<RxReplicationHandler<any, any>> | 'token';
};
export type P2PResponse = Omit<WebsocketMessageResponseType, 'collection'>;
export type PeerWithMessage = {
    peer: P2PPeer;
    message: P2PMessage;
};
export type PeerWithResponse = {
    peer: P2PPeer;
    response: P2PResponse;
};
export type P2PConnectionHandler = {
    connect$: Observable<P2PPeer>;
    disconnect$: Observable<P2PPeer>;
    message$: Observable<PeerWithMessage>;
    response$: Observable<PeerWithResponse>;
    error$: Observable<RxError | RxTypeError>;
    send(peer: P2PPeer, message: P2PMessage | P2PResponse): Promise<void>;
    destroy(): Promise<void>;
};
export type P2PConnectionHandlerCreator = (opts: SyncOptionsP2P<any>) => P2PConnectionHandler;
export type P2PSyncPushOptions<RxDocType> = Omit<ReplicationPushOptions<RxDocType>, 'handler'> & {};
export type P2PSyncPullOptions<RxDocType> = Omit<ReplicationPullOptions<RxDocType, P2PReplicationCheckpoint>, 'handler' | 'stream$'> & {};
export type SyncOptionsP2P<RxDocType> = Omit<ReplicationOptions<RxDocType, P2PReplicationCheckpoint>, 'pull' | 'push' | 'replicationIdentifier' | 'deletedField' | 'live' | 'autostart' | 'waitForLeadership'> & {
    /**
     * It will only replicate with other instances
     * that use the same topic and
     * are able to prove that they know the secret.
     */
    topic: string;
    secret: string;
    connectionHandlerCreator: P2PConnectionHandlerCreator;
    pull?: P2PSyncPullOptions<RxDocType>;
    push?: P2PSyncPushOptions<RxDocType>;
};
export type RxP2PReplicationState<RxDocType> = RxReplicationState<RxDocType, P2PReplicationCheckpoint>;
export type P2PPeerState<RxDocType> = {
    peer: P2PPeer;
    replicationState?: RxP2PReplicationState<RxDocType>;
    subs: Subscription[];
};
