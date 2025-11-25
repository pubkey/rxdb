import { Subject } from 'rxjs';
import { ensureNotFalsy, getFromMapOrThrow, PROMISE_RESOLVE_VOID, promiseWait, randomToken } from "../../plugins/utils/index.js";
import { default as _Peer
// @ts-ignore
} from 'simple-peer/simplepeer.min.js';
var Peer = _Peer;
import { newRxError } from "../../rx-error.js";
function sendMessage(ws, msg) {
  ws.send(JSON.stringify(msg));
}
var DEFAULT_SIGNALING_SERVER_HOSTNAME = 'signaling.rxdb.info';
export var DEFAULT_SIGNALING_SERVER = 'wss://' + DEFAULT_SIGNALING_SERVER_HOSTNAME + '/';
var defaultServerWarningShown = false;
export var SIMPLE_PEER_PING_INTERVAL = 1000 * 60 * 2;

/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export function getConnectionHandlerSimplePeer({
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
    var connect$ = new Subject();
    var disconnect$ = new Subject();
    var message$ = new Subject();
    var response$ = new Subject();
    var error$ = new Subject();
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
        await promiseWait(SIMPLE_PEER_PING_INTERVAL / 2);
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
        ensureNotFalsy(socket).onmessage = msgEvent => {
          var msg = JSON.parse(msgEvent.data);
          switch (msg.type) {
            case 'init':
              ownPeerId = msg.yourPeerId;
              sendMessage(ensureNotFalsy(socket), {
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
                newSimplePeer.id = randomToken(10);
                peers.set(remotePeerId, newSimplePeer);
                newSimplePeer.on('signal', signal => {
                  sendMessage(ensureNotFalsy(socket), {
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
                  error$.next(newRxError('RC_WEBRTC_PEER', {
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
              var peer = getFromMapOrThrow(peers, msg.senderPeerId);
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
        ensureNotFalsy(socket).close();
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

/**
 * Multiple people had problems because it requires to have
 * the nextTick() method in the runtime. So we check here and
 * throw a helpful error.
 */
export function ensureProcessNextTickIsSet() {
  if (typeof process === 'undefined' || typeof process.nextTick !== 'function') {
    throw newRxError('RC7');
  }
}
//# sourceMappingURL=connection-handler-simple-peer.js.map