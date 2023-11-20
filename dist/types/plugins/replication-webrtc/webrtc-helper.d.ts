import type { HashFunction } from '../../types/index.d.ts';
import type { WebRTCConnectionHandler, WebRTCMessage, WebRTCPeer, WebRTCResponse } from './webrtc-types.ts';
/**
 * To deterministically define which peer is master and
 * which peer is fork, we compare the storage tokens.
 * But we have to hash them before, to ensure that
 * a storageToken like 'aaaaaa' is not always the master
 * for all peers.
 */
export declare function isMasterInWebRTCReplication(hashFunction: HashFunction, ownStorageToken: string, otherStorageToken: string): Promise<boolean>;
export declare function sendMessageAndAwaitAnswer(handler: WebRTCConnectionHandler, peer: WebRTCPeer, message: WebRTCMessage): Promise<WebRTCResponse>;
