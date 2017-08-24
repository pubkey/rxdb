'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _RxError = require('./RxError');

var _RxError2 = _interopRequireDefault(_RxError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var funs = {
  /**
   * validates if a password can be used
   * @overwritten by plugin (optional)
   * @param  {any} password
   * @throws if password not valid
   * @return {void}
   */
  validatePassword: function validatePassword(password) {
    throw _RxError2['default'].pluginMissing('encryption');
  },
  /**
   * creates a key-compressor for the given schema
   * @param  {RxSchema} schema
   * @return {KeyCompressor}
   */
  createKeyCompressor: function createKeyCompressor(schema) {
    throw _RxError2['default'].pluginMissing('keycompression');
  },

  /**
   * creates a leader-elector for the given database
   * @param  {RxDatabase} database
   * @return {LeaderElector}
   */
  createLeaderElector: function createLeaderElector(database) {
    throw _RxError2['default'].pluginMissing('leaderelection');
  }
}; /**
    * functions that can or should be overwritten by plugins
    */

exports['default'] = funs;
