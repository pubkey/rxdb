/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will only search the database once.
 */
class QueryCache {
    constructor() {
        this.subs = [];
        this._map = new WeakMap();

        /**
         * TODO also using a weak-set would be much easier, but it's not supported in IE11
         * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/WeakSet
         */
        // this._set = new WeakSet();

        this._keys = {};
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
        let indexObj = this._keys[stringRep];
        if (!indexObj) {
            indexObj = {};
            this._keys[stringRep] = indexObj;
        }
        let useQuery = this._map.get(indexObj);
        if (!useQuery) {
            this._map.set(indexObj, query);
            useQuery = query;
        }
        return useQuery;
    }

    /**
     * runs the given function over every query
     * @param  {function} fun with query as first param
     */
    forEach(fun) {
        Object.entries(this._keys).forEach(entry => {
            const query = this._map.get(entry[1]);
            // clean up keys with garbage-collected values
            if (!query) {
                delete this._keys[entry[0]];
                return;
            } else
                fun(query);
        });
    }

    destroy() {
        this.subs.forEach(sub => sub.unsubscribe());
        this._keys = {};
    }
};

export function create() {
    return new QueryCache();
}
