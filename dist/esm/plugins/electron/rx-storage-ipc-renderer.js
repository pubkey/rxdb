import { Subject } from 'rxjs';
import { getRxStorageRemote } from "../storage-remote/index.js";
import { IPC_RENDERER_KEY_PREFIX } from "./electron-helper.js";
import { PROMISE_RESOLVE_VOID } from "../utils/index.js";
export function getRxStorageIpcRenderer(settings) {
  var channelId = [IPC_RENDERER_KEY_PREFIX, settings.key].join('|');
  var storage = getRxStorageRemote({
    identifier: 'electron-ipc-renderer',
    mode: settings.mode,
    messageChannelCreator() {
      var messages$ = new Subject();
      var listener = (_event, message) => {
        messages$.next(message);
      };
      settings.ipcRenderer.on(channelId, listener);
      settings.ipcRenderer.postMessage(channelId, false);
      return Promise.resolve({
        messages$,
        send(msg) {
          settings.ipcRenderer.postMessage(channelId, msg);
        },
        close() {
          settings.ipcRenderer.removeListener(channelId, listener);
          return PROMISE_RESOLVE_VOID;
        }
      });
    }
  });
  return storage;
}
//# sourceMappingURL=rx-storage-ipc-renderer.js.map