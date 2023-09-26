import type {
    HashFunction
} from '../../types';
import type {
    WebRTCConnectionHandler,
    WebRTCMessage,
    WebRTCPeer,
    WebRTCResponse
} from './webrtc-types';
import { filter, firstValueFrom, map } from 'rxjs';



/**
 * To deterministically define which peer is master and
 * which peer is fork, we compare the storage tokens.
 * But we have to hash them before, to ensure that
 * a storageToken like 'aaaaaa' is not always the master
 * for all peers.
 */
export async function isMasterInWebRTCReplication(
    hashFunction: HashFunction,
    ownStorageToken: string,
    otherStorageToken: string
): Promise<boolean> {
    const isMaster =
        await hashFunction([ownStorageToken, otherStorageToken].join('|'))
        >
        await hashFunction([otherStorageToken, ownStorageToken].join('|'));
    return isMaster;
}

export function sendMessageAndAwaitAnswer(
    handler: WebRTCConnectionHandler,
    peer: WebRTCPeer,
    message: WebRTCMessage
): Promise<WebRTCResponse> {
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
