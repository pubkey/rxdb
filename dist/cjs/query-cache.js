"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QueryCache = exports.DEFAULT_UNEXECUTED_LIFETIME = exports.DEFAULT_TRY_TO_KEEP_MAX = exports.COLLECTIONS_WITH_RUNNING_CLEANUP = void 0;
exports.countRxQuerySubscribers = countRxQuerySubscribers;
exports.createQueryCache = createQueryCache;
exports.defaultCacheReplacementPolicyMonad = exports.defaultCacheReplacementPolicy = void 0;
exports.triggerCacheReplacement = triggerCacheReplacement;
exports.uncacheRxQuery = uncacheRxQuery;
var _index = require("./plugins/utils/index.js");
/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will reuse the first RxQuery
 */
var QueryCache = exports.QueryCache = /*#__PURE__*/function () {
  function QueryCache() {
    this._map = new Map();
  }
  var _proto = QueryCache.prototype;
  /**
   * check if an equal query is in the cache,
   * if true, return the cached one,
   * if false, save the given one and return it
   */
  _proto.getByQuery = function getByQuery(rxQuery) {
    var stringRep = rxQuery.toString();
    var ret = (0, _index.getFromMapOrCreate)(this._map, stringRep, () => rxQuery);
    return ret;
  };
  return QueryCache;
}();
function createQueryCache() {
  return new QueryCache();
}
function uncacheRxQuery(queryCache, rxQuery) {
  rxQuery.uncached = true;
  var stringRep = rxQuery.toString();
  queryCache._map.delete(stringRep);
}
function countRxQuerySubscribers(rxQuery) {
  return rxQuery.refCount$.observers.length;
}
var DEFAULT_TRY_TO_KEEP_MAX = exports.DEFAULT_TRY_TO_KEEP_MAX = 100;
var DEFAULT_UNEXECUTED_LIFETIME = exports.DEFAULT_UNEXECUTED_LIFETIME = 30 * 1000;

/**
 * The default cache replacement policy
 * See docs-src/query-cache.md to learn how it should work.
 * Notice that this runs often and should block the cpu as less as possible
 * This is a monad which makes it easier to unit test
 */
var defaultCacheReplacementPolicyMonad = (tryToKeepMax, unExecutedLifetime) => (_collection, queryCache) => {
  if (queryCache._map.size < tryToKeepMax) {
    return;
  }
  var minUnExecutedLifetime = (0, _index.now)() - unExecutedLifetime;
  var maybeUncache = [];
  var queriesInCache = Array.from(queryCache._map.values());
  for (var rxQuery of queriesInCache) {
    // filter out queries with subscribers
    if (countRxQuerySubscribers(rxQuery) > 0) {
      continue;
    }
    // directly uncache queries that never executed and are older than unExecutedLifetime
    if (rxQuery._lastEnsureEqual === 0 && rxQuery._creationTime < minUnExecutedLifetime) {
      uncacheRxQuery(queryCache, rxQuery);
      continue;
    }
    maybeUncache.push(rxQuery);
  }
  var mustUncache = maybeUncache.length - tryToKeepMax;
  if (mustUncache <= 0) {
    return;
  }
  var sortedByLastUsage = maybeUncache.sort((a, b) => a._lastEnsureEqual - b._lastEnsureEqual);
  var toRemove = sortedByLastUsage.slice(0, mustUncache);
  toRemove.forEach(rxQuery => uncacheRxQuery(queryCache, rxQuery));
};
exports.defaultCacheReplacementPolicyMonad = defaultCacheReplacementPolicyMonad;
var defaultCacheReplacementPolicy = exports.defaultCacheReplacementPolicy = defaultCacheReplacementPolicyMonad(DEFAULT_TRY_TO_KEEP_MAX, DEFAULT_UNEXECUTED_LIFETIME);
var COLLECTIONS_WITH_RUNNING_CLEANUP = exports.COLLECTIONS_WITH_RUNNING_CLEANUP = new WeakSet();

/**
 * Triggers the cache replacement policy after waitTime has passed.
 * We do not run this directly because at exactly the time a query is created,
 * we need all CPU to minimize latency.
 * Also this should not be triggered multiple times when waitTime is still waiting.
 */
function triggerCacheReplacement(rxCollection) {
  if (COLLECTIONS_WITH_RUNNING_CLEANUP.has(rxCollection)) {
    // already started
    return;
  }
  COLLECTIONS_WITH_RUNNING_CLEANUP.add(rxCollection);

  /**
   * Do not run directly to not reduce result latency of a new query
   */
  (0, _index.nextTick)() // wait at least one tick
  .then(() => (0, _index.requestIdlePromise)(200)) // and then wait for the CPU to be idle
  .then(() => {
    if (!rxCollection.closed) {
      rxCollection.cacheReplacementPolicy(rxCollection, rxCollection._queryCache);
    }
    COLLECTIONS_WITH_RUNNING_CLEANUP.delete(rxCollection);
  });
}
//# sourceMappingURL=query-cache.js.map