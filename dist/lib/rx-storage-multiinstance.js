"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BROADCAST_CHANNEL_BY_TOKEN = void 0;
exports.addRxStorageMultiInstanceSupport = addRxStorageMultiInstanceSupport;
exports.getBroadcastChannelReference = getBroadcastChannelReference;
exports.removeBroadcastChannelReference = removeBroadcastChannelReference;
var _rxjs = require("rxjs");
var _operators = require("rxjs/operators");
var _broadcastChannel = require("broadcast-channel");
/**
 * When a persistend RxStorage is used in more the one JavaScript process,
 * the even stream of the changestream() function must be broadcasted to the other
 * RxStorageInstances of the same databaseName+collectionName.
 *
 * In the past this was done by RxDB but it makes more sense to do this
 * at the RxStorage level so that the broadcasting etc can all happen inside of a WebWorker
 * and not on the main thread.
 * Also it makes it less complex to stack up different RxStorages onto each other
 * like what we do with the in-memory plugin.
 *
 * This is intened to be used inside of createStorageInstance() of a storage.
 * Do not use this if the storage anyway broadcasts the events like when using MongoDB
 * or in the future W3C might introduce a way to listen to IndexedDB changes.
 */

/**
 * The broadcast-channel is reused by the databaseInstanceToken.
 * This is required so that it is easy to simulate multi-tab usage
 * in the test where different instances of the same RxDatabase must
 * have different broadcast channels.
 * But also it ensures that for each RxDatabase we only create a single
 * broadcast channel that can even be reused in the leader election plugin.
 *
 * TODO at the end of the unit tests,
 * we should ensure that all channels are closed and cleaned up.
 * Otherwise we have forgot something.
 */
var BROADCAST_CHANNEL_BY_TOKEN = new Map();
exports.BROADCAST_CHANNEL_BY_TOKEN = BROADCAST_CHANNEL_BY_TOKEN;
function getBroadcastChannelReference(databaseInstanceToken, databaseName, refObject) {
  var state = BROADCAST_CHANNEL_BY_TOKEN.get(databaseInstanceToken);
  if (!state) {
    state = {
      /**
       * We have to use the databaseName instead of the databaseInstanceToken
       * in the BroadcastChannel name because different instances must end with the same
       * channel name to be able to broadcast messages between each other.
       */
      bc: new _broadcastChannel.BroadcastChannel('RxDB:' + databaseName),
      refs: new Set()
    };
    BROADCAST_CHANNEL_BY_TOKEN.set(databaseInstanceToken, state);
  }
  state.refs.add(refObject);
  return state.bc;
}
function removeBroadcastChannelReference(databaseInstanceToken, refObject) {
  var state = BROADCAST_CHANNEL_BY_TOKEN.get(databaseInstanceToken);
  if (!state) {
    return;
  }
  state.refs.delete(refObject);
  if (state.refs.size === 0) {
    BROADCAST_CHANNEL_BY_TOKEN.delete(databaseInstanceToken);
    return state.bc.close();
  }
}
function addRxStorageMultiInstanceSupport(storageName, instanceCreationParams, instance,
/**
 * If provided, that channel will be used
 * instead of an own one.
 */
providedBroadcastChannel) {
  if (!instanceCreationParams.multiInstance) {
    return;
  }
  var broadcastChannel = providedBroadcastChannel ? providedBroadcastChannel : getBroadcastChannelReference(instanceCreationParams.databaseInstanceToken, instance.databaseName, instance);
  var changesFromOtherInstances$ = new _rxjs.Subject();
  var eventListener = msg => {
    if (msg.storageName === storageName && msg.databaseName === instanceCreationParams.databaseName && msg.collectionName === instanceCreationParams.collectionName && msg.version === instanceCreationParams.schema.version) {
      changesFromOtherInstances$.next(msg.eventBulk);
    }
  };
  broadcastChannel.addEventListener('message', eventListener);
  var oldChangestream$ = instance.changeStream();
  var closed = false;
  var sub = oldChangestream$.subscribe(eventBulk => {
    if (closed) {
      return;
    }
    broadcastChannel.postMessage({
      storageName: storageName,
      databaseName: instanceCreationParams.databaseName,
      collectionName: instanceCreationParams.collectionName,
      version: instanceCreationParams.schema.version,
      eventBulk
    });
  });
  instance.changeStream = function () {
    return changesFromOtherInstances$.asObservable().pipe((0, _operators.mergeWith)(oldChangestream$));
  };
  var oldClose = instance.close.bind(instance);
  instance.close = async function () {
    closed = true;
    sub.unsubscribe();
    broadcastChannel.removeEventListener('message', eventListener);
    if (!providedBroadcastChannel) {
      await removeBroadcastChannelReference(instanceCreationParams.databaseInstanceToken, instance);
    }
    return oldClose();
  };
  var oldRemove = instance.remove.bind(instance);
  instance.remove = async function () {
    closed = true;
    sub.unsubscribe();
    broadcastChannel.removeEventListener('message', eventListener);
    if (!providedBroadcastChannel) {
      await removeBroadcastChannelReference(instanceCreationParams.databaseInstanceToken, instance);
    }
    return oldRemove();
  };
}
//# sourceMappingURL=rx-storage-multiinstance.js.map