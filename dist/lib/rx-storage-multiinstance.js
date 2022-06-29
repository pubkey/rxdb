"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BROADCAST_CHANNEL_BY_TOKEN = void 0;
exports.addRxStorageMultiInstanceSupport = addRxStorageMultiInstanceSupport;
exports.getBroadcastChannelReference = getBroadcastChannelReference;
exports.removeBroadcastChannelReference = void 0;

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
var removeBroadcastChannelReference = function removeBroadcastChannelReference(databaseInstanceToken, refObject) {
  try {
    var state = BROADCAST_CHANNEL_BY_TOKEN.get(databaseInstanceToken);

    if (!state) {
      return Promise.resolve();
    }

    state.refs["delete"](refObject);

    if (state.refs.size === 0) {
      BROADCAST_CHANNEL_BY_TOKEN["delete"](databaseInstanceToken);
      return Promise.resolve(state.bc.close());
    }

    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.removeBroadcastChannelReference = removeBroadcastChannelReference;

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

function addRxStorageMultiInstanceSupport(instanceCreationParams, instance,
/**
 * If provided, that channel will be used
 * instead of an own one.
 */
providedBroadcastChannel) {
  if (!instanceCreationParams.multiInstance) {
    return;
  }

  var storage = instance.storage;
  var broadcastChannel = providedBroadcastChannel ? providedBroadcastChannel : getBroadcastChannelReference(instanceCreationParams.databaseInstanceToken, instance.databaseName, instance);
  var changesFromOtherInstances$ = new _rxjs.Subject();

  var eventListener = function eventListener(msg) {
    if (msg.storageName === storage.name && msg.databaseName === instanceCreationParams.databaseName && msg.collectionName === instanceCreationParams.collectionName && msg.version === instanceCreationParams.schema.version) {
      changesFromOtherInstances$.next(msg.eventBulk);
    }
  };

  broadcastChannel.addEventListener('message', eventListener);
  var oldChangestream$ = instance.changeStream();
  var closed = false;
  var sub = oldChangestream$.subscribe(function (eventBulk) {
    if (closed) {
      return;
    }

    broadcastChannel.postMessage({
      storageName: storage.name,
      databaseName: instanceCreationParams.databaseName,
      collectionName: instanceCreationParams.collectionName,
      version: instanceCreationParams.schema.version,
      eventBulk: eventBulk
    });
  });

  instance.changeStream = function () {
    return changesFromOtherInstances$.asObservable().pipe((0, _operators.mergeWith)(oldChangestream$));
  };

  var oldClose = instance.close.bind(instance);

  instance.close = function () {
    try {
      closed = true;
      sub.unsubscribe();
      broadcastChannel.removeEventListener('message', eventListener);

      var _temp2 = function () {
        if (!providedBroadcastChannel) {
          return Promise.resolve(removeBroadcastChannelReference(instanceCreationParams.databaseInstanceToken, instance)).then(function () {});
        }
      }();

      return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {
        return oldClose();
      }) : oldClose());
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var oldRemove = instance.remove.bind(instance);

  instance.remove = function () {
    try {
      closed = true;
      sub.unsubscribe();
      broadcastChannel.removeEventListener('message', eventListener);

      var _temp4 = function () {
        if (!providedBroadcastChannel) {
          return Promise.resolve(removeBroadcastChannelReference(instanceCreationParams.databaseInstanceToken, instance)).then(function () {});
        }
      }();

      return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(function () {
        return oldRemove();
      }) : oldRemove());
    } catch (e) {
      return Promise.reject(e);
    }
  };
}
//# sourceMappingURL=rx-storage-multiinstance.js.map