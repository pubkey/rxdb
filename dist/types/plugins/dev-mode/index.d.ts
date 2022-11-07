import type { RxPlugin } from '../../types';
import { DeepReadonly } from '../../types/util';
export * from './check-schema';
export * from './unallowed-properties';
export * from './check-query';
/**
 * Deep freezes and object when in dev-mode.
 * Deep-Freezing has the same performaance as deep-cloning, so we only do that in dev-mode.
 * Also we can ensure the readonly state via typescript
 * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
export declare function deepFreezeWhenDevMode<T>(obj: T): DeepReadonly<T>;
export declare const DEV_MODE_PLUGIN_NAME = "dev-mode";
export declare const RxDBDevModePlugin: RxPlugin;
