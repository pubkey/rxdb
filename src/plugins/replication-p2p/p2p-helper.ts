import type {
    HashFunction
} from '../../types';
import type {
    P2PConnectionHandler,
    P2PConnectionHandlerCreator,
    P2PMessage,
    P2PPeer,
    P2PResponse,
    PeerWithMessage,
    PeerWithResponse
} from './p2p-types';
import { filter, firstValueFrom, map, Subject } from 'rxjs';
import { PROMISE_RESOLVE_VOID } from '../../util';



/**
 * To deterministically define which peer is master and
 * which peer is fork, we compare the storage tokens.
 * But we have to hash them before, to ensure that
 * a storageToken like 'aaaaaa' is not always the master
 * for all peers.
 */
export function isMasterInP2PReplication(
    hashFunction: HashFunction,
    ownStorageToken: string,
    otherStorageToken: string
): boolean {
    const isMaster =
        hashFunction([ownStorageToken, otherStorageToken].join('|'))
        >
        hashFunction([otherStorageToken, ownStorageToken].join('|'));
    return isMaster;
}

export function sendMessageAndAwaitAnswer(
    handler: P2PConnectionHandler,
    peer: P2PPeer,
    message: P2PMessage
): Promise<P2PResponse> {
    const requestId = message.id;
    const answerPromise = firstValueFrom(
        handler.response$.pipe(
            filter(d => d.peer === peer),
            filter(d => d.response.id === requestId),
            map(d => d.response)
        )
    );
    handler.send(peer, message);
    return answerPromise;
}
