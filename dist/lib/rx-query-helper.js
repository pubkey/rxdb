"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalizeMangoQuery = normalizeMangoQuery;

var _queryPlanner = require("./query-planner");

var _rxSchemaHelper = require("./rx-schema-helper");

var _util = require("./util");

/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */
function normalizeMangoQuery(schema, mangoQuery) {
  var primaryKey = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
  var normalizedMangoQuery = (0, _util.flatClone)(mangoQuery);

  if (typeof normalizedMangoQuery.skip !== 'number') {
    normalizedMangoQuery.skip = 0;
  }

  if (!normalizedMangoQuery.selector) {
    normalizedMangoQuery.selector = {};
  }
  /**
   * Ensure that if an index is specified,
   * the primaryKey is inside of it.
   */


  if (normalizedMangoQuery.index) {
    var indexAr = Array.isArray(normalizedMangoQuery.index) ? normalizedMangoQuery.index.slice(0) : [normalizedMangoQuery.index];

    if (!indexAr.includes(primaryKey)) {
      indexAr.push(primaryKey);
    }

    normalizedMangoQuery.index = indexAr;
  }
  /**
   * To ensure a deterministic sorting,
   * we have to ensure the primary key is always part
   * of the sort query.
   * Primary sorting is added as last sort parameter,
   * similiar to how we add the primary key to indexes that do not have it.
   * 
   */


  if (!normalizedMangoQuery.sort) {
    /**
     * If no sort is given at all,
     * we can assume that the user does not care about sort order at al.
     * 
     * we cannot just use the primary key as sort parameter
     * because it would likely cause the query to run over the primary key index
     * which has a bad performance in most cases.
     */
    if (normalizedMangoQuery.index) {
      normalizedMangoQuery.sort = normalizedMangoQuery.index.map(function (field) {
        var _ref;

        return _ref = {}, _ref[field] = 'asc', _ref;
      });
    } else {
      /**
       * Find the index that best matches the fields with the logical operators
       */
      if (schema.indexes) {
        var fieldsWithLogicalOperator = new Set();
        Object.entries(normalizedMangoQuery.selector).forEach(function (_ref2) {
          var field = _ref2[0],
              matcher = _ref2[1];
          var hasLogical = false;

          if (typeof matcher === 'object' && matcher !== null) {
            hasLogical = !!Object.keys(matcher).find(function (operator) {
              return (0, _queryPlanner.isLogicalOperator)(operator);
            });
          } else {
            hasLogical = true;
          }

          if (hasLogical) {
            fieldsWithLogicalOperator.add(field);
          }
        });
        var currentFieldsAmount = -1;
        var currentBestIndexForSort;
        schema.indexes.forEach(function (index) {
          var useIndex = (0, _util.isMaybeReadonlyArray)(index) ? index : [index];
          var firstWrongIndex = useIndex.findIndex(function (indexField) {
            return !fieldsWithLogicalOperator.has(indexField);
          });

          if (firstWrongIndex > 0 && firstWrongIndex > currentFieldsAmount) {
            currentFieldsAmount = firstWrongIndex;
            currentBestIndexForSort = useIndex;
          }
        });

        if (currentBestIndexForSort) {
          normalizedMangoQuery.sort = currentBestIndexForSort.map(function (field) {
            var _ref3;

            return _ref3 = {}, _ref3[field] = 'asc', _ref3;
          });
        }
      }
      /**
       * Fall back to the primary key as sort order
       * if no better one has been found
       */


      if (!normalizedMangoQuery.sort) {
        var _ref4;

        normalizedMangoQuery.sort = [(_ref4 = {}, _ref4[primaryKey] = 'asc', _ref4)];
      }
    }
  } else {
    var isPrimaryInSort = normalizedMangoQuery.sort.find(function (p) {
      return (0, _util.firstPropertyNameOfObject)(p) === primaryKey;
    });

    if (!isPrimaryInSort) {
      var _normalizedMangoQuery;

      normalizedMangoQuery.sort = normalizedMangoQuery.sort.slice(0);
      normalizedMangoQuery.sort.push((_normalizedMangoQuery = {}, _normalizedMangoQuery[primaryKey] = 'asc', _normalizedMangoQuery));
    }
  }

  return normalizedMangoQuery;
}
//# sourceMappingURL=rx-query-helper.js.map