"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageDexieStatics = void 0;
var _dexieHelper = require("./dexie-helper");
var _rxError = require("../../rx-error");
var _queryPlanner = require("../../query-planner");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxQueryMingo = require("../../rx-query-mingo");
var RxStorageDexieStatics = {
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
    return (0, _dexieHelper.getDexieSortComparator)(schema, preparedQuery.query);
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
exports.RxStorageDexieStatics = RxStorageDexieStatics;
//# sourceMappingURL=dexie-statics.js.map