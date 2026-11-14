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
            /**
             * The values of the update query must be deep cloned
             * so that the document data does not share
             * object references with the object of the caller.
             */
            cloneMode: "deep"
        }
    );
    return cloned;
}
