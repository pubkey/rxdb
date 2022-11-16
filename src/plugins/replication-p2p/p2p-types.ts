import { Subscription } from 'rxjs';
import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxStorageDefaultCheckpoint
} from '../../types';
import { RxReplicationState } from '../replication';
import { WebsocketMessageResponseType, WebsocketMessageType } from '../replication-websocket';

export type P2PPeer = {
    id: string;
    respond(response: P2PResponse): Promise<void>;
};
export type P2PReplicationCheckpoint = RxStorageDefaultCheckpoint;


export type P2PMessage = WebsocketMessageType;
export type P2PResponse = WebsocketMessageResponseType;

export type P2PConnectionHandler = {
    on(k: 'connect', fn: (peer: P2PPeer) => void): void;
    on(k: 'disconnect', fn: (peer: P2PPeer) => void): void;
    on(k: 'message', fn: (peer: P2PPeer, message: P2PMessage) => void): void;

    send(peer: P2PPeer, message: P2PMessage): Promise<[P2PPeer, P2PResponse]>;
    destroy(): Promise<void>;
};

export type P2PConnectionHandlerCreator = (
    peerId: string,
    opts: SyncOptionsP2P<any>
) => P2PConnectionHandler;

export type P2PSyncPushOptions<RxDocType> = Omit<
    ReplicationPushOptions<RxDocType>,
    'handler'
> & {};

export type P2PSyncPullOptions<RxDocType> = Omit<
    ReplicationPullOptions<RxDocType, P2PReplicationCheckpoint>,
    'handler' | 'stream$'
> & {};

export type SyncOptionsP2P<RxDocType> = Omit<
    ReplicationOptions<RxDocType, P2PReplicationCheckpoint>,
    'pull' |
    'push' |
    'replicationIdentifier' |
    'collection' |
    'deletedField' |
    'live' |
    'autostart'
> & {
    topic: string;
    secret: string;
    connectionHandlerCreator: P2PConnectionHandlerCreator;
    pull?: P2PSyncPullOptions<RxDocType>;
    push?: P2PSyncPushOptions<RxDocType>;
}

export type RxP2PReplicationState<RxDocType> = RxReplicationState<RxDocType, P2PReplicationCheckpoint>;


export type P2PPeerState<RxDocType> = {
    peer: P2PPeer;
    // only exists when the peer was picked as master and the own client was picked as fork.
    replicationState?: RxP2PReplicationState<RxDocType>;
    // clean this up when removing the peer
    subs: Subscription[];
}
