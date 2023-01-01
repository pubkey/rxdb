"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.queryFoundationDB = queryFoundationDB;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _customIndex = require("../../custom-index");
var _utils = require("../../plugins/utils");
var _storageDexie = require("../storage-dexie");
var _foundationdbHelpers = require("./foundationdb-helpers");
function queryFoundationDB(_x, _x2) {
  return _queryFoundationDB.apply(this, arguments);
}
function _queryFoundationDB() {
  _queryFoundationDB = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(instance, preparedQuery) {
    var queryPlan, query, skip, limit, skipPlusLimit, queryPlanFields, mustManuallyResort, queryMatcher, dbs, indexForName, indexName, indexDB, lowerBound, lowerBoundString, upperBound, upperBoundString, result, sortComparator;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          queryPlan = preparedQuery.queryPlan;
          query = preparedQuery.query;
          skip = query.skip ? query.skip : 0;
          limit = query.limit ? query.limit : Infinity;
          skipPlusLimit = skip + limit;
          queryPlanFields = queryPlan.index;
          mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;
          queryMatcher = false;
          if (!queryPlan.selectorSatisfiedByIndex) {
            queryMatcher = _storageDexie.RxStorageDexieStatics.getQueryMatcher(instance.schema, preparedQuery);
          }
          _context2.next = 11;
          return instance.internals.dbsPromise;
        case 11:
          dbs = _context2.sent;
          indexForName = queryPlanFields.slice(0);
          indexForName.unshift('_deleted');
          indexName = (0, _foundationdbHelpers.getFoundationDBIndexName)(indexForName);
          indexDB = (0, _utils.ensureNotFalsy)(dbs.indexes[indexName]).db;
          lowerBound = queryPlan.startKeys;
          lowerBound = [false].concat(lowerBound);
          lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(instance.schema, indexForName, lowerBound, queryPlan.inclusiveStart);
          upperBound = queryPlan.endKeys;
          upperBound = [false].concat(upperBound);
          upperBoundString = (0, _customIndex.getStartIndexStringFromUpperBound)(instance.schema, indexForName, upperBound, queryPlan.inclusiveEnd);
          _context2.next = 24;
          return dbs.root.doTransaction( /*#__PURE__*/function () {
            var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(tx) {
              var innerResult, indexTx, mainTx, range, done, next, docIds, docsData;
              return _regenerator["default"].wrap(function _callee$(_context) {
                while (1) switch (_context.prev = _context.next) {
                  case 0:
                    innerResult = [];
                    indexTx = tx.at(indexDB.subspace);
                    mainTx = tx.at(dbs.main.subspace);
                    range = indexTx.getRangeBatch(lowerBoundString, upperBoundString, {
                      // TODO these options seem to be broken in the foundationdb node bindings
                      // limit: instance.settings.batchSize,
                      // streamingMode: StreamingMode.Exact
                    });
                    done = false;
                  case 5:
                    if (done) {
                      _context.next = 19;
                      break;
                    }
                    _context.next = 8;
                    return range.next();
                  case 8:
                    next = _context.sent;
                    if (!next.done) {
                      _context.next = 12;
                      break;
                    }
                    done = true;
                    return _context.abrupt("break", 19);
                  case 12:
                    docIds = next.value.map(function (row) {
                      return row[1];
                    });
                    _context.next = 15;
                    return Promise.all(docIds.map(function (docId) {
                      return mainTx.get(docId);
                    }));
                  case 15:
                    docsData = _context.sent;
                    docsData.forEach(function (docData) {
                      if (!done) {
                        if (!queryMatcher || queryMatcher(docData)) {
                          innerResult.push(docData);
                        }
                      }
                      if (!mustManuallyResort && innerResult.length === skipPlusLimit) {
                        done = true;
                        range["return"]();
                      }
                    });
                    _context.next = 5;
                    break;
                  case 19:
                    return _context.abrupt("return", innerResult);
                  case 20:
                  case "end":
                    return _context.stop();
                }
              }, _callee);
            }));
            return function (_x3) {
              return _ref.apply(this, arguments);
            };
          }());
        case 24:
          result = _context2.sent;
          if (mustManuallyResort) {
            sortComparator = _storageDexie.RxStorageDexieStatics.getSortComparator(instance.schema, preparedQuery);
            result = result.sort(sortComparator);
          }

          // apply skip and limit boundaries.
          result = result.slice(skip, skipPlusLimit);
          return _context2.abrupt("return", {
            documents: result
          });
        case 28:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _queryFoundationDB.apply(this, arguments);
}
//# sourceMappingURL=foundationdb-query.js.map