import { Client } from 'graphql-ws';
import { RxGraphQLPullWSOptions } from '../../types';
export type WebsocketWithRefCount = {
    url: string;
    socket: Client;
    refCount: number;
};
export declare const GRAPHQL_WEBSOCKET_BY_URL: Map<string, WebsocketWithRefCount>;
export declare function getGraphQLWebSocket(url: string, headers?: {
    [k: string]: string;
}, options?: RxGraphQLPullWSOptions): Client;
export declare function removeGraphQLWebSocketRef(url: string): void;
