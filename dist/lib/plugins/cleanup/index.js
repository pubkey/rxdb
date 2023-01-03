"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxDBCleanupPlugin: true
};
exports.RxDBCleanupPlugin = void 0;
var _cleanup = require("./cleanup");
Object.keys(_cleanup).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _cleanup[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _cleanup[key];
    }
  });
});
var RxDBCleanupPlugin = {
  name: 'cleanup',
  rxdb: true,
  prototypes: {},
  hooks: {
    createRxCollection: {
      after: i => {
        (0, _cleanup.startCleanupForRxCollection)(i.collection);
      }
    }
  }
};
exports.RxDBCleanupPlugin = RxDBCleanupPlugin;
//# sourceMappingURL=index.js.map