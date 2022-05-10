"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageDexieStatics = exports.RxStorageDexie = void 0;
exports.getRxStorageDexie = getRxStorageDexie;

var _mingo = require("mingo");

var _pouchdbMd = require("pouchdb-md5");

var _dexieHelper = require("./dexie-helper");

var _rxStorageInstanceDexie = require("./rx-storage-instance-dexie");

var _rxError = require("../../rx-error");

var _queryPlanner = require("../../query-planner");

var RxStorageDexieStatics = {
  hash: function hash(data) {
    return new Promise(function (res) {
      (0, _pouchdbMd.binaryMd5)(data, function (digest) {
        res(digest);
      });
    });
  },
  hashKey: 'md5',
  doesBroadcastChangestream: function doesBroadcastChangestream() {
    return false;
  },
  prepareQuery: function prepareQuery(schema, mutateableQuery) {
    if (!mutateableQuery.sort) {
      throw (0, _rxError.newRxError)('SNH', {
        query: mutateableQuery
      });
    }
    /**
     * Store the query plan together with the
     * prepared query to save performance.
     */


    var queryPlan = (0, _queryPlanner.getQueryPlan)(schema, mutateableQuery);
    return {
      query: mutateableQuery,
      queryPlan: queryPlan
    };
  },
  getSortComparator: function getSortComparator(schema, preparedQuery) {
    return (0, _dexieHelper.getDexieSortComparator)(schema, preparedQuery.query);
  },
  getQueryMatcher: function getQueryMatcher(_schema, preparedQuery) {
    var query = preparedQuery.query;
    var mingoQuery = new _mingo.Query(query.selector);

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
exports.RxStorageDexieStatics = RxStorageDexieStatics;

var RxStorageDexie = /*#__PURE__*/function () {
  function RxStorageDexie(settings) {
    this.name = 'dexie';
    this.statics = RxStorageDexieStatics;
    this.settings = settings;
  }

  var _proto = RxStorageDexie.prototype;

  _proto.createStorageInstance = function createStorageInstance(params) {
    return (0, _rxStorageInstanceDexie.createDexieStorageInstance)(this, params, this.settings);
  };

  return RxStorageDexie;
}();

exports.RxStorageDexie = RxStorageDexie;

function getRxStorageDexie() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = new RxStorageDexie(settings);
  return storage;
}
//# sourceMappingURL=rx-storage-dexie.js.map