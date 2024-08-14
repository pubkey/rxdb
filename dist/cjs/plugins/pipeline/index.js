"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxDBPipelinePlugin: true
};
exports.RxDBPipelinePlugin = void 0;
var _rxPipeline = require("./rx-pipeline.js");
Object.keys(_rxPipeline).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxPipeline[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxPipeline[key];
    }
  });
});
var _flaggedFunctions = require("./flagged-functions.js");
Object.keys(_flaggedFunctions).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _flaggedFunctions[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _flaggedFunctions[key];
    }
  });
});
var RxDBPipelinePlugin = exports.RxDBPipelinePlugin = {
  name: 'pipeline',
  rxdb: true,
  prototypes: {
    RxCollection(proto) {
      proto.addPipeline = _rxPipeline.addPipeline;
    }
  }
};
//# sourceMappingURL=index.js.map