"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalizeMangoQuery = normalizeMangoQuery;
exports.normalizeQueryRegex = normalizeQueryRegex;
var _queryPlanner = require("./query-planner");
var _rxSchemaHelper = require("./rx-schema-helper");
var _utils = require("./plugins/utils");
/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */
function normalizeMangoQuery(schema, mangoQuery) {
  var primaryKey = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
  mangoQuery = (0, _utils.flatClone)(mangoQuery);

  // regex normalization must run before deep clone because deep clone cannot clone RegExp
  if (mangoQuery.selector) {
    mangoQuery.selector = normalizeQueryRegex(mangoQuery.selector);
  }
  var normalizedMangoQuery = (0, _utils.clone)(mangoQuery);
  if (typeof normalizedMangoQuery.skip !== 'number') {
    normalizedMangoQuery.skip = 0;
  }
  if (!normalizedMangoQuery.selector) {
    normalizedMangoQuery.selector = {};
  } else {
    normalizedMangoQuery.selector = normalizedMangoQuery.selector;
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
     *
     *
     * TODO this must work recursive with nested queries that
     * contain multiple selectors via $and or $or etc.
     */
    Object.entries(normalizedMangoQuery.selector).forEach(([field, matcher]) => {
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
    var indexAr = (0, _utils.toArray)(normalizedMangoQuery.index);
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
      normalizedMangoQuery.sort = normalizedMangoQuery.index.map(field => {
        return {
          [field]: 'asc'
        };
      });
    } else {
      /**
       * Find the index that best matches the fields with the logical operators
       */
      if (schema.indexes) {
        var fieldsWithLogicalOperator = new Set();
        Object.entries(normalizedMangoQuery.selector).forEach(([field, matcher]) => {
          var hasLogical = false;
          if (typeof matcher === 'object' && matcher !== null) {
            hasLogical = !!Object.keys(matcher).find(operator => _queryPlanner.LOGICAL_OPERATORS.has(operator));
          } else {
            hasLogical = true;
          }
          if (hasLogical) {
            fieldsWithLogicalOperator.add(field);
          }
        });
        var currentFieldsAmount = -1;
        var currentBestIndexForSort;
        schema.indexes.forEach(index => {
          var useIndex = (0, _utils.isMaybeReadonlyArray)(index) ? index : [index];
          var firstWrongIndex = useIndex.findIndex(indexField => !fieldsWithLogicalOperator.has(indexField));
          if (firstWrongIndex > 0 && firstWrongIndex > currentFieldsAmount) {
            currentFieldsAmount = firstWrongIndex;
            currentBestIndexForSort = useIndex;
          }
        });
        if (currentBestIndexForSort) {
          normalizedMangoQuery.sort = currentBestIndexForSort.map(field => {
            return {
              [field]: 'asc'
            };
          });
        }
      }

      /**
       * Fall back to the primary key as sort order
       * if no better one has been found
       */
      if (!normalizedMangoQuery.sort) {
        normalizedMangoQuery.sort = [{
          [primaryKey]: 'asc'
        }];
      }
    }
  } else {
    var isPrimaryInSort = normalizedMangoQuery.sort.find(p => (0, _utils.firstPropertyNameOfObject)(p) === primaryKey);
    if (!isPrimaryInSort) {
      normalizedMangoQuery.sort = normalizedMangoQuery.sort.slice(0);
      normalizedMangoQuery.sort.push({
        [primaryKey]: 'asc'
      });
    }
  }
  return normalizedMangoQuery;
}

/**
 * @recursive
 * @mutates the input so that we do not have to deep clone
 */
function normalizeQueryRegex(selector) {
  if (typeof selector !== 'object' || selector === null) {
    return selector;
  }
  var keys = Object.keys(selector);
  var ret = {};
  keys.forEach(key => {
    var value = selector[key];
    if (key === '$regex' && value instanceof RegExp) {
      var parsed = (0, _utils.parseRegex)(value);
      ret.$regex = parsed.pattern;
      ret.$options = parsed.flags;
    } else if (Array.isArray(value)) {
      ret[key] = value.map(item => normalizeQueryRegex(item));
    } else {
      ret[key] = normalizeQueryRegex(value);
    }
  });
  return ret;
}
//# sourceMappingURL=rx-query-helper.js.map