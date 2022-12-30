import { Client, createClient } from 'graphql-ws';
import { getFromMapOrThrow } from '../../plugins/utils';
import ws from 'isomorphic-ws';

const { WebSocket: IsomorphicWebSocket } = ws;

export type WebsocketWithRefCount = {
    url: string;
    socket: Client;
    refCount: number;
};

export const GRAPHQL_WEBSOCKET_BY_URL: Map<string, WebsocketWithRefCount> = new Map();


export function getGraphQLWebSocket(
    url: string
): Client {
    let has = GRAPHQL_WEBSOCKET_BY_URL.get(url);
    if (!has) {
        const wsClient = createClient({
            url,
            shouldRetry: () => true,
            webSocketImpl: IsomorphicWebSocket,
        });
        has = {
            url,
            socket: wsClient,
            refCount: 1
        };
        GRAPHQL_WEBSOCKET_BY_URL.set(url, has);
    } else {
        has.refCount = has.refCount + 1;
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
