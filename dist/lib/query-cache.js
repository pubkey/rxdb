"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will only search the database once.
 */
var QueryCache = function () {
    function QueryCache() {
        (0, _classCallCheck3["default"])(this, QueryCache);

        this.subs = [];
        this._map = new Map();
    }

    /**
     * check if an equal query is in the cache,
     * if true, return the cached one,
     * if false, save the given one and return it
     * @param  {RxQuery} query
     * @return {RxQuery}
     */


    (0, _createClass3["default"])(QueryCache, [{
        key: "getByQuery",
        value: function getByQuery(query) {
            var stringRep = query.toString();
            if (!this._map.has(stringRep)) this._map.set(stringRep, query);
            return this._map.get(stringRep);
        }
    }, {
        key: "destroy",
        value: function destroy() {
            this.subs.forEach(function (sub) {
                return sub.unsubscribe();
            });
            this._map = new Map();
        }
    }]);
    return QueryCache;
}();

;

function create() {
    return new QueryCache();
}

exports["default"] = {
    create: create
};
