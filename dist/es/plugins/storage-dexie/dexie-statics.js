import { getDexieSortComparator } from './dexie-helper';
import { newRxError } from '../../rx-error';
import { getQueryPlan } from '../../query-planner';
import { DEFAULT_CHECKPOINT_SCHEMA } from '../../rx-schema-helper';
import { getMingoQuery } from '../../rx-query-mingo';
export var RxStorageDexieStatics = {
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
    return getDexieSortComparator(schema, preparedQuery.query);
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
//# sourceMappingURL=dexie-statics.js.map