"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.errorToPlainJson = errorToPlainJson;
exports.pluginMissing = pluginMissing;
var _utilsString = require("./utils-string");
/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
function pluginMissing(pluginKey) {
  var keyParts = pluginKey.split('-');
  var pluginName = 'RxDB';
  keyParts.forEach(part => {
    pluginName += (0, _utilsString.ucfirst)(part);
  });
  pluginName += 'Plugin';
  return new Error("You are using a function which must be overwritten by a plugin.\n        You should either prevent the usage of this function or add the plugin via:\n            import { " + pluginName + " } from 'rxdb/plugins/" + pluginKey + "';\n            addRxPlugin(" + pluginName + ");\n        ");
}
function errorToPlainJson(err) {
  var ret = {
    name: err.name,
    message: err.message,
    rxdb: err.rxdb,
    parameters: err.parameters,
    code: err.code,
    // stack must be last to make it easier to read the json in a console.
    stack: err.stack
  };
  return ret;
}
//# sourceMappingURL=utils-error.js.map