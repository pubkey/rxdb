/**
 * Custom build of the mingo updater for smaller build size
 */
import type { UpdateQuery } from '../../types/index';
export declare function mingoUpdater<T>(d: T, op: UpdateQuery<T>): T;
