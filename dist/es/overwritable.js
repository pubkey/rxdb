/**
 * functions that can or should be overwritten by plugins
 * IMPORTANT: Do not import any big stuff from RxDB here,
 * the 'overwritable' can be used inside of WebWorkers for the RxStorage only and
 * we do not want to have the full RxDB lib bundled in them.
 */
import { pluginMissing } from './util';
export var overwritable = {
  /**
   * if this method is overwritte with one
   * that returns true, we do additional checks
   * which help the developer but have bad performance
   */
  isDevMode: function isDevMode() {
    return false;
  },

  /**
   * Deep freezes and object when in dev-mode.
   * Deep-Freezing has the same performaance as deep-cloning, so we only do that in dev-mode.
   * Also we can ensure the readonly state via typescript
   * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
   */
  deepFreezeWhenDevMode: function deepFreezeWhenDevMode(obj) {
    return obj;
  },

  /**
   * validates if a password can be used
   * @overwritten by plugin (optional)
   * @throws if password not valid
   */
  validatePassword: function validatePassword(_password) {
    throw pluginMissing('encryption');
  },

  /**
   * overwritte to map error-codes to text-messages
   */
  tunnelErrorMessage: function tunnelErrorMessage(message) {
    return "RxDB Error-Code " + message + ".\n        - To find out what this means, use the dev-mode-plugin https://pubkey.github.io/rxdb/custom-build.html#dev-mode\n        - Or search for this code https://github.com/pubkey/rxdb/search?q=" + message + "\n        ";
  }
};
//# sourceMappingURL=overwritable.js.map