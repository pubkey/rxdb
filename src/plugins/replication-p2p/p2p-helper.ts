import type {
    HashFunction
} from '../../types';
import P2PT from 'p2pt';
import type {
    P2PConnectionHandler,
    P2PConnectionHandlerCreator,
    P2PMessage,
    P2PPeer,
    PeerWithMessage
} from './p2p-types';
import { Subject } from 'rxjs';
import { PROMISE_RESOLVE_VOID } from '../../util';

export function isMasterInP2PReplication(
    hashFunction: HashFunction,
    ownPeerId: string,
    otherPeerId: string
): boolean {
    const isMaster =
        hashFunction([ownPeerId, otherPeerId].join('|'))
        >
        hashFunction([otherPeerId, ownPeerId].join('|'));
    return isMaster;
}


export const P2PT_DEFAULT_TRACKERS = [
    'wss://tracker.files.fm:7073/announce',
    'wss://tracker.btorrent.xyz',
    'wss://spacetradersapi-chatbox.herokuapp.com:443/announce',
    'wss://qot.abiir.top:443/announce'
];


export function getConnectionHandlerP2PT(
    trackers: string[] = P2PT_DEFAULT_TRACKERS
): P2PConnectionHandlerCreator {

    const creator: P2PConnectionHandlerCreator = (peerId, options) => {
        const p2p2 = new P2PT(trackers, options.topic);
        p2p2._peerId = peerId;

        const connect$ = new Subject<P2PPeer>();
        p2p2.on('peerconnect', (peer) => connect$.next(peer as any));

        const disconnect$ = new Subject<P2PPeer>();
        p2p2.on('peerclose', (peer) => disconnect$.next(peer as any));

        const message$ = new Subject<PeerWithMessage>();
        p2p2.on('msg', (peer, message) => message$.next({
            peer: peer as any,
            message
        }));

        const handler: P2PConnectionHandler = {
            connect$,
            disconnect$,
            message$,
            async send(peer: P2PPeer, message: P2PMessage) {
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
                return PROMISE_RESOLVE_VOID;
            }
        }
        p2p2.start();
        return handler;
    };
    return creator;
}
