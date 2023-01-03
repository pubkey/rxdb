"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageLokiStatics = exports.RxStorageLoki = void 0;
exports.getRxStorageLoki = getRxStorageLoki;
var _lokijs = _interopRequireDefault(require("lokijs"));
var _utils = require("../utils");
var _rxStorageInstanceLoki = require("./rx-storage-instance-loki");
var _lokijsHelper = require("./lokijs-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _rxSchemaHelper = require("../../rx-schema-helper");
var RxStorageLokiStatics = {
  prepareQuery(_schema, mutateableQuery) {
    mutateableQuery = (0, _utils.flatClone)(mutateableQuery);
    if (Object.keys((0, _utils.ensureNotFalsy)(mutateableQuery.selector)).length > 0) {
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
    return (0, _lokijsHelper.getLokiSortComparator)(schema, query);
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
      var docWithResetDeleted = (0, _utils.flatClone)(doc);
      docWithResetDeleted._deleted = !!docWithResetDeleted._deleted;
      var fakeCollection = {
        data: [docWithResetDeleted],
        binaryIndices: {}
      };
      Object.setPrototypeOf(fakeCollection, _lokijs.default.Collection.prototype);
      var fakeResultSet = {
        collection: fakeCollection
      };
      Object.setPrototypeOf(fakeResultSet, _lokijs.default.Resultset.prototype);
      fakeResultSet.find(query.selector, true);
      var ret = fakeResultSet.filteredrows.length > 0;
      return ret;
    };
    return fun;
  },
  checkpointSchema: _rxSchemaHelper.DEFAULT_CHECKPOINT_SCHEMA
};
exports.RxStorageLokiStatics = RxStorageLokiStatics;
var RxStorageLoki = /*#__PURE__*/function () {
  /**
   * Create one leader elector by db name.
   * This is done inside of the storage, not globally
   * to make it easier to test multi-tab behavior.
   */

  function RxStorageLoki(databaseSettings) {
    this.name = _lokijsHelper.RX_STORAGE_NAME_LOKIJS;
    this.statics = RxStorageLokiStatics;
    this.leaderElectorByLokiDbName = new Map();
    this.databaseSettings = databaseSettings;
  }
  var _proto = RxStorageLoki.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    (0, _rxStorageHelper.ensureRxStorageInstanceParamsAreCorrect)(params);
    return (0, _rxStorageInstanceLoki.createLokiStorageInstance)(this, params, this.databaseSettings);
  };
  return RxStorageLoki;
}();
exports.RxStorageLoki = RxStorageLoki;
function getRxStorageLoki(databaseSettings = {}) {
  var storage = new RxStorageLoki(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-lokijs.js.map