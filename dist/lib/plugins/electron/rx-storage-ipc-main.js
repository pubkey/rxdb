"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exposeIpcMainRxStorage = exposeIpcMainRxStorage;
var _rxjs = require("rxjs");
var _electronHelper = require("./electron-helper");
var _rxStorageMessageChannel = require("../../rx-storage-message-channel");
/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */

function exposeIpcMainRxStorage(args) {
  var channelId = [_electronHelper.IPC_RENDERER_KEY_PREFIX, args.key].join('|');
  var messages$ = new _rxjs.Subject();
  var openRenderers = new Set();
  args.ipcMain.on(channelId, function (event, message) {
    openRenderers.add(event.sender);
    if (message) {
      messages$.next(message);
    }
  });
  var send = function send(msg) {
    /**
     * TODO we could improve performance
     * by only sending the message to the 'correct' sender
     * and removing senders whose browser window is closed.
     */
    openRenderers.forEach(function (sender) {
      sender.send(channelId, msg);
    });
  };
  (0, _rxStorageMessageChannel.exposeRxStorageMessageChannel)({
    storage: args.storage,
    messages$: messages$,
    send: send
  });
}
//# sourceMappingURL=rx-storage-ipc-main.js.map