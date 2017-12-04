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
    validatePassword() {
        throw RxError.pluginMissing('encryption');
    },
    /**
     * creates a key-compressor for the given schema
     * @param  {RxSchema} schema
     * @return {KeyCompressor}
     */
    createKeyCompressor() {
        throw RxError.pluginMissing('keycompression');
    },
    /**
     * creates a leader-elector for the given database
     * @param  {RxDatabase} database
     * @return {LeaderElector}
     */
    createLeaderElector() {
        throw RxError.pluginMissing('leaderelection');
    },

    /**
     * checks if the given adapter can be used
     * @return {any} adapter
     */
    checkAdapter() {
        throw RxError.pluginMissing('adapter-check');
    },
    /**
     * overwritte to map error-codes to text-messages
     * @param  {string} message
     * @return {string}
     */
    tunnelErrorMessage(message) {
        // TODO better text with link
        return `RxDB Error-Code ${message}.
        - To find out what this means, use the error-messages-plugin https://pubkey.github.io/rxdb/custom-build.html#error-messages
        - Or search for this code https://github.com/pubkey/rxdb/search?l=JavaScript&q=${message}%3A
        `;
    }
};

export default funs;
