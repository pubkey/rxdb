/**
 * functions that can or should be overwritten by plugins
 */

import {
    pluginMissing
} from './rx-error';

import {
    RxSchema
} from './rx-schema';
import {
    RxDatabase
} from '../typings';
import {
    RxDatabaseBase
} from './rx-database';

const funs = {
    /**
     * validates if a password can be used
     * @overwritten by plugin (optional)
     * @param  {any} password
     * @throws if password not valid
     * @return {void}
     */
    validatePassword(_password: string | any) {
        throw pluginMissing('encryption');
    },
    /**
     * creates a key-compressor for the given schema
     * @param  {RxSchema} schema
     * @return {KeyCompressor}
     */
    createKeyCompressor(_schema: RxSchema) {
        throw pluginMissing('key-compression');
    },
    /**
     * creates a leader-elector for the given database
     * @param  {RxDatabase} database
     * @return {LeaderElector}
     */
    createLeaderElector(_database: RxDatabaseBase | RxDatabase) {
        throw pluginMissing('leader-election');
    },

    /**
     * checks if the given adapter can be used
     * @return {any} adapter
     */
    checkAdapter(_adapter: any) {
        throw pluginMissing('adapter-check');
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
        - Or search for this code https://github.com/pubkey/rxdb/search?q=${message}
        `;
    }
};

export default funs;
