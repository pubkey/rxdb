import type { HashFunction } from '../../types';
import type { P2PConnectionHandler, P2PMessage, P2PPeer, P2PResponse } from './p2p-types';
/**
 * To deterministically define which peer is master and
 * which peer is fork, we compare the storage tokens.
 * But we have to hash them before, to ensure that
 * a storageToken like 'aaaaaa' is not always the master
 * for all peers.
 */
export declare function isMasterInP2PReplication(hashFunction: HashFunction, ownStorageToken: string, otherStorageToken: string): boolean;
export declare function sendMessageAndAwaitAnswer(handler: P2PConnectionHandler, peer: P2PPeer, message: P2PMessage): Promise<P2PResponse>;
