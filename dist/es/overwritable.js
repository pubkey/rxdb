/**
 * functions that can or should be overwritten by plugins
 */
import { pluginMissing } from './util';
var funs = {
  /**
   * validates if a password can be used
   * @overwritten by plugin (optional)
   * @throws if password not valid
   */
  validatePassword: function validatePassword(_password) {
    throw pluginMissing('encryption');
  },

  /**
   * creates a key-compressor for the given schema
   */
  createKeyCompressor: function createKeyCompressor(_rxSchema) {
    throw pluginMissing('key-compression');
  },

  /**
   * creates a leader-elector for the given database
   */
  createLeaderElector: function createLeaderElector(_database) {
    throw pluginMissing('leader-election');
  },

  /**
   * checks if the given adapter can be used
   */
  checkAdapter: function checkAdapter(_adapter) {
    throw pluginMissing('adapter-check');
  },

  /**
   * overwritte to map error-codes to text-messages
   */
  tunnelErrorMessage: function tunnelErrorMessage(message) {
    // TODO better text with link
    return "RxDB Error-Code " + message + ".\n        - To find out what this means, use the error-messages-plugin https://pubkey.github.io/rxdb/custom-build.html#error-messages\n        - Or search for this code https://github.com/pubkey/rxdb/search?q=" + message + "\n        ";
  }
};
export default funs;
//# sourceMappingURL=overwritable.js.map