"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _rxError = require("./rx-error");

/**
 * functions that can or should be overwritten by plugins
 */
var funs = {
  /**
   * validates if a password can be used
   * @overwritten by plugin (optional)
   * @param  {any} password
   * @throws if password not valid
   * @return {void}
   */
  validatePassword: function validatePassword() {
    throw (0, _rxError.pluginMissing)('encryption');
  },

  /**
   * creates a key-compressor for the given schema
   * @param  {RxSchema} schema
   * @return {KeyCompressor}
   */
  createKeyCompressor: function createKeyCompressor() {
    throw (0, _rxError.pluginMissing)('key-compression');
  },

  /**
   * creates a leader-elector for the given database
   * @param  {RxDatabase} database
   * @return {LeaderElector}
   */
  createLeaderElector: function createLeaderElector() {
    throw (0, _rxError.pluginMissing)('leaderelection');
  },

  /**
   * checks if the given adapter can be used
   * @return {any} adapter
   */
  checkAdapter: function checkAdapter() {
    throw (0, _rxError.pluginMissing)('adapter-check');
  },

  /**
   * overwritte to map error-codes to text-messages
   * @param  {string} message
   * @return {string}
   */
  tunnelErrorMessage: function tunnelErrorMessage(message) {
    // TODO better text with link
    return "RxDB Error-Code " + message + ".\n        - To find out what this means, use the error-messages-plugin https://pubkey.github.io/rxdb/custom-build.html#error-messages\n        - Or search for this code https://github.com/pubkey/rxdb/search?q=" + message + "\n        ";
  }
};
var _default = funs;
exports["default"] = _default;

//# sourceMappingURL=overwritable.js.map