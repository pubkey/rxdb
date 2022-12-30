import { RxReplicationState } from '../replication';
import { WebsocketClientOptions } from './websocket-types';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { Subject, BehaviorSubject } from 'rxjs';
import { RxDatabase, RxError } from '../../types';
export type WebsocketWithRefCount = {
    url: string;
    socket: ReconnectingWebSocket;
    refCount: number;
    openPromise: Promise<void>;
    connected$: BehaviorSubject<boolean>;
    message$: Subject<any>;
    error$: Subject<RxError>;
};
/**
 * Reuse the same socket even when multiple
 * collection replicate with the same server at once.
 */
export declare const WEBSOCKET_BY_CACHE_KEY: Map<string, WebsocketWithRefCount>;
export declare function getWebSocket(url: string, 
/**
 * The value of RxDatabase.token.
 */
databaseToken: string): Promise<WebsocketWithRefCount>;
export declare function removeWebSocketRef(url: string, database: RxDatabase): void;
export declare function replicateWithWebsocketServer<RxDocType, CheckpointType>(options: WebsocketClientOptions<RxDocType>): Promise<RxReplicationState<RxDocType, CheckpointType>>;
