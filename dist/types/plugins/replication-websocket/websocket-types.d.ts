import type { Observable } from 'rxjs';
import type { ServerOptions, ClientOptions, WebSocketServer, WebSocket } from 'ws';
import type { RxCollection, RxDatabase, RxReplicationHandler, StringKeys } from '../../types';
export declare type WebsocketServerOptions = {
    database: RxDatabase<any, any, any>;
} & ServerOptions;
export declare type WebsocketServerState = {
    server: WebSocketServer;
    close: () => Promise<void>;
    onConnection$: Observable<WebSocket>;
};
export declare type WebsocketClientOptions<RxDocType> = {
    collection: RxCollection<RxDocType>;
    url: string;
    batchSize?: number;
} & ClientOptions;
export declare type WebsocketMessageType = {
    id: string;
    collection: string;
    method: StringKeys<RxReplicationHandler<any, any>>;
    params: any[];
};
export declare type WebsocketMessageResponseType = {
    id: string;
    collection: string;
    result: any;
};
