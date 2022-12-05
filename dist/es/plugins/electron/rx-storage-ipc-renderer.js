import { getRxStorageMessageChannel } from '../../rx-storage-message-channel';
import { getFromMapOrThrow } from '../../util';
import { IPC_RENDERER_KEY_PREFIX, IPC_RENDERER_TO_MAIN } from './electron-helper';
export function getRxStorageIpcRenderer(settings) {
  var storage = getRxStorageMessageChannel({
    name: 'ipc-renderer',
    statics: settings.statics,
    createRemoteStorage: function createRemoteStorage(port, params) {
      /**
       * Electron does not allow to send messages
       * via ports from ipcRenderer->ipcMain.
       * Therefore we have to overwrite the port1.postMessage()
       * so that it works over args.ipcMain.on() messages.
       */
      var messageChannel = getFromMapOrThrow(storage.messageChannelByPort, port);
      var otherPort = messageChannel.port1;
      otherPort.postMessage = function (message) {
        settings.ipcRenderer.send(IPC_RENDERER_TO_MAIN, message);
      };
      settings.ipcRenderer.postMessage([IPC_RENDERER_KEY_PREFIX, 'postMessage', settings.key, 'createStorageInstance'].join('|'), params, [port]);
    }
  });
  return storage;
}
//# sourceMappingURL=rx-storage-ipc-renderer.js.map