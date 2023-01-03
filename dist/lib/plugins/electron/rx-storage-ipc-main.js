"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exposeIpcMainRxStorage = exposeIpcMainRxStorage;
var _rxjs = require("rxjs");
var _electronHelper = require("./electron-helper");
var _storageRemote = require("../storage-remote");
/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */

function exposeIpcMainRxStorage(args) {
  var channelId = [_electronHelper.IPC_RENDERER_KEY_PREFIX, args.key].join('|');
  var messages$ = new _rxjs.Subject();
  var openRenderers = new Set();
  args.ipcMain.on(channelId, (event, message) => {
    openRenderers.add(event.sender);
    if (message) {
      messages$.next(message);
    }
  });
  var send = msg => {
    /**
     * TODO we could improve performance
     * by only sending the message to the 'correct' sender
     * and removing senders whose browser window is closed.
     */
    openRenderers.forEach(sender => {
      sender.send(channelId, msg);
    });
  };
  (0, _storageRemote.exposeRxStorageRemote)({
    storage: args.storage,
    messages$,
    send
  });
}
//# sourceMappingURL=rx-storage-ipc-main.js.map