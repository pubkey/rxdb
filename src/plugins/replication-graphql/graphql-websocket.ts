import { Client, createClient } from 'graphql-ws';
import { getFromMapOrCreate, getFromMapOrThrow } from '../../plugins/utils/index.ts';
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

    const has = getFromMapOrCreate(
        GRAPHQL_WEBSOCKET_BY_URL,
        url,
        () => {
            const connectionParamsHeaders = headers ? { headers } : undefined;
            const wsClient = createClient({
                ...options,
                url,
                shouldRetry: () => true,
                webSocketImpl: WebSocket,
                connectionParams: options.connectionParams || connectionParamsHeaders,
            });
            return {
                url,
                socket: wsClient,
                refCount: 1
            };
        },
        (value) => {
            value.refCount = value.refCount + 1;
        }
    );
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
