"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageDefaultStatics = void 0;
exports.getDefaultSortComparator = getDefaultSortComparator;
var _rxError = require("./rx-error");
var _queryPlanner = require("./query-planner");
var _rxSchemaHelper = require("./rx-schema-helper");
var _rxQueryMingo = require("./rx-query-mingo");
var _util = require("mingo/util");
var _utils = require("./plugins/utils");
/**
 * Most RxStorage implementations use these static functions.
 * But you can use anything that implements the interface,
 * for example if your underlying database already has a query engine.
 */
var RxStorageDefaultStatics = {
  prepareQuery(schema, mutateableQuery) {
    if (!mutateableQuery.sort) {
      throw (0, _rxError.newRxError)('SNH', {
        query: mutateableQuery
      });
    }

    /**
     * Store the query plan together with the
     * prepared query to save performance.
     */
    var queryPlan = (0, _queryPlanner.getQueryPlan)(schema, mutateableQuery);
    return {
      query: mutateableQuery,
      queryPlan
    };
  },
  getSortComparator(schema, preparedQuery) {
    return getDefaultSortComparator(schema, preparedQuery.query);
  },
  getQueryMatcher(_schema, preparedQuery) {
    var query = preparedQuery.query;
    var mingoQuery = (0, _rxQueryMingo.getMingoQuery)(query.selector);
    var fun = doc => {
      if (doc._deleted) {
        return false;
      }
      var cursor = mingoQuery.find([doc]);
      var next = cursor.next();
      if (next) {
        return true;
      } else {
        return false;
      }
    };
    return fun;
  },
  checkpointSchema: _rxSchemaHelper.DEFAULT_CHECKPOINT_SCHEMA
};

/**
 * Default mango query sort comparator.
 * @hotPath
 */
exports.RxStorageDefaultStatics = RxStorageDefaultStatics;
function getDefaultSortComparator(_schema, query) {
  if (!query.sort) {
    throw (0, _rxError.newRxError)('SNH', {
      query
    });
  }
  var sortParts = [];
  query.sort.forEach(sortBlock => {
    var key = Object.keys(sortBlock)[0];
    var direction = Object.values(sortBlock)[0];
    sortParts.push({
      key,
      direction,
      getValueFn: (0, _utils.objectPathMonad)(key)
    });
  });
  var fun = (a, b) => {
    for (var i = 0; i < sortParts.length; ++i) {
      var sortPart = sortParts[i];
      var valueA = sortPart.getValueFn(a);
      var valueB = sortPart.getValueFn(b);
      if (valueA !== valueB) {
        var ret = sortPart.direction === 'asc' ? (0, _util.DEFAULT_COMPARATOR)(valueA, valueB) : (0, _util.DEFAULT_COMPARATOR)(valueB, valueA);
        return ret;
      }
    }
  };
  return fun;
}
//# sourceMappingURL=rx-storage-statics.js.map