// import { Subject } from 'rxjs';
// import { PROMISE_RESOLVE_VOID, randomToken } from '../../util';
// import type {
//     P2PConnectionHandler,
//     P2PConnectionHandlerCreator,
//     P2PMessage,
//     P2PPeer,
//     PeerWithMessage,
//     PeerWithResponse
// } from './p2p-types';

// import P2PCF from 'p2pcf';

// /**
//  * Returns a connection handler that uses the Cloudflare worker signaling server
//  * @link https://github.com/gfodor/p2pcf
//  */
// export function getConnectionHandlerP2PCF(
//     p2pCFOptions: {
//         workerUrl?: string
//     } = {}
// ): P2PConnectionHandlerCreator {
// //    const P2PCF = require('p2pcf');

//     const creator: P2PConnectionHandlerCreator = (options) => {
//         const clientId = randomToken(10);
//         const p2p2 = new P2PCF(clientId, options.topic, p2pCFOptions);

//         const connect$ = new Subject<P2PPeer>();
//         p2p2.on('peerconnect', (peer) => connect$.next(peer as any));

//         const disconnect$ = new Subject<P2PPeer>();
//         p2p2.on('peerclose', (peer) => disconnect$.next(peer as any));

//         const message$ = new Subject<PeerWithMessage>();
//         const response$ = new Subject<PeerWithResponse>();
//         p2p2.on('msg', (peer, messageOrResponse) => {
//             if (messageOrResponse.result) {
//                 response$.next({
//                     peer: peer as any,
//                     response: messageOrResponse
//                 });
//             } else {
//                 message$.next({
//                     peer: peer as any,
//                     message: messageOrResponse
//                 });
//             }

//         });

//         const handler: P2PConnectionHandler = {
//             connect$,
//             disconnect$,
//             message$,
//             response$,
//             async send(peer: P2PPeer, message: P2PMessage) {
//                 const [responsePeer, response] = await p2p2.send(peer as any, message);
//                 return {
//                     peer: responsePeer,
//                     response
//                 } as any;
//             },
//             close() {
//                 p2p2.close();
//                 connect$.complete();
//                 disconnect$.complete();
//                 message$.complete();
//                 response$.complete();
//                 return PROMISE_RESOLVE_VOID;
//             }
//         }
//         p2p2.start();
//         return handler;
//     };
//     return creator;
// }
"use strict";
//# sourceMappingURL=connection-handler-p2pcf.js.map