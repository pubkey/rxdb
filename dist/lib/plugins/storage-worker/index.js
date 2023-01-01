"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _inWorker = require("./in-worker");
Object.keys(_inWorker).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _inWorker[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _inWorker[key];
    }
  });
});
var _nonWorker = require("./non-worker");
Object.keys(_nonWorker).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _nonWorker[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _nonWorker[key];
    }
  });
});
//# sourceMappingURL=index.js.map