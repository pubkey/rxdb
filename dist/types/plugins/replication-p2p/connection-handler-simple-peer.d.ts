import type { P2PConnectionHandlerCreator } from './p2p-types';
/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export declare function getConnectionHandlerSimplePeer(serverUrl: string, wrtc?: any): P2PConnectionHandlerCreator;
