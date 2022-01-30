import { Query as MingoQuery } from 'mingo';
import { binaryMd5 } from 'pouchdb-md5';
import { getDexieSortComparator } from './dexie-helper';
import { firstPropertyNameOfObject, flatClone } from '../../util';
import { createDexieStorageInstance } from './rx-storage-instance-dexie';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { createDexieKeyObjectStorageInstance } from './rx-storage-key-object-instance-dexie';
import { getPouchQueryPlan } from './query/dexie-query';
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
    var primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    /**
     * To ensure a deterministic sorting,
     * we have to ensure the primary key is always part
     * of the sort query.
     * TODO this should be done by RxDB instead so we
     * can ensure it in all storage implementations.
     */

    if (!mutateableQuery.sort) {
      var _ref;

      mutateableQuery.sort = [(_ref = {}, _ref[primaryKey] = 'asc', _ref)];
    } else {
      var isPrimaryInSort = mutateableQuery.sort.find(function (p) {
        return firstPropertyNameOfObject(p) === primaryKey;
      });

      if (!isPrimaryInSort) {
        var _mutateableQuery$sort;

        mutateableQuery.sort.push((_mutateableQuery$sort = {}, _mutateableQuery$sort[primaryKey] = 'asc', _mutateableQuery$sort));
      }
    }
    /**
     * Store the query plan together with the
     * prepared query to save performance.
     */


    mutateableQuery.pouchQueryPlan = getPouchQueryPlan(schema, mutateableQuery);
    return mutateableQuery;
  },
  getSortComparator: function getSortComparator(schema, query) {
    return getDexieSortComparator(schema, query);
  },
  getQueryMatcher: function getQueryMatcher(_schema, query) {
    var mingoQuery = new MingoQuery(query.selector);

    var fun = function fun(doc) {
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

  _proto.createKeyObjectStorageInstance = function createKeyObjectStorageInstance(params) {
    // ensure we never mix up key-object data with normal storage documents.
    var useParams = flatClone(params);
    useParams.collectionName = params.collectionName + '-key-object';
    return createDexieKeyObjectStorageInstance(this, params, this.settings);
  };

  return RxStorageDexie;
}();
export function getRxStorageDexie() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = new RxStorageDexie(settings);
  return storage;
}
//# sourceMappingURL=rx-storage-dexie.js.map