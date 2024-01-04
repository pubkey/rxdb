import type { HashFunction } from '../../types/index.d.ts';
import type { WebRTCConnectionHandler, WebRTCMessage, WebRTCResponse } from './webrtc-types.ts';
/**
 * To deterministically define which peer is master and
 * which peer is fork, we compare the storage tokens.
 * But we have to hash them before, to ensure that
 * a storageToken like 'aaaaaa' is not always the master
 * for all peers.
 */
export declare function isMasterInWebRTCReplication(hashFunction: HashFunction, ownStorageToken: string, otherStorageToken: string): Promise<boolean>;
/**
 * Send a message to the peer and await the answer.
 * @throws with an EmptyErrorImpl if the peer connection
 * was closed before an answer was received.
 */
export declare function sendMessageAndAwaitAnswer<PeerType>(handler: WebRTCConnectionHandler<PeerType>, peer: PeerType, message: WebRTCMessage): Promise<WebRTCResponse>;
