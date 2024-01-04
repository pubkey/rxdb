/**
 * Custom build of the mingo updater for smaller build size
 */

import {
    createUpdater
} from "mingo/updater";
import {
    clone
} from '../utils/index.ts';
import type {
    UpdateQuery
} from '../../types/index';

let updater: any;
export function mingoUpdater<T>(
    d: T, op: UpdateQuery<T>
): T {
    if (!updater) {
        const updateObject = createUpdater({ cloneMode: "none" });
        updater = (d: T, op: UpdateQuery<T>) => {
            const cloned = clone(d);
            updateObject(cloned as any, op as any);
            return cloned;
        }
    }
    return updater(d, op);
}
