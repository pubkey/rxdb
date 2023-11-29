"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getConnectionHandlerSimplePeer = getConnectionHandlerSimplePeer;
var _rxjs = require("rxjs");
var _index = require("../../plugins/utils/index.js");
var _simplePeer = _interopRequireDefault(require("simple-peer"));
var _rxError = require("../../rx-error.js");
// import { WebSocket } from 'ws';

function sendMessage(ws, msg) {
  ws.send(JSON.stringify(msg));
}

/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
function getConnectionHandlerSimplePeer(serverUrl, wrtc) {
  var creator = async options => {
    var socket = new WebSocket(serverUrl);
    var connect$ = new _rxjs.Subject();
    var disconnect$ = new _rxjs.Subject();
    var message$ = new _rxjs.Subject();
    var response$ = new _rxjs.Subject();
    var error$ = new _rxjs.Subject();
    var peers = new Map();
    var ownPeerId;
    socket.onopen = () => {
      socket.onmessage = msgEvent => {
        var msg = JSON.parse(msgEvent.data);
        switch (msg.type) {
          case 'init':
            ownPeerId = msg.yourPeerId;
            sendMessage(socket, {
              type: 'join',
              room: options.topic
            });
            break;
          case 'joined':
            /**
             * PeerId is created by the signaling server
             * to prevent spoofing it.
             */
            msg.otherPeerIds.forEach(remotePeerId => {
              if (remotePeerId === ownPeerId || peers.has(remotePeerId)) {
                return;
              }
              var newPeer = new _simplePeer.default({
                initiator: remotePeerId > ownPeerId,
                wrtc,
                trickle: true
              });
              peers.set(remotePeerId, newPeer);
              newPeer.on('signal', signal => {
                sendMessage(socket, {
                  type: 'signal',
                  senderPeerId: ownPeerId,
                  receiverPeerId: remotePeerId,
                  room: options.topic,
                  data: signal
                });
              });
              newPeer.on('data', messageOrResponse => {
                messageOrResponse = JSON.parse(messageOrResponse.toString());
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
              newPeer.on('error', error => {
                console.log('CLIENT(' + ownPeerId + ') peer got error:');
                console.dir(error);
                error$.next((0, _rxError.newRxError)('RC_WEBRTC_PEER', {
                  error
                }));
              });
              newPeer.on('connect', () => {
                connect$.next(newPeer);
              });
            });
            break;
          case 'signal':
            // console.log('got signal(' + peerId + ') ' + data.from + ' -> ' + data.to);
            var peer = (0, _index.getFromMapOrThrow)(peers, msg.senderPeerId);
            peer.signal(msg.data);
            break;
        }
      };
    };
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
        return _index.PROMISE_RESOLVE_VOID;
      }
    };
    return handler;
  };
  return creator;
}
//# sourceMappingURL=connection-handler-simple-peer.js.map