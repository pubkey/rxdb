import { filter } from 'rxjs';
import { deepEqual, ensureNotFalsy } from '../../plugins/utils';
import { createAnswer, createErrorAnswer } from './storage-remote-helpers';
/**
 * Run this on the 'remote' part,
 * so that RxStorageMessageChannel can connect to it.
 */
export function exposeRxStorageRemote(settings) {
  var instanceByFullName = new Map();
  settings.messages$.pipe(filter(msg => msg.method === 'create')).subscribe(async msg => {
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
          storageInstancePromise: settings.storage.createStorageInstance(params),
          connectionIds: new Set(),
          params
        };
        instanceByFullName.set(fullName, state);
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
    subs.push(storageInstance.conflictResultionTasks().subscribe(conflicts => {
      var message = {
        connectionId,
        answerTo: 'conflictResultionTasks',
        method: 'conflictResultionTasks',
        return: conflicts
      };
      settings.send(message);
    }));
    subs.push(settings.messages$.pipe(filter(subMsg => subMsg.connectionId === connectionId)).subscribe(async plainMessage => {
      var message = plainMessage;
      if (message.method === 'create') {
        return;
      }
      if (!Array.isArray(message.params)) {
        return;
      }
      var result;
      try {
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
        result = await storageInstance[message.method](message.params[0], message.params[1], message.params[2], message.params[3]);
        if (message.method === 'close' || message.method === 'remove') {
          subs.forEach(sub => sub.unsubscribe());
          ensureNotFalsy(state).connectionIds.delete(connectionId);
          instanceByFullName.delete(fullName);
          /**
           * TODO how to notify the other ports on remove() ?
           */
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