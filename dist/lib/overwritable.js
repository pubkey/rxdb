"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _util = require("./util");

/**
 * functions that can or should be overwritten by plugins
 */
var funs = {
  /**
   * validates if a password can be used
   * @overwritten by plugin (optional)
   * @throws if password not valid
   */
  validatePassword: function validatePassword(_password) {
    throw (0, _util.pluginMissing)('encryption');
  },

  /**
   * creates a key-compressor for the given schema
   */
  createKeyCompressor: function createKeyCompressor(_rxSchema) {
    throw (0, _util.pluginMissing)('key-compression');
  },

  /**
   * creates a leader-elector for the given database
   */
  createLeaderElector: function createLeaderElector(_database) {
    throw (0, _util.pluginMissing)('leader-election');
  },

  /**
   * checks if the given adapter can be used
   */
  checkAdapter: function checkAdapter(_adapter) {
    throw (0, _util.pluginMissing)('adapter-check');
  },

  /**
   * overwritte to map error-codes to text-messages
   */
  tunnelErrorMessage: function tunnelErrorMessage(message) {
    // TODO better text with link
    return "RxDB Error-Code " + message + ".\n        - To find out what this means, use the error-messages-plugin https://pubkey.github.io/rxdb/custom-build.html#error-messages\n        - Or search for this code https://github.com/pubkey/rxdb/search?q=" + message + "\n        ";
  }
};
var _default = funs;
exports["default"] = _default;

//# sourceMappingURL=overwritable.js.map