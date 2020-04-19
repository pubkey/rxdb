/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will only search the database once.
 */
import { Subscription } from 'rxjs';
import type { RxQuery } from './types';
export declare class QueryCache {
    subs: Subscription[];
    _map: Map<string, RxQuery>;
    constructor();
    /**
     * check if an equal query is in the cache,
     * if true, return the cached one,
     * if false, save the given one and return it
     */
    getByQuery(query: RxQuery): RxQuery;
    destroy(): void;
}
export declare function createQueryCache(): QueryCache;
