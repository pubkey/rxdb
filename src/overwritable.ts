/**
 * functions that can or should be overwritten by plugins
 * IMPORTANT: Do not import any big stuff from RxDB here!
 * An 'overwritable' can be used inside WebWorkers for RxStorage only,
 * and we do not want to have the full RxDB lib bundled in them.
 */

import type { DeepReadonly } from './types/util.d.ts';

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
        return `
        RxDB Error-Code: ${message}.
        Hint: Error messages are not included in RxDB core to reduce build size.
        To show the full error messages and to ensure that you do not make any mistakes when using RxDB,
        use the dev-mode plugin when you are in development mode: https://rxdb.info/dev-mode.html?console=error
        `;
    }
};
