import { Subject } from 'rxjs';
import { getRxStorageMessageChannel } from '../../rx-storage-message-channel';
import { IPC_RENDERER_KEY_PREFIX } from './electron-helper';
export function getRxStorageIpcRenderer(settings) {
  var channelId = [IPC_RENDERER_KEY_PREFIX, settings.key].join('|');
  var messages$ = new Subject();
  settings.ipcRenderer.on(channelId, function (_event, message) {
    messages$.next(message);
  });
  settings.ipcRenderer.postMessage(channelId, false);
  var send = function send(msg) {
    settings.ipcRenderer.postMessage(channelId, msg);
  };
  var storage = getRxStorageMessageChannel({
    name: 'ipc-renderer',
    statics: settings.statics,
    messages$: messages$,
    send: send
  });
  return storage;
}
//# sourceMappingURL=rx-storage-ipc-renderer.js.map