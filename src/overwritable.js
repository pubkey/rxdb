/**
 * functions that can or should be overwritten by plugins
 */

import RxError from './rx-error';

const funs = {
    /**
     * validates if a password can be used
     * @overwritten by plugin (optional)
     * @param  {any} password
     * @throws if password not valid
     * @return {void}
     */
    validatePassword: function(password) {
        throw RxError.pluginMissing('encryption');
    },
    /**
     * creates a key-compressor for the given schema
     * @param  {RxSchema} schema
     * @return {KeyCompressor}
     */
    createKeyCompressor(schema) {
        throw RxError.pluginMissing('keycompression');
    },
    /**
     * creates a leader-elector for the given database
     * @param  {RxDatabase} database
     * @return {LeaderElector}
     */
    createLeaderElector(database) {
        throw RxError.pluginMissing('leaderelection');
    }
};

export default funs;
