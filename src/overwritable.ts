/**
 * functions that can or should be overwritten by plugins
 * IMPORTANT: Do not import any big stuff from RxDB here!
 * An 'overwritable' can be used inside WebWorkers for RxStorage only,
 * and we do not want to have the full RxDB lib bundled in them.
 */

import type { DeepReadonly } from './types/util';

export const overwritable = {
    /**
     * if this method is overwritten with one
     * that returns true, we do additional checks
     * which help the developer but have bad performance
     */
    isDevMode(): boolean {
        return false;
    },

    /**
     * Deep freezes and object when in dev-mode.
     * Deep-Freezing has the same performance as deep-cloning, so we only do that in dev-mode.
     * Also, we can ensure the readonly state via typescript
     * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
     */
    deepFreezeWhenDevMode<T>(obj: T): DeepReadonly<T> {
        return obj as any;
    },

    /**
     * overwritten to map error-codes to text-messages
     */
    tunnelErrorMessage(message: string): string {
        return `RxDB Error-Code ${message}.
        Error messages are not included in RxDB core to reduce build size.
        - To find out what this error means, either use the dev-mode-plugin https://rxdb.info/dev-mode.html
        - or search for the error code here: https://github.com/pubkey/rxdb/search?q=${message}
        `;
    }
};
