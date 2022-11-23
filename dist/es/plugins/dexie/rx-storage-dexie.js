import { Query as MingoQuery } from 'mingo';
import { ensureNoBooleanIndex, getDexieSortComparator, RX_STORAGE_NAME_DEXIE } from './dexie-helper';
import { createDexieStorageInstance } from './rx-storage-instance-dexie';
import { newRxError } from '../../rx-error';
import { getQueryPlan } from '../../query-planner';
import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
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
export var RxStorageDexie = /*#__PURE__*/function () {
  function RxStorageDexie(settings) {
    this.name = RX_STORAGE_NAME_DEXIE;
    this.statics = RxStorageDexieStatics;
    this.settings = settings;
  }
  var _proto = RxStorageDexie.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
    ensureNoBooleanIndex(params.schema);
    return createDexieStorageInstance(this, params, this.settings);
  };
  return RxStorageDexie;
}();
export function getRxStorageDexie() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = new RxStorageDexie(settings);
  return storage;
}
//# sourceMappingURL=rx-storage-dexie.js.map