import { SubscriptionClient } from 'subscriptions-transport-ws';
import { getFromMapOrThrow } from '../../util';

import {
    WebSocket as IsomorphicWebSocket
} from 'isomorphic-ws';
export type WebsocketWithRefCount = {
    url: string;
    socket: SubscriptionClient;
    refCount: number;
};

export const GRAPHQL_WEBSOCKET_BY_URL: Map<string, WebsocketWithRefCount> = new Map();


export function getGraphQLWebSocket(
    url: string
): SubscriptionClient {
    let has = GRAPHQL_WEBSOCKET_BY_URL.get(url);
    if (!has) {
        const wsClient = new SubscriptionClient(
            url,
            {
                reconnect: true,
            },
            IsomorphicWebSocket
        );
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
    console.log('removeGraphQLWebSocketRef: ' + url);
    const obj = getFromMapOrThrow(GRAPHQL_WEBSOCKET_BY_URL, url);
    obj.refCount = obj.refCount - 1;
    console.log('obj.refCount: ' + obj.refCount);
    if (obj.refCount === 0) {
        GRAPHQL_WEBSOCKET_BY_URL.delete(url);
        obj.socket.close();
    }
}
