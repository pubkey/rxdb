/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */

import { ensureNotFalsy, getFromMapOrThrow } from '../../util';
import { Subject } from 'rxjs';
import { IPC_RENDERER_KEY_PREFIX, IPC_RENDERER_TO_MAIN } from './electron-helper';
import { exposeRxStorageMessageChannel } from '../../rx-storage-message-channel';
export function exposeIpcMainRxStorage(args) {
  var onCreateRemoteStorage$ = new Subject();
  var portByDatabaseInstanceToken = new Map();
  args.ipcMain.on([IPC_RENDERER_KEY_PREFIX, 'postMessage', args.key, 'createStorageInstance'].join('|'), function (event, params) {
    var _event$ports = event.ports,
      port = _event$ports[0];
    portByDatabaseInstanceToken.set(params.databaseInstanceToken, port);
    onCreateRemoteStorage$.next({
      params: params,
      port: port
    });
  });
  exposeRxStorageMessageChannel({
    storage: args.storage,
    onCreateRemoteStorage$: onCreateRemoteStorage$
  });
  args.ipcMain.on(IPC_RENDERER_TO_MAIN, function (_event, message) {
    var port = getFromMapOrThrow(portByDatabaseInstanceToken, message.instanceId);
    ensureNotFalsy(port.onmessage)({
      data: message
    });
  });
}
//# sourceMappingURL=rx-storage-ipc-main.js.map