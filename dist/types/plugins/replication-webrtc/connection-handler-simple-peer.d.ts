import type { WebRTCConnectionHandlerCreator } from './webrtc-types.ts';
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
/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export declare function getConnectionHandlerSimplePeer(serverUrl: string, wrtc?: any): WebRTCConnectionHandlerCreator;
