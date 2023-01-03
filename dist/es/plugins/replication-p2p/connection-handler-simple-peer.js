import { Subject } from 'rxjs';
import { getFromMapOrThrow, PROMISE_RESOLVE_VOID, randomCouchString } from '../../plugins/utils';
import { default as Peer } from 'simple-peer';
import { newRxError } from '../../rx-error';

/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export function getConnectionHandlerSimplePeer(serverUrl, wrtc) {
  var io = require('socket.io-client');
  var creator = options => {
    var socket = io(serverUrl);
    var peerId = randomCouchString(10);
    socket.emit('join', {
      room: options.topic,
      peerId
    });
    var connect$ = new Subject();
    var disconnect$ = new Subject();
    var message$ = new Subject();
    var response$ = new Subject();
    var error$ = new Subject();
    var peers = new Map();
    socket.on('joined', roomPeerIds => {
      roomPeerIds.forEach(remotePeerId => {
        if (remotePeerId === peerId || peers.has(remotePeerId)) {
          return;
        }
        // console.log('other user joined room ' + remotePeerId);
        var newPeer = new Peer({
          initiator: remotePeerId > peerId,
          wrtc,
          trickle: true
        });
        peers.set(remotePeerId, newPeer);
        newPeer.on('data', messageOrResponse => {
          messageOrResponse = JSON.parse(messageOrResponse.toString());
          // console.log('got a message from peer3: ' + messageOrResponse)
          if (messageOrResponse.result) {
            response$.next({
              peer: newPeer,
              response: messageOrResponse
            });
          } else {
            message$.next({
              peer: newPeer,
              message: messageOrResponse
            });
          }
        });
        newPeer.on('signal', signal => {
          // console.log('emit signal from ' + peerId + ' to ' + remotePeerId);
          socket.emit('signal', {
            from: peerId,
            to: remotePeerId,
            room: options.topic,
            signal
          });
        });
        newPeer.on('error', error => {
          error$.next(newRxError('RC_P2P_PEER', {
            error
          }));
        });
        newPeer.on('connect', () => {
          connect$.next(newPeer);
        });
      });
    });
    socket.on('signal', data => {
      // console.log('got signal(' + peerId + ') ' + data.from + ' -> ' + data.to);
      var peer = getFromMapOrThrow(peers, data.from);
      peer.signal(data.signal);
    });
    var handler = {
      error$,
      connect$,
      disconnect$,
      message$,
      response$,
      async send(peer, message) {
        await peer.send(JSON.stringify(message));
      },
      destroy() {
        socket.close();
        error$.complete();
        connect$.complete();
        disconnect$.complete();
        message$.complete();
        response$.complete();
        return PROMISE_RESOLVE_VOID;
      }
    };
    return handler;
  };
  return creator;
}
//# sourceMappingURL=connection-handler-simple-peer.js.map