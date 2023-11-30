"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT_SIGNALING_SERVER = void 0;
exports.getConnectionHandlerSimplePeer = getConnectionHandlerSimplePeer;
var _rxjs = require("rxjs");
var _index = require("../../plugins/utils/index.js");
var _simplePeer = _interopRequireDefault(require("simple-peer"));
var _rxError = require("../../rx-error.js");
function sendMessage(ws, msg) {
  ws.send(JSON.stringify(msg));
}
var DEFAULT_SIGNALING_SERVER_HOSTNAME = 'signaling.rxdb.info';
var DEFAULT_SIGNALING_SERVER = exports.DEFAULT_SIGNALING_SERVER = 'wss://' + DEFAULT_SIGNALING_SERVER_HOSTNAME + '/';
var defaultServerWarningShown = false;
/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
function getConnectionHandlerSimplePeer({
  signalingServerUrl,
  wrtc,
  webSocketConstructor
}) {
  signalingServerUrl = signalingServerUrl ? signalingServerUrl : DEFAULT_SIGNALING_SERVER;
  webSocketConstructor = webSocketConstructor ? webSocketConstructor : WebSocket;
  if (signalingServerUrl.includes(DEFAULT_SIGNALING_SERVER_HOSTNAME) && !defaultServerWarningShown) {
    defaultServerWarningShown = true;
    console.warn(['RxDB Warning: You are using the RxDB WebRTC replication plugin', 'but you did not specify your own signaling server url.', 'By default it will use a signaling server provided by RxDB at ' + DEFAULT_SIGNALING_SERVER, 'This server is made for demonstration purposes and tryouts. It is not reliable and might be offline at any time.', 'In production you must always use your own signaling server instead.', 'Learn how to run your own server at https://rxdb.info/replication-webrtc.html', 'Also leave a start at the RxDB github repo 🙏 https://github.com/pubkey/rxdb 🙏'].join(' '));
  }
  var creator = async options => {
    var socket = new webSocketConstructor(signalingServerUrl);
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