"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageDexieStatics = exports.RxStorageDexie = void 0;
exports.getRxStorageDexie = getRxStorageDexie;

var _mingo = require("mingo");

var _pouchdbMd = require("pouchdb-md5");

var _dexieHelper = require("./dexie-helper");

var _util = require("../../util");

var _rxStorageInstanceDexie = require("./rx-storage-instance-dexie");

var _rxSchema = require("../../rx-schema");

var _rxStorageKeyObjectInstanceDexie = require("./rx-storage-key-object-instance-dexie");

var _dexieQuery = require("./query/dexie-query");

var RxStorageDexieStatics = {
  hash: function hash(data) {
    return new Promise(function (res) {
      (0, _pouchdbMd.binaryMd5)(data, function (digest) {
        res(digest);
      });
    });
  },
  hashKey: 'md5',
  prepareQuery: function prepareQuery(schema, mutateableQuery) {
    var primaryKey = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
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
        return (0, _util.firstPropertyNameOfObject)(p) === primaryKey;
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


    mutateableQuery.pouchQueryPlan = (0, _dexieQuery.getPouchQueryPlan)(schema, mutateableQuery);
    return mutateableQuery;
  },
  getSortComparator: function getSortComparator(schema, query) {
    return (0, _dexieHelper.getDexieSortComparator)(schema, query);
  },
  getQueryMatcher: function getQueryMatcher(_schema, query) {
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

  _proto.createKeyObjectStorageInstance = function createKeyObjectStorageInstance(params) {
    // ensure we never mix up key-object data with normal storage documents.
    var useParams = (0, _util.flatClone)(params);
    useParams.collectionName = params.collectionName + '-key-object';
    return (0, _rxStorageKeyObjectInstanceDexie.createDexieKeyObjectStorageInstance)(this, params, this.settings);
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