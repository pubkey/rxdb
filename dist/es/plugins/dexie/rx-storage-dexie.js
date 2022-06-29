import { Query as MingoQuery } from 'mingo';
import { binaryMd5 } from 'pouchdb-md5';
import { getDexieSortComparator } from './dexie-helper';
import { createDexieStorageInstance } from './rx-storage-instance-dexie';
import { newRxError } from '../../rx-error';
import { getQueryPlan } from '../../query-planner';
export var RxStorageDexieStatics = {
  hash: function hash(data) {
    return new Promise(function (res) {
      binaryMd5(data, function (digest) {
        res(digest);
      });
    });
  },
  hashKey: 'md5',
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
  }
};
export var RxStorageDexie = /*#__PURE__*/function () {
  function RxStorageDexie(settings) {
    this.name = 'dexie';
    this.statics = RxStorageDexieStatics;
    this.settings = settings;
  }

  var _proto = RxStorageDexie.prototype;

  _proto.createStorageInstance = function createStorageInstance(params) {
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