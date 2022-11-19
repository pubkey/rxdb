import { Observable, Subscription } from 'rxjs';
import type { ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions, RxError, RxReplicationHandler, RxStorageDefaultCheckpoint, RxTypeError, StringKeys } from '../../types';
import { RxReplicationState } from '../replication';
import { WebsocketMessageResponseType, WebsocketMessageType } from '../replication-websocket';
export declare type P2PPeer = {
    id: string;
};
export declare type P2PReplicationCheckpoint = RxStorageDefaultCheckpoint;
export declare type P2PMessage = Omit<WebsocketMessageType, 'method' | 'collection'> & {
    method: StringKeys<RxReplicationHandler<any, any>> | 'token';
};
export declare type P2PResponse = Omit<WebsocketMessageResponseType, 'collection'>;
export declare type PeerWithMessage = {
    peer: P2PPeer;
    message: P2PMessage;
};
export declare type PeerWithResponse = {
    peer: P2PPeer;
    response: P2PResponse;
};
export declare type P2PConnectionHandler = {
    connect$: Observable<P2PPeer>;
    disconnect$: Observable<P2PPeer>;
    message$: Observable<PeerWithMessage>;
    response$: Observable<PeerWithResponse>;
    error$: Observable<RxError | RxTypeError>;
    send(peer: P2PPeer, message: P2PMessage | P2PResponse): Promise<void>;
    destroy(): Promise<void>;
};
export declare type P2PConnectionHandlerCreator = (opts: SyncOptionsP2P<any>) => P2PConnectionHandler;
export declare type P2PSyncPushOptions<RxDocType> = Omit<ReplicationPushOptions<RxDocType>, 'handler'> & {};
export declare type P2PSyncPullOptions<RxDocType> = Omit<ReplicationPullOptions<RxDocType, P2PReplicationCheckpoint>, 'handler' | 'stream$'> & {};
export declare type SyncOptionsP2P<RxDocType> = Omit<ReplicationOptions<RxDocType, P2PReplicationCheckpoint>, 'pull' | 'push' | 'replicationIdentifier' | 'collection' | 'deletedField' | 'live' | 'autostart' | 'waitForLeadership'> & {
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
export declare type RxP2PReplicationState<RxDocType> = RxReplicationState<RxDocType, P2PReplicationCheckpoint>;
export declare type P2PPeerState<RxDocType> = {
    peer: P2PPeer;
    replicationState?: RxP2PReplicationState<RxDocType>;
    subs: Subscription[];
};
