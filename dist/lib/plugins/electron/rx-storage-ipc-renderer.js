"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRxStorageIpcRenderer = getRxStorageIpcRenderer;
var _rxjs = require("rxjs");
var _storageRemote = require("../storage-remote");
var _electronHelper = require("./electron-helper");
var _utils = require("../utils");
function getRxStorageIpcRenderer(settings) {
  var channelId = [_electronHelper.IPC_RENDERER_KEY_PREFIX, settings.key].join('|');
  var storage = (0, _storageRemote.getRxStorageRemote)({
    identifier: 'electron-ipc-renderer',
    statics: settings.statics,
    mode: settings.mode,
    messageChannelCreator() {
      var messages$ = new _rxjs.Subject();
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
          return _utils.PROMISE_RESOLVE_VOID;
        }
      });
    }
  });
  return storage;
}
//# sourceMappingURL=rx-storage-ipc-renderer.js.map