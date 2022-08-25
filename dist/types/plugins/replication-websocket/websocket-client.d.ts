import { RxReplicationState } from '../replication';
import { WebsocketClientOptions, WebsocketMessageResponseType } from './websocket-types';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { Subject } from 'rxjs';
import { RxError } from '../../types';
export declare type WebsocketWithRefCount = {
    url: string;
    socket: ReconnectingWebSocket;
    refCount: number;
    openPromise: Promise<void>;
    connect$: Subject<void>;
    message$: Subject<WebsocketMessageResponseType>;
    error$: Subject<RxError>;
};
/**
 * Reuse the same socket even when multiple
 * collection replicate with the same server at once.
 */
export declare const WEBSOCKET_BY_URL: Map<string, WebsocketWithRefCount>;
export declare function getWebSocket(url: string): Promise<WebsocketWithRefCount>;
export declare function removeWebSocketRef(url: string): void;
export declare function replicateWithWebsocketServer<RxDocType, CheckpointType>(options: WebsocketClientOptions<RxDocType>): Promise<RxReplicationState<RxDocType, CheckpointType>>;
