import { Query as MingoQuery } from 'mingo';
import { getDexieSortComparator } from './dexie-helper';
import { newRxError } from '../../rx-error';
import { getQueryPlan } from '../../query-planner';
import { DEFAULT_CHECKPOINT_SCHEMA } from '../../rx-schema-helper';
export var RxStorageDexieStatics = {
  prepareQuery: function prepareQuery(schema, mutateableQuery) {
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
      queryPlan: queryPlan
    };
  },
  getSortComparator: function getSortComparator(schema, preparedQuery) {
    return getDexieSortComparator(schema, preparedQuery.query);
  },
  getQueryMatcher: function getQueryMatcher(_schema, preparedQuery) {
    var query = preparedQuery.query;
    var mingoQuery = new MingoQuery(query.selector);
    var fun = function fun(doc) {
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
//# sourceMappingURL=dexie-statics.js.map