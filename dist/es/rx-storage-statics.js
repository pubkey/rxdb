import { newRxError } from './rx-error';
import { getQueryPlan } from './query-planner';
import { DEFAULT_CHECKPOINT_SCHEMA } from './rx-schema-helper';
import { getMingoQuery } from './rx-query-mingo';

/**
 * Most RxStorage implementations use these static functions.
 * But you can use anything that implements the interface,
 * for example if your underlying database already has a query engine.
 */
export var RxStorageDefaultStatics = {
  prepareQuery(schema, mutateableQuery) {
    if (!mutateableQuery.sort) {
      throw newRxError('SNH', {
        query: mutateableQuery
      });
    }

    /**
     * Store the query plan together with the
     * prepared query to save performance.
     */
    var queryPlan = getQueryPlan(schema, mutateableQuery);
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
    var mingoQuery = getMingoQuery(query.selector);
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
  checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};
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
export function getDefaultSortComparator(_schema, query) {
  var mingoSortObject = {};
  if (!query.sort) {
    throw newRxError('SNH', {
      query
    });
  }
  query.sort.forEach(sortBlock => {
    var key = Object.keys(sortBlock)[0];
    var direction = Object.values(sortBlock)[0];
    mingoSortObject[key] = sortDirectionToMingo(direction);
  });
  var fun = (a, b) => {
    var sorted = getMingoQuery({}).find([a, b], {}).sort(mingoSortObject);
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