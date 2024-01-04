"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _rxStorageRemote = require("./rx-storage-remote.js");
Object.keys(_rxStorageRemote).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageRemote[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageRemote[key];
    }
  });
});
var _storageRemoteTypes = require("./storage-remote-types.js");
Object.keys(_storageRemoteTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _storageRemoteTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _storageRemoteTypes[key];
    }
  });
});
var _storageRemoteHelpers = require("./storage-remote-helpers.js");
Object.keys(_storageRemoteHelpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _storageRemoteHelpers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _storageRemoteHelpers[key];
    }
  });
});
var _messageChannelCache = require("./message-channel-cache.js");
Object.keys(_messageChannelCache).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _messageChannelCache[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _messageChannelCache[key];
    }
  });
});
var _remote = require("./remote.js");
Object.keys(_remote).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _remote[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _remote[key];
    }
  });
});
//# sourceMappingURL=index.js.map