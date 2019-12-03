/**
 * functions that can or should be overwritten by plugins
 */

import {
    RxDatabase
} from './types';
import {
    pluginMissing
} from './util';

const funs: { [k: string]: Function } = {
    /**
     * validates if a password can be used
     * @overwritten by plugin (optional)
     * @throws if password not valid
     */
    validatePassword(_password: string | any): void {
        throw pluginMissing('encryption');
    },
    /**
     * creates a key-compressor for the given schema
     */
    createKeyCompressor(_rxSchema: any): any {
        throw pluginMissing('key-compression');
    },
    /**
     * creates a leader-elector for the given database
     */
    createLeaderElector(_database: RxDatabase | RxDatabase): any {
        throw pluginMissing('leader-election');
    },

    /**
     * checks if the given adapter can be used
     */
    checkAdapter(_adapter: any): Promise<boolean> {
        throw pluginMissing('adapter-check');
    },
    /**
     * overwritte to map error-codes to text-messages
     */
    tunnelErrorMessage(message: string): string {
        // TODO better text with link
        return `RxDB Error-Code ${message}.
        - To find out what this means, use the error-messages-plugin https://pubkey.github.io/rxdb/custom-build.html#error-messages
        - Or search for this code https://github.com/pubkey/rxdb/search?q=${message}
        `;
    }
};

export default funs;
