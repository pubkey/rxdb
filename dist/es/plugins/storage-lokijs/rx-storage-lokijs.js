import lokijs from 'lokijs';
import { ensureNotFalsy, flatClone } from '../utils';
import { createLokiStorageInstance } from './rx-storage-instance-loki';
import { getLokiSortComparator, RX_STORAGE_NAME_LOKIJS } from './lokijs-helper';
import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import { DEFAULT_CHECKPOINT_SCHEMA } from '../../rx-schema-helper';
export var RxStorageLokiStatics = {
  prepareQuery(_schema, mutateableQuery) {
    mutateableQuery = flatClone(mutateableQuery);
    if (Object.keys(ensureNotFalsy(mutateableQuery.selector)).length > 0) {
      mutateableQuery.selector = {
        $and: [{
          _deleted: false
        }, mutateableQuery.selector]
      };
    } else {
      mutateableQuery.selector = {
        _deleted: false
      };
    }
    return mutateableQuery;
  },
  getSortComparator(schema, query) {
    return getLokiSortComparator(schema, query);
  },
  /**
   * Returns a function that determines if a document matches a query selector.
   * It is important to have the exact same logix as lokijs uses, to be sure
   * that the event-reduce algorithm works correct.
   * But LokisJS does not export such a function, the query logic is deep inside of
   * the Resultset prototype.
   * Because I am lazy, I do not copy paste and maintain that code.
   * Instead we create a fake Resultset and apply the prototype method Resultset.prototype.find(),
   * same with Collection.
   */
  getQueryMatcher(_schema, query) {
    var fun = doc => {
      if (doc._deleted) {
        return false;
      }
      var docWithResetDeleted = flatClone(doc);
      docWithResetDeleted._deleted = !!docWithResetDeleted._deleted;
      var fakeCollection = {
        data: [docWithResetDeleted],
        binaryIndices: {}
      };
      Object.setPrototypeOf(fakeCollection, lokijs.Collection.prototype);
      var fakeResultSet = {
        collection: fakeCollection
      };
      Object.setPrototypeOf(fakeResultSet, lokijs.Resultset.prototype);
      fakeResultSet.find(query.selector, true);
      var ret = fakeResultSet.filteredrows.length > 0;
      return ret;
    };
    return fun;
  },
  checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};
export var RxStorageLoki = /*#__PURE__*/function () {
  /**
   * Create one leader elector by db name.
   * This is done inside of the storage, not globally
   * to make it easier to test multi-tab behavior.
   */

  function RxStorageLoki(databaseSettings) {
    this.name = RX_STORAGE_NAME_LOKIJS;
    this.statics = RxStorageLokiStatics;
    this.leaderElectorByLokiDbName = new Map();
    this.databaseSettings = databaseSettings;
  }
  var _proto = RxStorageLoki.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
    return createLokiStorageInstance(this, params, this.databaseSettings);
  };
  return RxStorageLoki;
}();
export function getRxStorageLoki(databaseSettings = {}) {
  var storage = new RxStorageLoki(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-lokijs.js.map