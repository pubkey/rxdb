import { RxReplicationState } from '../replication';
import { WebsocketClientOptions } from './websocket-types';
import ReconnectingWebSocket from 'reconnecting-websocket';
import IsomorphicWebSocket from 'isomorphic-ws';
import { Subject, BehaviorSubject } from 'rxjs';
import { RxError } from '../../types';
export type WebsocketClient = {
    url: string;
    socket: ReconnectingWebSocket;
    connected$: BehaviorSubject<boolean>;
    message$: Subject<any>;
    error$: Subject<RxError>;
};
/**
 * Copied and adapter from the 'reconnecting-websocket' npm module.
 * Some bundlers have problems with bundling the isomorphic-ws plugin
 * so we directly check the correctness in RxDB to ensure that we can
 * throw a helpful error.
 */
export declare function ensureIsWebsocket(w: typeof IsomorphicWebSocket): void;
export declare function createWebSocketClient(url: string): Promise<WebsocketClient>;
export declare function replicateWithWebsocketServer<RxDocType, CheckpointType>(options: WebsocketClientOptions<RxDocType>): Promise<RxReplicationState<RxDocType, CheckpointType>>;
