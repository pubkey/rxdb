/**
 * functions that can or should be overwritten by plugins
 */

import {
    pluginMissing
} from './util';

export const overwritable = {
    /**
     * if this method is overwritte with one
     * that returns true, we do additional checks
     * which help the developer but have bad performance
     */
    isDevMode(): boolean {
        return false;
    },
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
     * checks if the given adapter can be used
     */
    checkAdapter(_adapter: any): Promise<boolean> {
        throw pluginMissing('adapter-check');
    },
    /**
     * overwritte to map error-codes to text-messages
     */
    tunnelErrorMessage(message: string): string {
        return `RxDB Error-Code ${message}.
        - To find out what this means, use the dev-mode-plugin https://pubkey.github.io/rxdb/custom-build.html#dev-mode
        - Or search for this code https://github.com/pubkey/rxdb/search?q=${message}
        `;
    }
};
