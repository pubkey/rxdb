import type { WebRTCConnectionHandlerCreator } from './webrtc-types.ts';
import type { Instance as SimplePeerInstance, Options as SimplePeerOptions } from 'simple-peer';
export type SimplePeer = SimplePeerInstance & {
    id: string;
};
export type SimplePeerInitMessage = {
    type: 'init';
    yourPeerId: string;
};
export type SimplePeerJoinMessage = {
    type: 'join';
    room: string;
};
export type SimplePeerJoinedMessage = {
    type: 'joined';
    otherPeerIds: string[];
};
export type SimplePeerSignalMessage = {
    type: 'signal';
    room: string;
    senderPeerId: string;
    receiverPeerId: string;
    data: string;
};
export type SimplePeerPingMessage = {
    type: 'ping';
};
export type PeerMessage = SimplePeerInitMessage | SimplePeerJoinMessage | SimplePeerJoinedMessage | SimplePeerSignalMessage | SimplePeerPingMessage;
export declare const DEFAULT_SIGNALING_SERVER: string;
export type SimplePeerWrtc = SimplePeerOptions['wrtc'];
export type SimplePeerConfig = SimplePeerOptions['config'];
export type SimplePeerWebSocketConstructor = {
    new (url: string): WebSocket;
};
export type SimplePeerConnectionHandlerOptions = {
    /**
     * If no server is specified, the default signaling server
     * from signaling.rxdb.info is used.
     * This server is not reliable and you should use
     * your own signaling server instead.
     */
    signalingServerUrl?: string;
    wrtc?: SimplePeerWrtc;
    config?: SimplePeerConfig;
    webSocketConstructor?: SimplePeerWebSocketConstructor;
};
export declare const SIMPLE_PEER_PING_INTERVAL: number;
/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export declare function getConnectionHandlerSimplePeer({ signalingServerUrl, wrtc, config, webSocketConstructor }: SimplePeerConnectionHandlerOptions): WebRTCConnectionHandlerCreator<SimplePeer>;
/**
 * Multiple people had problems because it requires to have
 * the nextTick() method in the runtime. So we check here and
 * throw a helpful error.
 */
export declare function ensureProcessNextTickIsSet(): void;
