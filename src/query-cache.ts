/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will only search the database once.
 */
import {
    Subscription
} from 'rxjs';
import {
    RxQuery
} from './types';

export class QueryCache {

    public subs: Subscription[] = [];
    private _map: Map<string, RxQuery> = new Map();
    constructor() { }

    /**
     * check if an equal query is in the cache,
     * if true, return the cached one,
     * if false, save the given one and return it
     */
    getByQuery(query: RxQuery): RxQuery {
        const stringRep = query.toString();
        if (!this._map.has(stringRep))
            this._map.set(stringRep, query);
        return this._map.get(stringRep);
    }

    destroy(): void {
        this.subs.forEach(sub => sub.unsubscribe());
        this._map = new Map();
    }
}

export function createQueryCache() {
    return new QueryCache();
}
