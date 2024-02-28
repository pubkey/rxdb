"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exposeRxStorageRemote = exposeRxStorageRemote;
var _rxjs = require("rxjs");
var _index = require("../../plugins/utils/index.js");
var _storageRemoteHelpers = require("./storage-remote-helpers.js");
var _rxStorageHelper = require("../../rx-storage-helper.js");
/**
 * Run this on the 'remote' part,
 * so that RxStorageMessageChannel can connect to it.
 */
function exposeRxStorageRemote(settings) {
  var instanceByFullName = new Map();
  settings.messages$.pipe((0, _rxjs.filter)(msg => msg.method === 'custom')).subscribe(async msg => {
    if (!settings.customRequestHandler) {
      settings.send((0, _storageRemoteHelpers.createErrorAnswer)(msg, new Error('Remote storage: cannot resolve custom request because settings.customRequestHandler is not set')));
    } else {
      try {
        var result = await settings.customRequestHandler(msg.params);
        settings.send((0, _storageRemoteHelpers.createAnswer)(msg, result));
      } catch (err) {
        settings.send((0, _storageRemoteHelpers.createErrorAnswer)(msg, err));
      }
    }
  });
  function getRxStorageInstance(params) {
    if (settings.storage) {
      return settings.storage.createStorageInstance(params);
    } else if (settings.database) {
      var storageInstances = Array.from(settings.database.storageInstances);
      var collectionName = params.collectionName;
      var storageInstance = storageInstances.find(instance => instance.collectionName === collectionName);
      if (!storageInstance) {
        console.dir(storageInstances);
        throw new Error('storageInstance does not exist ' + JSON.stringify({
          collectionName
        }));
      }
      var schema = params.schema;
      if (!(0, _index.deepEqual)(schema, storageInstance.schema)) {
        throw new Error('Wrong schema ' + JSON.stringify({
          schema,
          existingSchema: storageInstance.schema
        }));
      }
      return Promise.resolve(storageInstance);
    } else {
      throw new Error('no base given');
    }
  }
  settings.messages$.pipe((0, _rxjs.filter)(msg => msg.method === 'create')).subscribe(async msg => {
    var connectionId = msg.connectionId;

    /**
     * Do an isArray check here
     * for runtime check types to ensure we have
     * instance creation params and not method input params.
    */
    if (Array.isArray(msg.params)) {
      return;
    }
    var params = msg.params;
    var collectionName = params.collectionName;

    /**
     * We de-duplicate the storage instances.
     * This makes sense in many environments like
     * electron where on main process contains the storage
     * for multiple renderer processes. Same goes for SharedWorkers etc.
     */
    var fullName = [params.databaseName, params.collectionName, params.schema.version].join('|');
    var state = instanceByFullName.get(fullName);
    if (!state) {
      try {
        state = {
          /**
           * We work with a promise here to ensure
           * that parallel create-calls will still end up
           * with exactly one instance and not more.
           */
          storageInstancePromise: getRxStorageInstance(params),
          connectionIds: new Set(),
          params
        };
        instanceByFullName.set(fullName, state);

        /**
         * Must await the creation here
         * so that in case of an error,
         * it knows about the error message and can send
         * that back to the main process. 
         */
        await state.storageInstancePromise;
      } catch (err) {
        settings.send((0, _storageRemoteHelpers.createErrorAnswer)(msg, err));
        return;
      }
    } else {
      // if instance already existed, ensure that the schema is equal
      if (!(0, _index.deepEqual)(params.schema, state.params.schema)) {
        settings.send((0, _storageRemoteHelpers.createErrorAnswer)(msg, new Error('Remote storage: schema not equal to existing storage')));
        return;
      }
    }
    state.connectionIds.add(msg.connectionId);
    var subs = [];
    var storageInstance = await state.storageInstancePromise;
    /**
     * Automatically subscribe to the changeStream()
     * because we always need them.
     */
    subs.push(storageInstance.changeStream().subscribe(changes => {
      var message = {
        connectionId,
        answerTo: 'changestream',
        method: 'changeStream',
        return: changes
      };
      settings.send(message);
    }));
    subs.push(storageInstance.conflictResultionTasks().subscribe(conflicts => {
      var message = {
        connectionId,
        answerTo: 'conflictResultionTasks',
        method: 'conflictResultionTasks',
        return: conflicts
      };
      settings.send(message);
    }));
    var connectionClosed = false;
    function closeThisConnection() {
      if (connectionClosed) {
        return;
      }
      connectionClosed = true;
      subs.forEach(sub => sub.unsubscribe());
      (0, _index.ensureNotFalsy)(state).connectionIds.delete(connectionId);
      instanceByFullName.delete(fullName);
      /**
       * TODO how to notify the other ports on remove() ?
       */
    }

    // also close the connection when the collection gets destroyed
    if (settings.database) {
      var database = settings.database;
      var collection = database.collections[collectionName];
      if (collection) {
        collection.onDestroy.push(() => closeThisConnection());
      } else {
        database.onDestroy.push(() => closeThisConnection());
      }
    }
    subs.push(settings.messages$.pipe((0, _rxjs.filter)(subMsg => subMsg.connectionId === connectionId)).subscribe(async plainMessage => {
      var message = plainMessage;
      if (message.method === 'create' || message.method === 'custom') {
        return;
      }
      if (!Array.isArray(message.params)) {
        return;
      }
      var result;
      try {
        if (message.method === 'close' && settings.database) {
          /**
           * Do not close the storageInstance if it was taken from
           * a running RxDatabase.
           * In that case we only close the instance
           * when the RxDatabase gets destroyed.
           */
          settings.send((0, _storageRemoteHelpers.createAnswer)(message, null));
          return;
        }
        /**
         * On calls to 'close()',
         * we only close the main instance if there are no other
         * ports connected.
         */
        if (message.method === 'close' && (0, _index.ensureNotFalsy)(state).connectionIds.size > 1) {
          settings.send((0, _storageRemoteHelpers.createAnswer)(message, null));
          (0, _index.ensureNotFalsy)(state).connectionIds.delete(connectionId);
          subs.forEach(sub => sub.unsubscribe());
          return;
        }
        if (message.method === 'getChangedDocumentsSince' && !storageInstance.getChangedDocumentsSince) {
          result = await (0, _rxStorageHelper.getChangedDocumentsSince)(storageInstance, message.params[0], message.params[1]);
        } else {
          result = await storageInstance[message.method](message.params[0], message.params[1], message.params[2], message.params[3]);
        }
        if (message.method === 'close' || message.method === 'remove') {
          closeThisConnection();
        }
        settings.send((0, _storageRemoteHelpers.createAnswer)(message, result));
      } catch (err) {
        settings.send((0, _storageRemoteHelpers.createErrorAnswer)(message, err));
      }
    }));
    settings.send((0, _storageRemoteHelpers.createAnswer)(msg, 'ok'));
  });
  return {
    instanceByFullName
  };
}
//# sourceMappingURL=remote.js.map