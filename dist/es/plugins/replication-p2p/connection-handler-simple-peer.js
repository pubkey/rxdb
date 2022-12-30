import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { Subject } from 'rxjs';
import { getFromMapOrThrow, PROMISE_RESOLVE_VOID, randomCouchString } from '../../plugins/utils';
import { default as Peer } from 'simple-peer';
import { newRxError } from '../../rx-error';

/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export function getConnectionHandlerSimplePeer(serverUrl, wrtc) {
  var io = require('socket.io-client');
  var creator = function creator(options) {
    var socket = io(serverUrl);
    var peerId = randomCouchString(10);
    socket.emit('join', {
      room: options.topic,
      peerId: peerId
    });
    var connect$ = new Subject();
    var disconnect$ = new Subject();
    var message$ = new Subject();
    var response$ = new Subject();
    var error$ = new Subject();
    var peers = new Map();
    socket.on('joined', function (roomPeerIds) {
      roomPeerIds.forEach(function (remotePeerId) {
        if (remotePeerId === peerId || peers.has(remotePeerId)) {
          return;
        }
        // console.log('other user joined room ' + remotePeerId);
        var newPeer = new Peer({
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
          error$.next(newRxError('RC_P2P_PEER', {
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
      var peer = getFromMapOrThrow(peers, data.from);
      peer.signal(data.signal);
    });
    var handler = {
      error$: error$,
      connect$: connect$,
      disconnect$: disconnect$,
      message$: message$,
      response$: response$,
      send: function () {
        var _send = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(peer, message) {
          return _regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return peer.send(JSON.stringify(message));
              case 2:
              case "end":
                return _context.stop();
            }
          }, _callee);
        }));
        function send(_x, _x2) {
          return _send.apply(this, arguments);
        }
        return send;
      }(),
      destroy: function destroy() {
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