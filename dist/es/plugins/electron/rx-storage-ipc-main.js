/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */

import { ensureNotFalsy, getFromMapOrThrow } from '../../util';
import { IPC_RENDERER_KEY_PREFIX, IPC_RENDERER_TO_MAIN } from './electron-helper';
function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
export function exposeIpcMainRxStorage(args) {
  var instanceById = new Map();
  var portStateByChannelId = new Map();
  args.ipcMain.on([IPC_RENDERER_KEY_PREFIX, 'postMessage', args.key, 'createStorageInstance'].join('|'), function (event, params) {
    try {
      var _temp5 = function _temp5(_result2) {
        if (_exit2) return _result2;
        var subs = [];
        portStateByChannelId.set(channelId, {
          port: port,
          state: state,
          subs: subs
        });
        subs.push(state.storageInstance.changeStream().subscribe(function (changes) {
          var message = {
            answerTo: 'changestream',
            method: 'changeStream',
            "return": changes
          };
          port.postMessage(message);
        }));
        subs.push(state.storageInstance.conflictResultionTasks().subscribe(function (conflicts) {
          var message = {
            answerTo: 'conflictResultionTasks',
            method: 'conflictResultionTasks',
            "return": conflicts
          };
          port.postMessage(message);
        }));
        port.postMessage({
          key: 'instanceId',
          instanceId: instanceId
        });
      };
      var _exit2 = false;
      var _event$ports = event.ports,
        port = _event$ports[0];
      var instanceId = [params.databaseName, params.collectionName, params.schema.version].join('|');
      var channelId = params.channelId;
      var state = instanceById.get(instanceId);
      var storageInstance;
      var _temp6 = function () {
        if (!state) {
          var _temp7 = function _temp7(_result) {
            if (_exit2) return _result;
            state = {
              storageInstance: storageInstance,
              ports: [port],
              params: params
            };
            instanceById.set(instanceId, state);
          };
          var _temp8 = _catch(function () {
            return Promise.resolve(args.storage.createStorageInstance(params)).then(function (_args$storage$createS) {
              storageInstance = _args$storage$createS;
            });
          }, function () {
            port.postMessage({
              key: 'error',
              error: 'could not call createStorageInstance'
            });
            _exit2 = true;
          });
          return _temp8 && _temp8.then ? _temp8.then(_temp7) : _temp7(_temp8);
        }
      }();
      return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(_temp5) : _temp5(_temp6));
    } catch (e) {
      return Promise.reject(e);
    }
  });
  args.ipcMain.on(IPC_RENDERER_TO_MAIN, function (_event, message) {
    try {
      var _getFromMapOrThrow = getFromMapOrThrow(portStateByChannelId, message.channelId),
        port = _getFromMapOrThrow.port,
        state = _getFromMapOrThrow.state,
        subs = _getFromMapOrThrow.subs;
      var result;
      return Promise.resolve(_catch(function () {
        var _ref;
        /**
         * On calls to 'close()',
         * we only close the main instance if there are no other
         * ports connected.
         */
        if (message.method === 'close' && ensureNotFalsy(state).ports.length > 1) {
          var closeBreakResponse = {
            answerTo: message.requestId,
            method: message.method,
            "return": null
          };
          port.postMessage(closeBreakResponse);
          return;
        }
        return Promise.resolve((_ref = ensureNotFalsy(state).storageInstance)[message.method].apply(_ref, message.params)).then(function (_message$method) {
          result = _message$method;
          if (message.method === 'close' || message.method === 'remove') {
            subs.forEach(function (sub) {
              return sub.unsubscribe();
            });
            ensureNotFalsy(state).ports = ensureNotFalsy(state).ports.filter(function (p) {
              return p !== port;
            });
            portStateByChannelId["delete"](message.channelId);
            /**
             * TODO how to notify the other ports on remove() ?
             */
          }

          var response = {
            answerTo: message.requestId,
            method: message.method,
            "return": result
          };
          port.postMessage(response);
        });
      }, function (err) {
        var errorResponse = {
          answerTo: message.requestId,
          method: message.method,
          error: err.toString()
        };
        port.postMessage(errorResponse);
      }));
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
//# sourceMappingURL=rx-storage-ipc-main.js.map