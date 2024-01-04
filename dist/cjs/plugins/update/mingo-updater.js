"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mingoUpdater = mingoUpdater;
var _updater = require("mingo/updater");
var _index = require("../utils/index.js");
/**
 * Custom build of the mingo updater for smaller build size
 */

var updater;
function mingoUpdater(d, op) {
  if (!updater) {
    var updateObject = (0, _updater.createUpdater)({
      cloneMode: "none"
    });
    updater = (d, op) => {
      var cloned = (0, _index.clone)(d);
      updateObject(cloned, op);
      return cloned;
    };
  }
  return updater(d, op);
}
//# sourceMappingURL=mingo-updater.js.map