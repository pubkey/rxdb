import { filter, firstValueFrom, map } from 'rxjs';

/**
 * To deterministically define which peer is master and
 * which peer is fork, we compare the storage tokens.
 * But we have to hash them before, to ensure that
 * a storageToken like 'aaaaaa' is not always the master
 * for all peers.
 */
export function isMasterInP2PReplication(hashFunction, ownStorageToken, otherStorageToken) {
  var isMaster = hashFunction([ownStorageToken, otherStorageToken].join('|')) > hashFunction([otherStorageToken, ownStorageToken].join('|'));
  return isMaster;
}
export function sendMessageAndAwaitAnswer(handler, peer, message) {
  var requestId = message.id;
  var answerPromise = firstValueFrom(handler.response$.pipe(filter(d => d.peer === peer), filter(d => d.response.id === requestId), map(d => d.response)));
  handler.send(peer, message);
  return answerPromise;
}
//# sourceMappingURL=p2p-helper.js.map