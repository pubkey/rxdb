"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageLokiStatics = exports.RxStorageLoki = void 0;
exports.getRxStorageLoki = getRxStorageLoki;

var _lokijs = _interopRequireDefault(require("lokijs"));

var _util = require("../../util");

var _rxStorageInstanceLoki = require("./rx-storage-instance-loki");

var _lokijsHelper = require("./lokijs-helper");

var _pouchdbMd = require("pouchdb-md5");

var RxStorageLokiStatics = {
  hash: function hash(data) {
    return new Promise(function (res) {
      (0, _pouchdbMd.binaryMd5)(data, function (digest) {
        res(digest);
      });
    });
  },
  hashKey: 'md5',
  prepareQuery: function prepareQuery(_schema, mutateableQuery) {
    if (Object.keys((0, _util.ensureNotFalsy)(mutateableQuery.selector)).length > 0) {
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
  getSortComparator: function getSortComparator(schema, query) {
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
  getQueryMatcher: function getQueryMatcher(_schema, query) {
    var fun = function fun(doc) {
      if (doc._deleted) {
        return false;
      }

      var docWithResetDeleted = (0, _util.flatClone)(doc);
      docWithResetDeleted._deleted = !!docWithResetDeleted._deleted;
      var fakeCollection = {
        data: [docWithResetDeleted],
        binaryIndices: {}
      };
      Object.setPrototypeOf(fakeCollection, _lokijs["default"].Collection.prototype);
      var fakeResultSet = {
        collection: fakeCollection
      };
      Object.setPrototypeOf(fakeResultSet, _lokijs["default"].Resultset.prototype);
      fakeResultSet.find(query.selector, true);
      var ret = fakeResultSet.filteredrows.length > 0;
      return ret;
    };

    return fun;
  }
};
exports.RxStorageLokiStatics = RxStorageLokiStatics;

var RxStorageLoki = /*#__PURE__*/function () {
  /**
   * Create one leader elector by db name.
   * This is done inside of the storage, not globally
   * to make it easier to test multi-tab behavior.
   */
  function RxStorageLoki(databaseSettings) {
    this.name = 'lokijs';
    this.statics = RxStorageLokiStatics;
    this.leaderElectorByLokiDbName = new Map();
    this.databaseSettings = databaseSettings;
  }

  var _proto = RxStorageLoki.prototype;

  _proto.createStorageInstance = function createStorageInstance(params) {
    return (0, _rxStorageInstanceLoki.createLokiStorageInstance)(this, params, this.databaseSettings);
  };

  return RxStorageLoki;
}();

exports.RxStorageLoki = RxStorageLoki;

function getRxStorageLoki() {
  var databaseSettings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = new RxStorageLoki(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-lokijs.js.map