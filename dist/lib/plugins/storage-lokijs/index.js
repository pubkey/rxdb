"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _rxStorageLokijs = require("./rx-storage-lokijs");
Object.keys(_rxStorageLokijs).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageLokijs[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageLokijs[key];
    }
  });
});
var _lokijsHelper = require("./lokijs-helper");
Object.keys(_lokijsHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _lokijsHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _lokijsHelper[key];
    }
  });
});
var _rxStorageInstanceLoki = require("./rx-storage-instance-loki");
Object.keys(_rxStorageInstanceLoki).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageInstanceLoki[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageInstanceLoki[key];
    }
  });
});
//# sourceMappingURL=index.js.map