/**
 * Custom build of the mingo updater for smaller build size
 */
import { update } from "mingo/updater";
import {
    clone
} from '../utils/index.ts';
import type {
    UpdateQuery
} from '../../types/index';

export function mingoUpdater<T>(
    d: T, op: UpdateQuery<T>
): T {
    const cloned = clone(d);
    update<any>(
        cloned,
        op,
        undefined,
        undefined,
        {
            cloneMode: "none"
        }
    );
    return cloned;
}
