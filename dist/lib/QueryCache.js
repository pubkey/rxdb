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
        this._map = {};
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
            var has = this._map[stringRep];
            if (!has) {
                this._map[stringRep] = query;
                return query;
            } else return has;
        }
    }, {
        key: "destroy",
        value: function destroy() {
            this.subs.forEach(function (sub) {
                return sub.unsubscribe();
            });
            this._map = {};
        }
    }]);

    return QueryCache;
}();

;

function create() {
    return new QueryCache();
}
