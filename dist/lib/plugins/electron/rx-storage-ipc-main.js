"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exposeIpcMainRxStorage = exposeIpcMainRxStorage;
var _util = require("../../util");
var _rxjs = require("rxjs");
var _electronHelper = require("./electron-helper");
var _rxStorageMessageChannel = require("../../rx-storage-message-channel");
/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */

function exposeIpcMainRxStorage(args) {
  var onCreateRemoteStorage$ = new _rxjs.Subject();
  var portByDatabaseInstanceToken = new Map();
  args.ipcMain.on([_electronHelper.IPC_RENDERER_KEY_PREFIX, 'postMessage', args.key, 'createStorageInstance'].join('|'), function (event, params) {
    var _event$ports = event.ports,
      port = _event$ports[0];
    portByDatabaseInstanceToken.set(params.databaseInstanceToken, port);
    onCreateRemoteStorage$.next({
      params: params,
      port: port
    });
  });
  (0, _rxStorageMessageChannel.exposeRxStorageMessageChannel)({
    storage: args.storage,
    onCreateRemoteStorage$: onCreateRemoteStorage$
  });
  args.ipcMain.on(_electronHelper.IPC_RENDERER_TO_MAIN, function (_event, message) {
    var port = (0, _util.getFromMapOrThrow)(portByDatabaseInstanceToken, message.instanceId);
    (0, _util.ensureNotFalsy)(port.onmessage)({
      data: message
    });
  });
}
//# sourceMappingURL=rx-storage-ipc-main.js.map