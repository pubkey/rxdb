"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createQueryCache = createQueryCache;
exports.QueryCache = void 0;

/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will only search the database once.
 */
var QueryCache = /*#__PURE__*/function () {
  function QueryCache() {
    this.subs = [];
    this._map = new Map();
  }
  /**
   * check if an equal query is in the cache,
   * if true, return the cached one,
   * if false, save the given one and return it
   */


  var _proto = QueryCache.prototype;

  _proto.getByQuery = function getByQuery(query) {
    var stringRep = query.toString();
    if (!this._map.has(stringRep)) this._map.set(stringRep, query);
    return this._map.get(stringRep);
  };

  _proto.destroy = function destroy() {
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    this._map = new Map();
  };

  return QueryCache;
}();

exports.QueryCache = QueryCache;

function createQueryCache() {
  return new QueryCache();
}

//# sourceMappingURL=query-cache.js.map