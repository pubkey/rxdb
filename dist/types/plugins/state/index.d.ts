import type { RxDatabase, RxPlugin, RxState } from '../../types/index.d.ts';
export * from './helpers.ts';
export declare function addState<T>(this: RxDatabase, namespace?: string): Promise<RxState<T>>;
export declare const RxDBStatePlugin: RxPlugin;
