"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageDefaultStatics = void 0;
var _rxError = require("./rx-error");
var _queryPlanner = require("./query-planner");
var _rxSchemaHelper = require("./rx-schema-helper");
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
  checkpointSchema: _rxSchemaHelper.DEFAULT_CHECKPOINT_SCHEMA
};
exports.RxStorageDefaultStatics = RxStorageDefaultStatics;
//# sourceMappingURL=rx-storage-statics.js.map