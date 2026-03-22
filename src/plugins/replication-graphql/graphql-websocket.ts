import { Client, createClient } from 'graphql-ws';
import { getFromMapOrThrow } from '../../plugins/utils/index.ts';
import { WebSocket } from 'ws';
import { RxGraphQLPullWSOptions } from '../../types';

export type WebsocketWithRefCount = {
    url: string;
    socket: Client;
    refCount: number;
};

export const GRAPHQL_WEBSOCKET_BY_URL: Map<string, WebsocketWithRefCount> = new Map();


export function getGraphQLWebSocket(
    url: string,
    headers?: { [k: string]: string; },
    options: RxGraphQLPullWSOptions = {},
): Client {

    let has = GRAPHQL_WEBSOCKET_BY_URL.get(url);
    if (has) {
        has.refCount = has.refCount + 1;
    } else {
        const connectionParamsHeaders = headers ? { headers } : undefined;
        const wsClient = createClient({
            ...options,
            url,
            shouldRetry: () => true,
            webSocketImpl: WebSocket,
            connectionParams: options.connectionParams || connectionParamsHeaders,
        });
        has = {
            url,
            socket: wsClient,
            refCount: 1
        };
        GRAPHQL_WEBSOCKET_BY_URL.set(url, has);
    }
    return has.socket;
}


export function removeGraphQLWebSocketRef(
    url: string
) {
    const obj = getFromMapOrThrow(GRAPHQL_WEBSOCKET_BY_URL, url);
    obj.refCount = obj.refCount - 1;
    if (obj.refCount === 0) {
        GRAPHQL_WEBSOCKET_BY_URL.delete(url);
        obj.socket.dispose();
    }
}
