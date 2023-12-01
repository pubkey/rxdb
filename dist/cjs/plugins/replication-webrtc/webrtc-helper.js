"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isMasterInWebRTCReplication = isMasterInWebRTCReplication;
exports.sendMessageAndAwaitAnswer = sendMessageAndAwaitAnswer;
var _rxjs = require("rxjs");
/**
 * To deterministically define which peer is master and
 * which peer is fork, we compare the storage tokens.
 * But we have to hash them before, to ensure that
 * a storageToken like 'aaaaaa' is not always the master
 * for all peers.
 */
async function isMasterInWebRTCReplication(hashFunction, ownStorageToken, otherStorageToken) {
  var isMaster = (await hashFunction([ownStorageToken, otherStorageToken].join('|'))) > (await hashFunction([otherStorageToken, ownStorageToken].join('|')));
  return isMaster;
}

/**
 * Send a message to the peer and await the answer.
 * @throws with an EmptyErrorImpl if the peer connection
 * was closed before an answer was received.
 */
function sendMessageAndAwaitAnswer(handler, peer, message) {
  var requestId = message.id;
  var answerPromise = (0, _rxjs.firstValueFrom)(handler.response$.pipe((0, _rxjs.filter)(d => d.peer === peer), (0, _rxjs.filter)(d => d.response.id === requestId), (0, _rxjs.map)(d => d.response)));
  handler.send(peer, message);
  return answerPromise;
}
//# sourceMappingURL=webrtc-helper.js.map