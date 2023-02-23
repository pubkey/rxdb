import type { RxStorageStatics } from './types';
/**
 * Most RxStorage implementations use these static functions.
 * But you can use anything that implements the interface,
 * for example if your underlying database already has a query engine.
 */
export declare const RxStorageDefaultStatics: RxStorageStatics;
