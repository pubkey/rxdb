"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRxStorageIpcRenderer = getRxStorageIpcRenderer;
var _rxjs = require("rxjs");
var _storageRemote = require("../storage-remote");
var _electronHelper = require("./electron-helper");
function getRxStorageIpcRenderer(settings) {
  var channelId = [_electronHelper.IPC_RENDERER_KEY_PREFIX, settings.key].join('|');
  var messages$ = new _rxjs.Subject();
  settings.ipcRenderer.on(channelId, (_event, message) => {
    messages$.next(message);
  });
  settings.ipcRenderer.postMessage(channelId, false);
  var send = msg => {
    settings.ipcRenderer.postMessage(channelId, msg);
  };
  var storage = (0, _storageRemote.getRxStorageRemote)({
    identifier: 'electron-ipc-renderer',
    statics: settings.statics,
    messages$,
    send
  });
  return storage;
}
//# sourceMappingURL=rx-storage-ipc-renderer.js.map