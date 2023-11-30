import type { WebRTCConnectionHandlerCreator } from './webrtc-types.ts';
import { Options as SimplePeerOptions } from 'simple-peer';
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
export type PeerMessage = SimplePeerInitMessage | SimplePeerJoinMessage | SimplePeerJoinedMessage | SimplePeerSignalMessage;
export declare const DEFAULT_SIGNALING_SERVER: string;
export type SimplePeerWrtc = SimplePeerOptions['wrtc'];
export type SimplePeerConnectionHandlerOptions = {
    /**
     * If no server is specified, the default signaling server
     * from signaling.rxdb.info is used.
     * This server is not reliable and you should use
     * your own signaling server instead.
     */
    signalingServerUrl?: string;
    wrtc?: SimplePeerWrtc;
    webSocketConstructor?: WebSocket;
};
/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export declare function getConnectionHandlerSimplePeer({ signalingServerUrl, wrtc, webSocketConstructor }: SimplePeerConnectionHandlerOptions): WebRTCConnectionHandlerCreator;
