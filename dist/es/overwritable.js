/**
 * functions that can or should be overwritten by plugins
 */

import RxError from './rx-error';

var funs = {
  /**
   * validates if a password can be used
   * @overwritten by plugin (optional)
   * @param  {any} password
   * @throws if password not valid
   * @return {void}
   */
  validatePassword: function validatePassword() {
    throw RxError.pluginMissing('encryption');
  },

  /**
   * creates a key-compressor for the given schema
   * @param  {RxSchema} schema
   * @return {KeyCompressor}
   */
  createKeyCompressor: function createKeyCompressor() {
    throw RxError.pluginMissing('keycompression');
  },

  /**
   * creates a leader-elector for the given database
   * @param  {RxDatabase} database
   * @return {LeaderElector}
   */
  createLeaderElector: function createLeaderElector() {
    throw RxError.pluginMissing('leaderelection');
  },


  /**
   * checks if the given adapter can be used
   * @return {any} adapter
   */
  checkAdapter: function checkAdapter() {
    throw RxError.pluginMissing('adapter-check');
  }
};

export default funs;