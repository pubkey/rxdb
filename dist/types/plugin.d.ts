import type { RxPlugin } from './types';
/**
 * Add a plugin to the RxDB library.
 * Plugins are added globally and cannot be removed.
 */
export declare function addRxPlugin(plugin: RxPlugin): void;
