"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getConnectionHandlerSimplePeer = getConnectionHandlerSimplePeer;
var _rxjs = require("rxjs");
var _utils = require("../../plugins/utils");
var _simplePeer = _interopRequireDefault(require("simple-peer"));
var _rxError = require("../../rx-error");
/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
function getConnectionHandlerSimplePeer(serverUrl, wrtc) {
  var io = require('socket.io-client');
  var creator = options => {
    var socket = io(serverUrl);
    var peerId = (0, _utils.randomCouchString)(10);
    socket.emit('join', {
      room: options.topic,
      peerId
    });
    var connect$ = new _rxjs.Subject();
    var disconnect$ = new _rxjs.Subject();
    var message$ = new _rxjs.Subject();
    var response$ = new _rxjs.Subject();
    var error$ = new _rxjs.Subject();
    var peers = new Map();
    socket.on('joined', roomPeerIds => {
      roomPeerIds.forEach(remotePeerId => {
        if (remotePeerId === peerId || peers.has(remotePeerId)) {
          return;
        }
        // console.log('other user joined room ' + remotePeerId);
        var newPeer = new _simplePeer.default({
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
          error$.next((0, _rxError.newRxError)('RC_P2P_PEER', {
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
      var peer = (0, _utils.getFromMapOrThrow)(peers, data.from);
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
        return _utils.PROMISE_RESOLVE_VOID;
      }
    };
    return handler;
  };
  return creator;
}
//# sourceMappingURL=connection-handler-simple-peer.js.map