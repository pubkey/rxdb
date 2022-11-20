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
  } else {
    normalizedMangoQuery.selector = (0, _util.flatClone)(normalizedMangoQuery.selector);
    /**
     * In mango query, it is possible to have an
     * equals comparison by directly assigning a value
     * to a property, without the '$eq' operator.
     * Like:
     * selector: {
     *   foo: 'bar'
     * }
     * For normalization, we have to normalize this
     * so our checks can perform properly.
     */
    Object.entries(normalizedMangoQuery.selector).forEach(function (_ref) {
      var field = _ref[0],
        matcher = _ref[1];
      if (typeof matcher !== 'object' || matcher === null) {
        normalizedMangoQuery.selector[field] = {
          $eq: matcher
        };
      }
    });
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
   * similar to how we add the primary key to indexes that do not have it.
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
        var _ref2;
        return _ref2 = {}, _ref2[field] = 'asc', _ref2;
      });
    } else {
      /**
       * Find the index that best matches the fields with the logical operators
       */
      if (schema.indexes) {
        var fieldsWithLogicalOperator = new Set();
        Object.entries(normalizedMangoQuery.selector).forEach(function (_ref3) {
          var field = _ref3[0],
            matcher = _ref3[1];
          var hasLogical = false;
          if (typeof matcher === 'object' && matcher !== null) {
            hasLogical = !!Object.keys(matcher).find(function (operator) {
              return _queryPlanner.LOGICAL_OPERATORS.has(operator);
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
            var _ref4;
            return _ref4 = {}, _ref4[field] = 'asc', _ref4;
          });
        }
      }

      /**
       * Fall back to the primary key as sort order
       * if no better one has been found
       */
      if (!normalizedMangoQuery.sort) {
        var _ref5;
        normalizedMangoQuery.sort = [(_ref5 = {}, _ref5[primaryKey] = 'asc', _ref5)];
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