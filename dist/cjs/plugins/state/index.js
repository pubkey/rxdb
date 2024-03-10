"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  addState: true,
  RxDBStatePlugin: true
};
exports.RxDBStatePlugin = void 0;
exports.addState = addState;
var _utilsMap = require("../utils/utils-map.js");
var _rxState = require("./rx-state.js");
var _helpers = require("./helpers.js");
Object.keys(_helpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _helpers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _helpers[key];
    }
  });
});
var STATE_BY_DATABASE = new WeakMap();
async function addState(namespace = '') {
  var stateCache = (0, _utilsMap.getFromMapOrCreate)(STATE_BY_DATABASE, this, () => new Map());
  var state = await (0, _utilsMap.getFromMapOrCreate)(stateCache, namespace, () => (0, _rxState.createRxState)(this, namespace));
  this.states[namespace] = state;
  return state;
}
var RxDBStatePlugin = exports.RxDBStatePlugin = {
  name: 'state',
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      proto.addState = addState;
    }
  }
};
//# sourceMappingURL=index.js.map