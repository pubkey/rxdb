// /**
//  * Uses the Webtorrent servers as signaling server, works similar to p2pt.
//  * We could not use p2pt directly because it has so many bugs and behaves wrong in
//  * cases with more then 2 peers.
//  * @link https://github.com/subins2000/p2pt/blob/master/p2pt.js
//  */

// import { Subject } from 'rxjs';
// import { PROMISE_RESOLVE_VOID, randomToken } from '../../util';
// import { P2PConnectionHandler, P2PConnectionHandlerCreator, P2PMessage, P2PPeer, PeerWithMessage, PeerWithResponse } from './p2p-types';
// const wrtc = require('wrtc');

// const WebSocketTracker = require('bittorrent-tracker/lib/client/websocket-tracker');
// const Client = require('bittorrent-tracker');
// const randombytes = require('randombytes');
// const EventEmitter = require('events');
// const sha1 = require('simple-sha1');
// const debug = require('debug')('p2pt');

// export const P2PT_DEFAULT_TRACKERS = [
//     'wss://tracker.files.fm:7073/announce',
//     'wss://tracker.btorrent.xyz',
//     'wss://spacetradersapi-chatbox.herokuapp.com:443/announce',
//     'wss://qot.abiir.top:443/announce'
// ];

// export function getConnectionHandlerWebtorrent(
//     trackers: string[] = P2PT_DEFAULT_TRACKERS,
//     /**
//      * Port is only required in Node.js,
//      * not on browsers.
//      */
//     torrentClientPort = 18669
// ): P2PConnectionHandlerCreator {
//     const creator: P2PConnectionHandlerCreator = (options) => {
//         /**
//          * @link https://github.com/webtorrent/bittorrent-tracker#client
//          */
//         const requiredOpts = {
//             infoHash: sha1.sync(options.topic).toLowerCase(),
//             peerId: randombytes(20),
//             announce: trackers,
//             port: torrentClientPort,
//             wrtc
//         }
//         const client = new Client(requiredOpts);

//         const connect$ = new Subject<P2PPeer>();
//         const disconnect$ = new Subject<P2PPeer>();
//         const message$ = new Subject<PeerWithMessage>();
//         const response$ = new Subject<PeerWithResponse>();

//         client.on('error', function (err) {
//             console.error('fatal client error! ' + requiredOpts.peerId.toString('hex'));
//             console.log(err.message)
//         })

//         client.on('warning', function (err) {
//             // a tracker was unavailable or sent bad data to the client. you can probably ignore it
//             console.log(err.message)
//         })

//         client.on('update', function (data) {
//             console.log('got an announce response from tracker: ' + data.announce)
//             console.log('number of seeders in the swarm: ' + data.complete)
//             console.log('number of leechers in the swarm: ' + data.incomplete)
//         });

//         const knownPeers = new Set<string>();
//         client.on('peer', function (peer: P2PPeer) {
//             console.log('found a peer: ' + peer.id + '    ' + requiredOpts.peerId.toString('hex')) // 85.10.239.191:48623
//             if (knownPeers.has(peer.id)) {
//                 return;
//             }
//             knownPeers.add(peer.id);
//             peer.once('connect', () => {
//                 connect$.next(peer);
//             });
//             peer.on('data', (data: Buffer) => {
//                 console.log('# GOT DATA FROM PEER:');
//                 const messageOrResponse = JSON.parse(data as any);
//                 console.dir(messageOrResponse);
//                 if (messageOrResponse.result) {
//                     response$.next({
//                         peer: peer as any,
//                         response: messageOrResponse
//                     });
//                 } else {
//                     message$.next({
//                         peer,
//                         message: JSON.parse(data)
//                     });
//                 }
//             });
//             peer.on('signal', (signal) => {
//                 console.log('GOT SIGNAL: ' + requiredOpts.peerId.toString('hex'));
//                 console.dir(signal);
//                 client.signal(signal);
//                 client.update();
//                 client.scrape();
//             });
//         });

//         client.on('scrape', function (data) {
//             console.log('number of leechers in the swarm: ' + data.incomplete)
//         })

//         const handler: P2PConnectionHandler = {
//             connect$,
//             disconnect$,
//             message$,
//             response$,
//             async send(peer: P2PPeer, message: P2PMessage) {
//                 await peer.send(JSON.stringify(message));
//             },
//             close() {
//                 client.close();
//                 connect$.complete();
//                 disconnect$.complete();
//                 message$.complete();
//                 response$.complete();
//                 return PROMISE_RESOLVE_VOID;
//             }
//         }
//         client.start();
//         client.update();
//         client.scrape();
//         setInterval(() => {
//             // client.update();
//         }, 10000);
//         return handler;
//     };

//     return creator;
// }
//# sourceMappingURL=connection-handler-webtorrent.js.map