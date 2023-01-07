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
exports.RxStorageDefaultStatics = RxStorageDefaultStatics;
function sortDirectionToMingo(direction) {
  if (direction === 'asc') {
    return 1;
  } else {
    return -1;
  }
}

/**
 * This function is at dexie-helper
 * because we need it in multiple places.
 */
function getDefaultSortComparator(_schema, query) {
  var mingoSortObject = {};
  if (!query.sort) {
    throw (0, _rxError.newRxError)('SNH', {
      query
    });
  }
  query.sort.forEach(sortBlock => {
    var key = Object.keys(sortBlock)[0];
    var direction = Object.values(sortBlock)[0];
    mingoSortObject[key] = sortDirectionToMingo(direction);
  });
  var fun = (a, b) => {
    var sorted = (0, _rxQueryMingo.getMingoQuery)({}).find([a, b], {}).sort(mingoSortObject);
    var first = sorted.next();
    if (first === a) {
      return -1;
    } else {
      return 1;
    }
  };
  return fun;
}
//# sourceMappingURL=rx-storage-statics.js.map