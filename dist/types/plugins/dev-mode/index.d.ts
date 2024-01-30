import type { RxPlugin } from '../../types/index.d.ts';
import { DeepReadonly } from '../../types/util.ts';
export * from './check-schema.ts';
export * from './unallowed-properties.ts';
export * from './check-query.ts';
/**
 * Suppresses the warning message shown in the console, typically invoked once the developer (hello!)
 * has acknowledged it.
 */
export declare function disableWarnings(): void;
/**
 * Deep freezes and object when in dev-mode.
 * Deep-Freezing has the same performance as deep-cloning, so we only do that in dev-mode.
 * Also we can ensure the readonly state via typescript
 * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
export declare function deepFreezeWhenDevMode<T>(obj: T): DeepReadonly<T>;
export declare const DEV_MODE_PLUGIN_NAME = "dev-mode";
export declare const RxDBDevModePlugin: RxPlugin;
