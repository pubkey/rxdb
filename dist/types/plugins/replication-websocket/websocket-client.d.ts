import { WebsocketClientOptions } from './websocket-types';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { Subject } from 'rxjs';
export declare type WebsocketWithRefCount = {
    url: string;
    socket: ReconnectingWebSocket;
    refCount: number;
    openPromise: Promise<void>;
    connect$: Subject<void>;
};
/**
 * Reuse the same socket even when multiple
 * collection replicate with the same server at once.
 */
export declare const WEBSOCKET_BY_URL: Map<string, WebsocketWithRefCount>;
export declare function getWebSocket(url: string): Promise<WebsocketWithRefCount>;
export declare function removeWebSocketRef(url: string): void;
export declare function replicateWithWebsocketServer<RxDocType, CheckpointType>(options: WebsocketClientOptions<RxDocType>): Promise<import("../replication").RxReplicationState<RxDocType, CheckpointType>>;
