import type { WebSocket, ServerOptions } from 'ws';
export declare const PEER_ID_LENGTH = 12;
export type ServerPeer = {
    id: string;
    socket: WebSocket;
    rooms: Set<string>;
    lastPing: number;
};
/**
 * Starts a WebRTC signaling server
 * that can be used in tests.
*/
export declare function startSignalingServerSimplePeer(serverOptions: ServerOptions): Promise<{
    port: number | undefined;
    server: import("ws").Server<typeof import("ws"), typeof import("http").IncomingMessage>;
    localUrl: string;
}>;
