import type { ServerOptions, ClientOptions, WebSocketServer } from 'ws';
import type { RxCollection, RxDatabase, RxReplicationHandler, StringKeys } from '../../types';
export declare type WebsocketServerOptions = {
    database: RxDatabase<any, any, any>;
} & ServerOptions;
export declare type WebsocketServerState = {
    server: WebSocketServer;
    close: () => Promise<void>;
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
