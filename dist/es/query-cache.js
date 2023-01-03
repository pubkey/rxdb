/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will reuse the first RxQuery
 */

import { nextTick, now, requestIdlePromise } from './plugins/utils';
export var QueryCache = /*#__PURE__*/function () {
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
    if (!this._map.has(stringRep)) {
      this._map.set(stringRep, rxQuery);
    }
    return this._map.get(stringRep);
  };
  return QueryCache;
}();
export function createQueryCache() {
  return new QueryCache();
}
export function uncacheRxQuery(queryCache, rxQuery) {
  rxQuery.uncached = true;
  var stringRep = rxQuery.toString();
  queryCache._map.delete(stringRep);
}
export function countRxQuerySubscribers(rxQuery) {
  return rxQuery.refCount$.observers.length;
}
export var DEFAULT_TRY_TO_KEEP_MAX = 100;
export var DEFAULT_UNEXECUTED_LIFETME = 30 * 1000;

/**
 * The default cache replacement policy
 * See docs-src/query-cache.md to learn how it should work.
 * Notice that this runs often and should block the cpu as less as possible
 * This is a monad which makes it easier to unit test
 */
export var defaultCacheReplacementPolicyMonad = (tryToKeepMax, unExecutedLifetime) => (_collection, queryCache) => {
  if (queryCache._map.size < tryToKeepMax) {
    return;
  }
  var minUnExecutedLifetime = now() - unExecutedLifetime;
  var maybeUncash = [];
  var queriesInCache = Array.from(queryCache._map.values());
  for (var rxQuery of queriesInCache) {
    // filter out queries with subscribers
    if (countRxQuerySubscribers(rxQuery) > 0) {
      continue;
    }
    // directly uncache queries that never executed and are older then unExecutedLifetime
    if (rxQuery._lastEnsureEqual === 0 && rxQuery._creationTime < minUnExecutedLifetime) {
      uncacheRxQuery(queryCache, rxQuery);
      continue;
    }
    maybeUncash.push(rxQuery);
  }
  var mustUncache = maybeUncash.length - tryToKeepMax;
  if (mustUncache <= 0) {
    return;
  }
  var sortedByLastUsage = maybeUncash.sort((a, b) => a._lastEnsureEqual - b._lastEnsureEqual);
  var toRemove = sortedByLastUsage.slice(0, mustUncache);
  toRemove.forEach(rxQuery => uncacheRxQuery(queryCache, rxQuery));
};
export var defaultCacheReplacementPolicy = defaultCacheReplacementPolicyMonad(DEFAULT_TRY_TO_KEEP_MAX, DEFAULT_UNEXECUTED_LIFETME);
export var COLLECTIONS_WITH_RUNNING_CLEANUP = new WeakSet();

/**
 * Triggers the cache replacement policy after waitTime has passed.
 * We do not run this directly because at exactly the time a query is created,
 * we need all CPU to minimize latency.
 * Also this should not be triggered multiple times when waitTime is still waiting.
 */
export function triggerCacheReplacement(rxCollection) {
  if (COLLECTIONS_WITH_RUNNING_CLEANUP.has(rxCollection)) {
    // already started
    return;
  }
  COLLECTIONS_WITH_RUNNING_CLEANUP.add(rxCollection);

  /**
   * Do not run directly to not reduce result latency of a new query
   */
  nextTick() // wait at least one tick
  .then(() => requestIdlePromise(200)) // and then wait for the CPU to be idle
  .then(() => {
    if (!rxCollection.destroyed) {
      rxCollection.cacheReplacementPolicy(rxCollection, rxCollection._queryCache);
    }
    COLLECTIONS_WITH_RUNNING_CLEANUP.delete(rxCollection);
  });
}
//# sourceMappingURL=query-cache.js.map