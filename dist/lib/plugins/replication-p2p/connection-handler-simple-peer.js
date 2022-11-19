"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getConnectionHandlerSimplePeer = getConnectionHandlerSimplePeer;
var _rxjs = require("rxjs");
var _util = require("../../util");
var _simplePeer = _interopRequireDefault(require("simple-peer"));
var _rxError = require("../../rx-error");
/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
function getConnectionHandlerSimplePeer(serverUrl, wrtc) {
  var io = require('socket.io-client');
  var creator = function creator(options) {
    var socket = io(serverUrl);
    var peerId = (0, _util.randomCouchString)(10);
    socket.emit('join', {
      room: options.topic,
      peerId: peerId
    });
    var connect$ = new _rxjs.Subject();
    var disconnect$ = new _rxjs.Subject();
    var message$ = new _rxjs.Subject();
    var response$ = new _rxjs.Subject();
    var error$ = new _rxjs.Subject();
    var peers = new Map();
    socket.on('joined', function (roomPeerIds) {
      roomPeerIds.forEach(function (remotePeerId) {
        if (remotePeerId === peerId || peers.has(remotePeerId)) {
          return;
        }
        // console.log('other user joined room ' + remotePeerId);
        var newPeer = new _simplePeer["default"]({
          initiator: remotePeerId > peerId,
          wrtc: wrtc,
          trickle: true
        });
        peers.set(remotePeerId, newPeer);
        newPeer.on('data', function (messageOrResponse) {
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
        newPeer.on('signal', function (signal) {
          // console.log('emit signal from ' + peerId + ' to ' + remotePeerId);
          socket.emit('signal', {
            from: peerId,
            to: remotePeerId,
            room: options.topic,
            signal: signal
          });
        });
        newPeer.on('error', function (error) {
          error$.next((0, _rxError.newRxError)('RC_P2P_PEER', {
            error: error
          }));
        });
        newPeer.on('connect', function () {
          connect$.next(newPeer);
        });
      });
    });
    socket.on('signal', function (data) {
      // console.log('got signal(' + peerId + ') ' + data.from + ' -> ' + data.to);
      var peer = (0, _util.getFromMapOrThrow)(peers, data.from);
      peer.signal(data.signal);
    });
    var handler = {
      error$: error$,
      connect$: connect$,
      disconnect$: disconnect$,
      message$: message$,
      response$: response$,
      send: function send(peer, message) {
        try {
          return Promise.resolve(peer.send(JSON.stringify(message))).then(function () {});
        } catch (e) {
          return Promise.reject(e);
        }
      },
      destroy: function destroy() {
        socket.close();
        error$.complete();
        connect$.complete();
        disconnect$.complete();
        message$.complete();
        response$.complete();
        return _util.PROMISE_RESOLVE_VOID;
      }
    };
    return handler;
  };
  return creator;
}
//# sourceMappingURL=connection-handler-simple-peer.js.map