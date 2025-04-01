"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exposeIpcMainRxStorage = exposeIpcMainRxStorage;
var _rxjs = require("rxjs");
var _electronHelper = require("./electron-helper.js");
var _index = require("../storage-remote/index.js");
/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */

function exposeIpcMainRxStorage(args) {
  var channelId = [_electronHelper.IPC_RENDERER_KEY_PREFIX, args.key].join('|');
  var messages$ = new _rxjs.Subject();
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
  (0, _index.exposeRxStorageRemote)({
    storage: args.storage,
    messages$,
    send
  });
}
//# sourceMappingURL=rx-storage-ipc-main.js.map