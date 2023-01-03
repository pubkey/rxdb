import { Subject } from 'rxjs';
import { getRxStorageRemote } from '../storage-remote';
import { IPC_RENDERER_KEY_PREFIX } from './electron-helper';
export function getRxStorageIpcRenderer(settings) {
  var channelId = [IPC_RENDERER_KEY_PREFIX, settings.key].join('|');
  var messages$ = new Subject();
  settings.ipcRenderer.on(channelId, (_event, message) => {
    messages$.next(message);
  });
  settings.ipcRenderer.postMessage(channelId, false);
  var send = msg => {
    settings.ipcRenderer.postMessage(channelId, msg);
  };
  var storage = getRxStorageRemote({
    identifier: 'electron-ipc-renderer',
    statics: settings.statics,
    messages$,
    send
  });
  return storage;
}
//# sourceMappingURL=rx-storage-ipc-renderer.js.map