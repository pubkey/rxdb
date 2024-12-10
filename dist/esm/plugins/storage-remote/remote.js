import { filter } from 'rxjs';
import { deepEqual, ensureNotFalsy, RXDB_VERSION } from "../../plugins/utils/index.js";
import { createAnswer, createErrorAnswer } from "./storage-remote-helpers.js";
import { getChangedDocumentsSince } from "../../rx-storage-helper.js";
import { newRxError } from "../../rx-error.js";

/**
 * Run this on the 'remote' part,
 * so that RxStorageMessageChannel can connect to it.
 */
export function exposeRxStorageRemote(settings) {
  var instanceByFullName = new Map();
  settings.messages$.pipe(filter(msg => msg.method === 'custom')).subscribe(async msg => {
    if (!settings.customRequestHandler) {
      settings.send(createErrorAnswer(msg, new Error('Remote storage: cannot resolve custom request because settings.customRequestHandler is not set')));
    } else {
      try {
        var result = await settings.customRequestHandler(msg.params);
        settings.send(createAnswer(msg, result));
      } catch (err) {
        settings.send(createErrorAnswer(msg, err));
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
      if (!deepEqual(schema, storageInstance.schema)) {
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
  var mustBeRxDBVersion = settings.fakeVersion ? settings.fakeVersion : RXDB_VERSION;
  settings.messages$.pipe(filter(msg => msg.method === 'create')).subscribe(async msg => {
    if (msg.version !== mustBeRxDBVersion) {
      settings.send(createErrorAnswer(msg, newRxError('RM1', {
        args: {
          mainVersion: msg.version,
          remoteVersion: mustBeRxDBVersion
        }
      })));
      return;
    }
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
        settings.send(createErrorAnswer(msg, err));
        return;
      }
    } else {
      // if instance already existed, ensure that the schema is equal
      if (!deepEqual(params.schema, state.params.schema)) {
        settings.send(createErrorAnswer(msg, new Error('Remote storage: schema not equal to existing storage')));
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
    var connectionClosed = false;
    function closeThisConnection() {
      if (connectionClosed) {
        return;
      }
      connectionClosed = true;
      subs.forEach(sub => sub.unsubscribe());
      ensureNotFalsy(state).connectionIds.delete(connectionId);
      instanceByFullName.delete(fullName);
      /**
       * TODO how to notify the other ports on remove() ?
       */
    }

    // also close the connection when the collection gets closed
    if (settings.database) {
      var database = settings.database;
      var collection = database.collections[collectionName];
      if (collection) {
        collection.onClose.push(() => closeThisConnection());
      } else {
        database.onClose.push(() => closeThisConnection());
      }
    }
    subs.push(settings.messages$.pipe(filter(subMsg => subMsg.connectionId === connectionId)).subscribe(async plainMessage => {
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
           * when the RxDatabase gets closed.
           */
          settings.send(createAnswer(message, null));
          return;
        }
        /**
         * On calls to 'close()',
         * we only close the main instance if there are no other
         * ports connected.
         */
        if (message.method === 'close' && ensureNotFalsy(state).connectionIds.size > 1) {
          settings.send(createAnswer(message, null));
          ensureNotFalsy(state).connectionIds.delete(connectionId);
          subs.forEach(sub => sub.unsubscribe());
          return;
        }
        if (message.method === 'getChangedDocumentsSince' && !storageInstance.getChangedDocumentsSince) {
          result = await getChangedDocumentsSince(storageInstance, message.params[0], message.params[1]);
        } else {
          result = await storageInstance[message.method](message.params[0], message.params[1], message.params[2], message.params[3]);
        }
        if (message.method === 'close' || message.method === 'remove') {
          closeThisConnection();
        }
        settings.send(createAnswer(message, result));
      } catch (err) {
        settings.send(createErrorAnswer(message, err));
      }
    }));
    settings.send(createAnswer(msg, 'ok'));
  });
  return {
    instanceByFullName
  };
}
//# sourceMappingURL=remote.js.map