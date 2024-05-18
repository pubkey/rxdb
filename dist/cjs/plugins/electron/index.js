"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _rxStorageIpcRenderer = require("./rx-storage-ipc-renderer.js");
Object.keys(_rxStorageIpcRenderer).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageIpcRenderer[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageIpcRenderer[key];
    }
  });
});
var _rxStorageIpcMain = require("./rx-storage-ipc-main.js");
Object.keys(_rxStorageIpcMain).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageIpcMain[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageIpcMain[key];
    }
  });
});
var _electronHelper = require("./electron-helper.js");
Object.keys(_electronHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _electronHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _electronHelper[key];
    }
  });
});
//# sourceMappingURL=index.js.map