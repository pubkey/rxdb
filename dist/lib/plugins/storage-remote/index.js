"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _rxStorageRemote = require("./rx-storage-remote");
Object.keys(_rxStorageRemote).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageRemote[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _rxStorageRemote[key];
    }
  });
});
var _storageRemoteTypes = require("./storage-remote-types");
Object.keys(_storageRemoteTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _storageRemoteTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _storageRemoteTypes[key];
    }
  });
});
var _storageRemoteHelpers = require("./storage-remote-helpers");
Object.keys(_storageRemoteHelpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _storageRemoteHelpers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _storageRemoteHelpers[key];
    }
  });
});
var _remote = require("./remote");
Object.keys(_remote).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _remote[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _remote[key];
    }
  });
});
var _websocket = require("./websocket");
Object.keys(_websocket).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _websocket[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _websocket[key];
    }
  });
});
//# sourceMappingURL=index.js.map