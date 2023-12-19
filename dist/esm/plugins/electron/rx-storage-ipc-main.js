/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */

import { Subject } from 'rxjs';
import { IPC_RENDERER_KEY_PREFIX } from "./electron-helper.js";
import { exposeRxStorageRemote } from "../storage-remote/index.js";
export function exposeIpcMainRxStorage(args) {
  var channelId = [IPC_RENDERER_KEY_PREFIX, args.key].join('|');
  var messages$ = new Subject();
  var openRenderers = new Set();
  args.ipcMain.on(channelId, (event, message) => {
    addOpenRenderer(event.sender);
    if (message) {
      messages$.next(message);
    }
  });
  var addOpenRenderer = renderer => {
    if (openRenderers.has(renderer)) return;
    openRenderers.add(renderer);
    renderer.on('destroyed', () => openRenderers.delete(renderer));
  };
  var send = msg => {
    /**
     * TODO we could improve performance
     * by only sending the message to the 'correct' sender.
     */
    openRenderers.forEach(sender => {
      sender.send(channelId, msg);
    });
  };
  exposeRxStorageRemote({
    storage: args.storage,
    messages$,
    send
  });
}
//# sourceMappingURL=rx-storage-ipc-main.js.map