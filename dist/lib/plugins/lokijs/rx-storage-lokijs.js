"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageLokiStatics = exports.RxStorageLoki = void 0;
exports.getRxStorageLoki = getRxStorageLoki;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _rxSchema = require("../../rx-schema");

var _lokijs = _interopRequireDefault(require("lokijs"));

var _util = require("../../util");

var _rxStorageInstanceLoki = require("./rx-storage-instance-loki");

var _rxStorageKeyObjectInstanceLoki = require("./rx-storage-key-object-instance-loki");

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
  prepareQuery: function prepareQuery(schema, mutateableQuery) {
    var primaryKey = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);

    if (Object.keys(mutateableQuery.selector).length > 0) {
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
    /**
     * To ensure a deterministic sorting,
     * we have to ensure the primary key is always part
     * of the sort query.
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

  _proto.createStorageInstance = /*#__PURE__*/function () {
    var _createStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(params) {
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", (0, _rxStorageInstanceLoki.createLokiStorageInstance)(this, params, this.databaseSettings));

            case 1:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function createStorageInstance(_x) {
      return _createStorageInstance.apply(this, arguments);
    }

    return createStorageInstance;
  }();

  _proto.createKeyObjectStorageInstance = /*#__PURE__*/function () {
    var _createKeyObjectStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(params) {
      var useParams;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              // ensure we never mix up key-object data with normal storage documents.
              useParams = (0, _util.flatClone)(params);
              useParams.collectionName = params.collectionName + '-key-object';
              return _context2.abrupt("return", (0, _rxStorageKeyObjectInstanceLoki.createLokiKeyObjectStorageInstance)(this, params, this.databaseSettings));

            case 3:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function createKeyObjectStorageInstance(_x2) {
      return _createKeyObjectStorageInstance.apply(this, arguments);
    }

    return createKeyObjectStorageInstance;
  }();

  return RxStorageLoki;
}();

exports.RxStorageLoki = RxStorageLoki;

function getRxStorageLoki() {
  var databaseSettings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = new RxStorageLoki(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-lokijs.js.map