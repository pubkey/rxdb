"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _websocketClient = require("./websocket-client");

Object.keys(_websocketClient).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _websocketClient[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _websocketClient[key];
    }
  });
});

var _websocketServer = require("./websocket-server");

Object.keys(_websocketServer).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _websocketServer[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _websocketServer[key];
    }
  });
});

var _websocketTypes = require("./websocket-types");

Object.keys(_websocketTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _websocketTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _websocketTypes[key];
    }
  });
});
//# sourceMappingURL=index.js.map