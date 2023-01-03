"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isMasterInP2PReplication = isMasterInP2PReplication;
exports.sendMessageAndAwaitAnswer = sendMessageAndAwaitAnswer;
var _rxjs = require("rxjs");
/**
 * To deterministically define which peer is master and
 * which peer is fork, we compare the storage tokens.
 * But we have to hash them before, to ensure that
 * a storageToken like 'aaaaaa' is not always the master
 * for all peers.
 */
function isMasterInP2PReplication(hashFunction, ownStorageToken, otherStorageToken) {
  var isMaster = hashFunction([ownStorageToken, otherStorageToken].join('|')) > hashFunction([otherStorageToken, ownStorageToken].join('|'));
  return isMaster;
}
function sendMessageAndAwaitAnswer(handler, peer, message) {
  var requestId = message.id;
  var answerPromise = (0, _rxjs.firstValueFrom)(handler.response$.pipe((0, _rxjs.filter)(d => d.peer === peer), (0, _rxjs.filter)(d => d.response.id === requestId), (0, _rxjs.map)(d => d.response)));
  handler.send(peer, message);
  return answerPromise;
}
//# sourceMappingURL=p2p-helper.js.map