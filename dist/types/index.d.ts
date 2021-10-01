/**
 * this is the default rxdb-export
 * It has a batteries-included guarantee.
 * It basically just rxdb-core with some default plugins
 */
import type { RxDatabase, RxDatabaseCreator, RxCollection } from './types';
/**
 * Adds the default plugins
 * that are used on non-custom builds.
 */
export declare function addDefaultRxPlugins(): void;
/**
 * Because we have set sideEffects: false
 * in the package.json, we have to ensure that the default plugins
 * are added before the first database is created.
 * So we have to wrap the createRxDatabase function.
 * Always ensure that this function has the same typings as in the rx-database.ts
 * TODO create a type for that function and use it on both sides.
 */
export declare function createRxDatabase<Collections = {
    [key: string]: RxCollection;
}, Internals = any, InstanceCreationOptions = any>(params: RxDatabaseCreator<Internals, InstanceCreationOptions>): Promise<RxDatabase<Collections, Internals, InstanceCreationOptions>>;
export * from './core';
export * from './plugins/pouchdb';
