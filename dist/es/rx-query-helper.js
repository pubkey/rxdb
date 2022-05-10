import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import { firstPropertyNameOfObject, flatClone } from './util';
/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */

export function normalizeMangoQuery(schema, mangoQuery) {
  var primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  mangoQuery = flatClone(mangoQuery);

  if (typeof mangoQuery.skip !== 'number') {
    mangoQuery.skip = 0;
  }

  if (!mangoQuery.selector) {
    mangoQuery.selector = {};
  }
  /**
   * To ensure a deterministic sorting,
   * we have to ensure the primary key is always part
   * of the sort query.
   * Primary sorting is added as last sort parameter,
   * similiar to how we add the primary key to indexes that do not have it.
   */


  if (!mangoQuery.sort) {
    var _ref;

    mangoQuery.sort = [(_ref = {}, _ref[primaryKey] = 'asc', _ref)];
  } else {
    var isPrimaryInSort = mangoQuery.sort.find(function (p) {
      return firstPropertyNameOfObject(p) === primaryKey;
    });

    if (!isPrimaryInSort) {
      var _mangoQuery$sort$push;

      mangoQuery.sort = mangoQuery.sort.slice(0);
      mangoQuery.sort.push((_mangoQuery$sort$push = {}, _mangoQuery$sort$push[primaryKey] = 'asc', _mangoQuery$sort$push));
    }
  }
  /**
   * Ensure that if an index is specified,
   * the primaryKey is inside of it.
   */


  if (mangoQuery.index) {
    var indexAr = Array.isArray(mangoQuery.index) ? mangoQuery.index.slice(0) : [mangoQuery.index];

    if (!indexAr.includes(primaryKey)) {
      indexAr.push(primaryKey);
    }

    mangoQuery.index = indexAr;
  }

  return mangoQuery;
}
//# sourceMappingURL=rx-query-helper.js.map