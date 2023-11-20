"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _rxStorageMongodb = require("./rx-storage-mongodb.js");
Object.keys(_rxStorageMongodb).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageMongodb[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageMongodb[key];
    }
  });
});
var _rxStorageInstanceMongodb = require("./rx-storage-instance-mongodb.js");
Object.keys(_rxStorageInstanceMongodb).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorageInstanceMongodb[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorageInstanceMongodb[key];
    }
  });
});
var _mongodbHelper = require("./mongodb-helper.js");
Object.keys(_mongodbHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _mongodbHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _mongodbHelper[key];
    }
  });
});
var _mongodbTypes = require("./mongodb-types.js");
Object.keys(_mongodbTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _mongodbTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _mongodbTypes[key];
    }
  });
});
//# sourceMappingURL=index.js.map