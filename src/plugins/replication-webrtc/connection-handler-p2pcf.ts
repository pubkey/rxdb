import { Subject } from 'rxjs';
import P2PCF from 'p2pcf';
import {
    PROMISE_RESOLVE_VOID,
    randomCouchString
} from '../utils/index.ts';
import type {
    PeerWithMessage,
    PeerWithResponse,
    WebRTCConnectionHandler,
    WebRTCConnectionHandlerCreator,
    WebRTCMessage,
    WebRTCPeer
} from './webrtc-types.ts';
import type {
    Instance as SimplePeer,
    default as Peer
} from 'simple-peer';
import type {
    RxError,
    RxTypeError
} from '../../rx-error.ts';

/**
 * Returns a connection handler that uses the Cloudflare worker signaling server
 * @link https://github.com/gfodor/p2pcf
 */
export function getConnectionHandlerP2PCF(
    p2pCFOptions: {
        workerUrl?: string
    } = {}
): WebRTCConnectionHandlerCreator {
    //    const P2PCF = require('p2pcf');

    const creator: WebRTCConnectionHandlerCreator = async (options) => {
        const clientId = randomCouchString(10);
        const p2p2 = new P2PCF(clientId, options.topic, p2pCFOptions);

        const connect$ = new Subject<WebRTCPeer>();
        const disconnect$ = new Subject<WebRTCPeer>();
        const error$ = new Subject<RxError | RxTypeError>();
        const message$ = new Subject<PeerWithMessage>();
        const response$ = new Subject<PeerWithResponse>();

        p2p2.on('peerconnect', (peer: SimplePeer) => connect$.next(peer as any));

        p2p2.on('peerclose', (peer: SimplePeer) => disconnect$.next(peer as any));

        p2p2.on('msg', (peer: SimplePeer, messageOrResponse: any) => {
            if (messageOrResponse.result) {
                response$.next({
                    peer: peer as any,
                    response: messageOrResponse
                });
            } else {
                message$.next({
                    peer: peer as any,
                    message: messageOrResponse
                });
            }

        });

        const handler: WebRTCConnectionHandler = {
            error$,
            connect$,
            disconnect$,
            message$,
            response$,
            async send(peer: WebRTCPeer, message: WebRTCMessage) {
                const [responsePeer, response] = await p2p2.send(peer as any, message);
                return {
                    peer: responsePeer,
                    response
                } as any;
            },
            destroy() {
                p2p2.destroy();
                connect$.complete();
                disconnect$.complete();
                message$.complete();
                response$.complete();
                return PROMISE_RESOLVE_VOID;
            }
        }
        p2p2.start();
        return Promise.resolve(handler);
    };
    return creator;
}
