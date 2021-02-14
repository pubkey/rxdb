/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will reuse the first RxQuery
 */
import type { RxQuery, RxCacheReplacementPolicy, RxCollection } from './types';
export declare class QueryCache {
    _map: Map<string, RxQuery>;
    /**
     * check if an equal query is in the cache,
     * if true, return the cached one,
     * if false, save the given one and return it
     */
    getByQuery(rxQuery: RxQuery): RxQuery;
}
export declare function createQueryCache(): QueryCache;
export declare function uncacheRxQuery(queryCache: QueryCache, rxQuery: RxQuery): void;
export declare function countRxQuerySubscribers(rxQuery: RxQuery): number;
export declare const DEFAULT_TRY_TO_KEEP_MAX = 100;
export declare const DEFAULT_UNEXECUTED_LIFETME: number;
/**
 * The default cache replacement policy
 * See docs-src/query-cache.md to learn how it should work.
 * Notice that this runs often and should block the cpu as less as possible
 * This is a monad which makes it easier to unit test
 */
export declare const defaultCacheReplacementPolicyMonad: (tryToKeepMax: number, unExecutedLifetime: number) => RxCacheReplacementPolicy;
export declare const defaultCacheReplacementPolicy: RxCacheReplacementPolicy;
export declare const COLLECTIONS_WITH_RUNNING_CLEANUP: WeakSet<RxCollection>;
/**
 * Triggers the cache replacement policy after waitTime has passed.
 * We do not run this directly because at exactly the time a query is created,
 * we need all CPU to minimize latency.
 * Also this should not be triggered multiple times when waitTime is still waiting.
 */
export declare function triggerCacheReplacement(rxCollection: RxCollection): void;
