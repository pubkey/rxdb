"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SIMPLE_PEER_PING_INTERVAL = exports.DEFAULT_SIGNALING_SERVER = void 0;
exports.ensureProcessNextTickIsSet = ensureProcessNextTickIsSet;
exports.getConnectionHandlerSimplePeer = getConnectionHandlerSimplePeer;
var _rxjs = require("rxjs");
var _index = require("../../plugins/utils/index.js");
var _simplepeerMin = _interopRequireDefault(require("simple-peer/simplepeer.min.js"));
var _rxError = require("../../rx-error.js");
var Peer = _simplepeerMin.default;
function sendMessage(ws, msg) {
  ws.send(JSON.stringify(msg));
}
var DEFAULT_SIGNALING_SERVER_HOSTNAME = 'signaling.rxdb.info';
var DEFAULT_SIGNALING_SERVER = exports.DEFAULT_SIGNALING_SERVER = 'wss://' + DEFAULT_SIGNALING_SERVER_HOSTNAME + '/';
var defaultServerWarningShown = false;
var SIMPLE_PEER_PING_INTERVAL = exports.SIMPLE_PEER_PING_INTERVAL = 1000 * 60 * 2;

/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
function getConnectionHandlerSimplePeer({
  signalingServerUrl = DEFAULT_SIGNALING_SERVER,
  wrtc,
  config,
  webSocketConstructor = WebSocket
}) {
  ensureProcessNextTickIsSet();
  if (signalingServerUrl.includes(DEFAULT_SIGNALING_SERVER_HOSTNAME) && !defaultServerWarningShown) {
    defaultServerWarningShown = true;
    console.warn(['RxDB Warning: You are using the RxDB WebRTC replication plugin', 'but you did not specify your own signaling server url.', 'By default it will use a signaling server provided by RxDB at ' + DEFAULT_SIGNALING_SERVER, 'This server is made for demonstration purposes and tryouts. It is not reliable and might be offline at any time.', 'In production you must always use your own signaling server instead.', 'Learn how to run your own server at https://rxdb.info/replication-webrtc.html', 'Also leave a ⭐ at the RxDB github repo 🙏 https://github.com/pubkey/rxdb 🙏'].join(' '));
  }
  var creator = async options => {
    var connect$ = new _rxjs.Subject();
    var disconnect$ = new _rxjs.Subject();
    var message$ = new _rxjs.Subject();
    var response$ = new _rxjs.Subject();
    var error$ = new _rxjs.Subject();
    var peers = new Map();
    var closed = false;
    var ownPeerId;
    var socket = undefined;
    createSocket();

    /**
     * Send ping signals to the server.
     */
    (async () => {
      while (true) {
        await (0, _index.promiseWait)(SIMPLE_PEER_PING_INTERVAL / 2);
        if (closed) {
          break;
        }
        if (socket) {
          sendMessage(socket, {
            type: 'ping'
          });
        }
      }
    })();

    /**
     * @recursive calls it self on socket disconnects
     * so that when the user goes offline and online
     * again, it will recreate the WebSocket connection.
     */
    function createSocket() {
      if (closed) {
        return;
      }
      socket = new webSocketConstructor(signalingServerUrl);
      socket.onclose = () => createSocket();
      socket.onopen = () => {
        (0, _index.ensureNotFalsy)(socket).onmessage = msgEvent => {
          var msg = JSON.parse(msgEvent.data);
          switch (msg.type) {
            case 'init':
              ownPeerId = msg.yourPeerId;
              sendMessage((0, _index.ensureNotFalsy)(socket), {
                type: 'join',
                room: options.topic
              });
              break;
            case 'joined':
              /**
               * PeerId is created by the signaling server
               * to prevent spoofing it.
               */
              var createPeerConnection = function (remotePeerId) {
                var disconnected = false;
                var newSimplePeer = new Peer({
                  initiator: remotePeerId > ownPeerId,
                  wrtc,
                  config,
                  trickle: true
                });
                newSimplePeer.id = (0, _index.randomToken)(10);
                peers.set(remotePeerId, newSimplePeer);
                newSimplePeer.on('signal', signal => {
                  sendMessage((0, _index.ensureNotFalsy)(socket), {
                    type: 'signal',
                    senderPeerId: ownPeerId,
                    receiverPeerId: remotePeerId,
                    room: options.topic,
                    data: signal
                  });
                });
                newSimplePeer.on('data', messageOrResponse => {
                  messageOrResponse = JSON.parse(messageOrResponse.toString());
                  if (messageOrResponse.result) {
                    response$.next({
                      peer: newSimplePeer,
                      response: messageOrResponse
                    });
                  } else {
                    message$.next({
                      peer: newSimplePeer,
                      message: messageOrResponse
                    });
                  }
                });
                newSimplePeer.on('error', error => {
                  error$.next((0, _rxError.newRxError)('RC_WEBRTC_PEER', {
                    error
                  }));
                  newSimplePeer.destroy();
                  if (!disconnected) {
                    disconnected = true;
                    disconnect$.next(newSimplePeer);
                  }
                });
                newSimplePeer.on('connect', () => {
                  connect$.next(newSimplePeer);
                });
                newSimplePeer.on('close', () => {
                  if (!disconnected) {
                    disconnected = true;
                    disconnect$.next(newSimplePeer);
                  }
                  createPeerConnection(remotePeerId);
                });
              };
              msg.otherPeerIds.forEach(remotePeerId => {
                if (remotePeerId === ownPeerId || peers.has(remotePeerId)) {
                  return;
                } else {
                  createPeerConnection(remotePeerId);
                }
              });
              break;
            case 'signal':
              var peer = (0, _index.getFromMapOrThrow)(peers, msg.senderPeerId);
              peer.signal(msg.data);
              break;
          }
        };
      };
    }
    ;
    var handler = {
      error$,
      connect$,
      disconnect$,
      message$,
      response$,
      async send(peer, message) {
        await peer.send(JSON.stringify(message));
      },
      close() {
        closed = true;
        (0, _index.ensureNotFalsy)(socket).close();
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

/**
 * Multiple people had problems because it requires to have
 * the nextTick() method in the runtime. So we check here and
 * throw a helpful error.
 */
function ensureProcessNextTickIsSet() {
  if (typeof process === 'undefined' || typeof process.nextTick !== 'function') {
    throw (0, _rxError.newRxError)('RC7');
  }
}
//# sourceMappingURL=connection-handler-simple-peer.js.map