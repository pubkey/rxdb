import type { WebRTCConnectionHandlerCreator } from './webrtc-types.ts';
/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export declare function getConnectionHandlerSimplePeer(serverUrl: string, wrtc?: any): WebRTCConnectionHandlerCreator;
