import type {
    HashFunction
} from '../../types/index.d.ts';
import type {
    WebRTCConnectionHandler,
    WebRTCMessage,
    WebRTCResponse,
    PeerWithResponse
} from './webrtc-types.ts';
import { filter, map, Subscription } from 'rxjs';
import { newRxError } from '../../rx-error.ts';
import { errorToPlainJson } from '../utils/index.ts';



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

export const WEBRTC_DEFAULT_REQUEST_TIMEOUT = 1000 * 20;

/**
 * Send a message to the peer and await the answer.
 * @throws with an RxError if the peer disconnected,
 * the connection handler was closed,
 * the remote peer responded with an error
 * or no answer was received before the timeout.
 */
export function sendMessageAndAwaitAnswer<PeerType>(
    handler: WebRTCConnectionHandler<PeerType>,
    peer: PeerType,
    message: WebRTCMessage,
    timeout: number = WEBRTC_DEFAULT_REQUEST_TIMEOUT
): Promise<WebRTCResponse> {
    const requestId = message.id;
    return new Promise<WebRTCResponse>((res, rej) => {
        let done = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const subs: Subscription[] = [];
        function finish(fn: () => void) {
            if (done) {
                return;
            }
            done = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            subs.forEach(sub => sub.unsubscribe());
            fn();
        }
        function fail(errorText: string, error?: any) {
            finish(() => rej(newRxError('RC_WEBRTC_PEER', {
                errorText,
                error,
                args: {
                    method: message.method,
                    id: requestId
                }
            })));
        }

        subs.push(
            handler.response$.pipe(
                filter((d: PeerWithResponse<PeerType>) => d.peer === peer),
                filter((d: PeerWithResponse<PeerType>) => d.response.id === requestId),
                map((d: PeerWithResponse<PeerType>) => d.response)
            ).subscribe({
                next: (response: WebRTCResponse) => {
                    if (response.error) {
                        fail('remote peer responded with an error', response.error);
                    } else {
                        finish(() => res(response));
                    }
                },
                complete: () => fail('connection handler closed')
            }),
            handler.disconnect$.pipe(
                filter((p: PeerType) => p === peer)
            ).subscribe({
                next: () => fail('peer disconnected'),
                complete: () => fail('connection handler closed')
            })
        );
        if (done) {
            subs.forEach(sub => sub.unsubscribe());
            return;
        }
        timeoutId = setTimeout(
            () => fail('request timed out after ' + timeout + 'ms'),
            timeout
        );
        Promise.resolve()
            .then(() => handler.send(peer, message))
            .catch((err: any) => fail('could not send message', errorToPlainJson(err)));
    });
}
