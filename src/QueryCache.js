/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will only search the database once.
 */
class QueryCache {
    constructor() {
        this.subs = [];
        this._map = {};
    }

    /**
     * check if an equal query is in the cache,
     * if true, return the cached one,
     * if false, save the given one and return it
     * @param  {RxQuery} query
     * @return {RxQuery}
     */
    getByQuery(query) {
        const stringRep = query.toString();
        const has = this._map[stringRep];
        if (!has) {
            this._map[stringRep] = query;
            return query;
        } else return has;
    }

    destroy() {
        this.subs.forEach(sub => sub.unsubscribe());
        this._map = {};
    }
};

export function create() {
    return new QueryCache();
}

export default {
    create
};
