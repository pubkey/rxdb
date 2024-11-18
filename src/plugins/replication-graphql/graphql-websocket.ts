import { Client, createClient } from 'graphql-ws';
import { getFromMapOrCreate, getFromMapOrThrow } from '../../plugins/utils/index.ts';
import ws from 'isomorphic-ws';
import { RxGraphQLPullWSOptions } from '../../types';

const { WebSocket: IsomorphicWebSocket } = ws;

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
            const wsClient = createClient({
                ...options,
                url,
                shouldRetry: () => true,
                webSocketImpl: IsomorphicWebSocket,
                connectionParams: headers ? { headers } : undefined,
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
