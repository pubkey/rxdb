import type { RxStorageStatics } from './types/index.d.ts';
/**
 * Most RxStorage implementations use these static functions.
 * But you can use anything that implements the interface,
 * for example if your underlying database already has a query engine.
 *
 * TODO in the past we had quite some methods here. But it turned out we do not need most of them
 * so they have been stripped from the statics object. I think time has come to completely remove the
 * statics property at all.
 */
export declare const RxStorageDefaultStatics: RxStorageStatics;
