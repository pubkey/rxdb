"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createQueryCache = createQueryCache;
exports.uncacheRxQuery = uncacheRxQuery;
exports.countRxQuerySubscribers = countRxQuerySubscribers;
exports.triggerCacheReplacement = triggerCacheReplacement;
exports.COLLECTIONS_WITH_DESTROY_HOOK = exports.CACHE_REPLACEMENT_STATE_BY_COLLECTION = exports.defaultCacheReplacementPolicy = exports.defaultCacheReplacementPolicyMonad = exports.DEFAULT_CACHE_REPLACEMENT_WAIT_TIME = exports.DEFAULT_UNEXECUTED_LIFETME = exports.DEFAULT_TRY_TO_KEEP_MAX = exports.QueryCache = void 0;

var _util = require("./util");

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } it = o[Symbol.iterator](); return it.next.bind(it); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var QueryCache = /*#__PURE__*/function () {
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

exports.QueryCache = QueryCache;

function createQueryCache() {
  return new QueryCache();
}

function uncacheRxQuery(queryCache, rxQuery) {
  rxQuery.uncached = true;
  var stringRep = rxQuery.toString();

  queryCache._map["delete"](stringRep);
}

function countRxQuerySubscribers(rxQuery) {
  return rxQuery.refCount$.observers.length;
}

var DEFAULT_TRY_TO_KEEP_MAX = 100;
exports.DEFAULT_TRY_TO_KEEP_MAX = DEFAULT_TRY_TO_KEEP_MAX;
var DEFAULT_UNEXECUTED_LIFETME = 30 * 1000;
exports.DEFAULT_UNEXECUTED_LIFETME = DEFAULT_UNEXECUTED_LIFETME;
var DEFAULT_CACHE_REPLACEMENT_WAIT_TIME = 20 * 1000;
/**
 * The default cache replacement policy
 * See docs-src/query-cache.md to learn how it should work.
 * Notice that this runs often and should block the cpu as less as possible
 * This is a monad which makes it easier to unit test
 */

exports.DEFAULT_CACHE_REPLACEMENT_WAIT_TIME = DEFAULT_CACHE_REPLACEMENT_WAIT_TIME;

var defaultCacheReplacementPolicyMonad = function defaultCacheReplacementPolicyMonad(tryToKeepMax, unExecutedLifetime) {
  return function (_collection, queryCache) {
    if (queryCache._map.size < tryToKeepMax) {
      return;
    }

    var minUnExecutedLifetime = (0, _util.now)() - unExecutedLifetime;
    var maybeUncash = [];

    for (var _iterator = _createForOfIteratorHelperLoose(queryCache._map.values()), _step; !(_step = _iterator()).done;) {
      var rxQuery = _step.value;

      // filter out queries with subscribers
      if (countRxQuerySubscribers(rxQuery) > 0) {
        continue;
      } // directly uncache queries that never executed and are older then unExecutedLifetime


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

    var sortedByLastUsage = maybeUncash.sort(function (a, b) {
      return a._lastEnsureEqual - b._lastEnsureEqual;
    });
    var toRemove = sortedByLastUsage.slice(0, mustUncache);
    toRemove.forEach(function (rxQuery) {
      return uncacheRxQuery(queryCache, rxQuery);
    });
  };
};

exports.defaultCacheReplacementPolicyMonad = defaultCacheReplacementPolicyMonad;
var defaultCacheReplacementPolicy = defaultCacheReplacementPolicyMonad(DEFAULT_TRY_TO_KEEP_MAX, DEFAULT_UNEXECUTED_LIFETME); // @link https://stackoverflow.com/a/56239226/3443137

exports.defaultCacheReplacementPolicy = defaultCacheReplacementPolicy;
var CACHE_REPLACEMENT_STATE_BY_COLLECTION = new WeakMap();
exports.CACHE_REPLACEMENT_STATE_BY_COLLECTION = CACHE_REPLACEMENT_STATE_BY_COLLECTION;
var COLLECTIONS_WITH_DESTROY_HOOK = new WeakSet();
/**
 * Triggers the cache replacement policy after waitTime has passed.
 * We do not run this directly because at exactly the time a query is created,
 * we need all CPU to minimize latency.
 * Also this should not be triggered multiple times when waitTime is still waiting.
 */

exports.COLLECTIONS_WITH_DESTROY_HOOK = COLLECTIONS_WITH_DESTROY_HOOK;

function triggerCacheReplacement(rxCollection) {
  var waitTime = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_CACHE_REPLACEMENT_WAIT_TIME;

  if (CACHE_REPLACEMENT_STATE_BY_COLLECTION.has(rxCollection)) {
    // already started
    return;
  } // ensure we clean up the runnung timeouts when the collection is destroyed


  if (!COLLECTIONS_WITH_DESTROY_HOOK.has(rxCollection)) {
    rxCollection.onDestroy.then(function () {
      var timeout = CACHE_REPLACEMENT_STATE_BY_COLLECTION.get(rxCollection);

      if (timeout) {
        clearTimeout(timeout);
      }
    });
    COLLECTIONS_WITH_DESTROY_HOOK.add(rxCollection);
  }

  var val = setTimeout(function () {
    CACHE_REPLACEMENT_STATE_BY_COLLECTION["delete"](rxCollection);
    rxCollection.cacheReplacementPolicy(rxCollection, rxCollection._queryCache);
  }, waitTime);
  CACHE_REPLACEMENT_STATE_BY_COLLECTION.set(rxCollection, val);
}

//# sourceMappingURL=query-cache.js.map