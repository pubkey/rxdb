"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRxStorageIpcRenderer = getRxStorageIpcRenderer;
var _rxjs = require("rxjs");
var _rxStorageMessageChannel = require("../../rx-storage-message-channel");
var _electronHelper = require("./electron-helper");
function getRxStorageIpcRenderer(settings) {
  var channelId = [_electronHelper.IPC_RENDERER_KEY_PREFIX, settings.key].join('|');
  var messages$ = new _rxjs.Subject();
  settings.ipcRenderer.on(channelId, function (_event, message) {
    messages$.next(message);
  });
  settings.ipcRenderer.postMessage(channelId, false);
  var send = function send(msg) {
    settings.ipcRenderer.postMessage(channelId, msg);
  };
  var storage = (0, _rxStorageMessageChannel.getRxStorageMessageChannel)({
    name: 'ipc-renderer',
    statics: settings.statics,
    messages$: messages$,
    send: send
  });
  return storage;
}
//# sourceMappingURL=rx-storage-ipc-renderer.js.map