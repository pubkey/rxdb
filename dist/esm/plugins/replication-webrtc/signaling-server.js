import { getFromMapOrCreate, promiseWait, randomToken } from "../utils/index.js";
import { SIMPLE_PEER_PING_INTERVAL } from "./connection-handler-simple-peer.js";
export var PEER_ID_LENGTH = 12;
/**
 * Starts a WebRTC signaling server
 * that can be used in tests.
*/
export async function startSignalingServerSimplePeer(serverOptions) {
  var {
    WebSocketServer
  } = await import('ws');
  var wss = new WebSocketServer(serverOptions);
  var peerById = new Map();
  var peersByRoom = new Map();
  var serverClosed = false;
  wss.on('close', () => {
    serverClosed = true;
    peerById.clear();
    peersByRoom.clear();
  });

  /**
   * Clients can disconnect without telling that to the
   * server. Therefore we have to automatically disconnect clients that
   * have not send a ping message in the last 2 minutes.
   */
  (async () => {
    var _loop = async function () {
      await promiseWait(1000 * 5);
      var minTime = Date.now() - SIMPLE_PEER_PING_INTERVAL;
      Array.from(peerById.values()).forEach(peer => {
        if (peer.lastPing < minTime) {
          disconnectSocket(peer.id, 'no ping for 2 minutes');
        }
      });
    };
    while (!serverClosed) {
      await _loop();
    }
  })();
  function disconnectSocket(peerId, reason) {
    console.log('# disconnect peer ' + peerId + ' reason: ' + reason);
    var peer = peerById.get(peerId);
    if (peer) {
      peer.socket.close && peer.socket.close(undefined, reason);
      peer.rooms.forEach(roomId => {
        var room = peersByRoom.get(roomId);
        room?.delete(peerId);
        if (room && room.size === 0) {
          peersByRoom.delete(roomId);
        }
      });
    }
    peerById.delete(peerId);
  }
  wss.on('connection', function (ws) {
    /**
     * PeerID is created by the server to prevent malicious
     * actors from falsy claiming other peoples ids.
     */
    var peerId = randomToken(PEER_ID_LENGTH);
    var peer = {
      id: peerId,
      socket: ws,
      rooms: new Set(),
      lastPing: Date.now()
    };
    peerById.set(peerId, peer);
    sendMessage(ws, {
      type: 'init',
      yourPeerId: peerId
    });
    ws.on('error', err => {
      console.error('SERVER ERROR:');
      console.dir(err);
      disconnectSocket(peerId, 'socket errored');
    });
    ws.on('close', () => {
      disconnectSocket(peerId, 'socket disconnected');
    });
    ws.on('message', msgEvent => {
      peer.lastPing = Date.now();
      var message = JSON.parse(msgEvent.toString());
      var type = message.type;
      switch (type) {
        case 'join':
          var roomId = message.room;
          if (!validateIdString(roomId) || !validateIdString(peerId)) {
            disconnectSocket(peerId, 'invalid ids');
            return;
          }
          if (peer.rooms.has(peerId)) {
            return;
          }
          peer.rooms.add(roomId);
          var room = getFromMapOrCreate(peersByRoom, message.room, () => new Set());
          room.add(peerId);

          // tell everyone about new room state
          room.forEach(otherPeerId => {
            var otherPeer = peerById.get(otherPeerId);
            if (otherPeer) {
              sendMessage(otherPeer.socket, {
                type: 'joined',
                otherPeerIds: Array.from(room)
              });
            }
          });
          break;
        case 'signal':
          if (message.senderPeerId !== peerId) {
            disconnectSocket(peerId, 'spoofed sender');
            return;
          }
          var receiver = peerById.get(message.receiverPeerId);
          if (receiver) {
            sendMessage(receiver.socket, message);
          }
          break;
        case 'ping':
          break;
        default:
          disconnectSocket(peerId, 'unknown message type ' + type);
      }
    });
  });
  return {
    port: serverOptions.port,
    server: wss,
    localUrl: 'ws://localhost:' + serverOptions.port
  };
}
function sendMessage(ws, message) {
  var msgString = JSON.stringify(message);
  ws.send(msgString);
}
function validateIdString(roomId) {
  if (typeof roomId === 'string' && roomId.length > 5 && roomId.length < 100) {
    return true;
  } else {
    return false;
  }
}
//# sourceMappingURL=signaling-server.js.map