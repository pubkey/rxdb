import { SubscriptionClient } from 'subscriptions-transport-ws';
export declare type WebsocketWithRefCount = {
    url: string;
    socket: SubscriptionClient;
    refCount: number;
};
export declare const GRAPHQL_WEBSOCKET_BY_URL: Map<string, WebsocketWithRefCount>;
export declare function getGraphQLWebSocket(url: string): SubscriptionClient;
export declare function removeGraphQLWebSocketRef(url: string): void;
