"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRxStorageIpcRenderer = getRxStorageIpcRenderer;
var _rxStorageMessageChannel = require("../../rx-storage-message-channel");
var _util = require("../../util");
var _electronHelper = require("./electron-helper");
function getRxStorageIpcRenderer(settings) {
  var storage = (0, _rxStorageMessageChannel.getRxStorageMessageChannel)({
    name: 'ipc-renderer',
    statics: settings.statics,
    createRemoteStorage: function createRemoteStorage(port, params) {
      /**
       * Electron does not allow to send messages
       * via ports from ipcRenderer->ipcMain.
       * Therefore we have to overwrite the port1.postMessage()
       * so that it works over args.ipcMain.on() messages.
       */
      var messageChannel = (0, _util.getFromMapOrThrow)(storage.messageChannelByPort, port);
      var otherPort = messageChannel.port1;
      otherPort.postMessage = function (message) {
        settings.ipcRenderer.send(_electronHelper.IPC_RENDERER_TO_MAIN, message);
      };
      settings.ipcRenderer.postMessage([_electronHelper.IPC_RENDERER_KEY_PREFIX, 'postMessage', settings.key, 'createStorageInstance'].join('|'), params, [port]);
    }
  });
  return storage;
}
//# sourceMappingURL=rx-storage-ipc-renderer.js.map