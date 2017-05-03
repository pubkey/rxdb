"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.create = create;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will only search the database once.
 */
var QueryCache = function () {
    function QueryCache() {
        _classCallCheck(this, QueryCache);

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


    _createClass(QueryCache, [{
        key: "getByQuery",
        value: function getByQuery(query) {
            var stringRep = query.toString();
            var indexObj = this._keys[stringRep];
            if (!indexObj) {
                indexObj = {};
                this._keys[stringRep] = indexObj;
            }
            var useQuery = this._map.get(indexObj);
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

    }, {
        key: "forEach",
        value: function forEach(fun) {
            var _this = this;

            Object.entries(this._keys).forEach(function (entry) {
                var query = _this._map.get(entry[1]);
                // clean up keys with garbage-collected values
                if (!query) {
                    delete _this._keys[entry[0]];
                    return;
                } else fun(query);
            });
        }
    }, {
        key: "destroy",
        value: function destroy() {
            this.subs.forEach(function (sub) {
                return sub.unsubscribe();
            });
            this._keys = {};
        }
    }]);

    return QueryCache;
}();

;

function create() {
    return new QueryCache();
}
