"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dexieCount = dexieCount;
exports.dexieQuery = dexieQuery;
exports.getKeyRangeByQueryPlan = getKeyRangeByQueryPlan;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _dexieHelper = require("./dexie-helper");
var _dexieStatics = require("./dexie-statics");
function getKeyRangeByQueryPlan(queryPlan, IDBKeyRange) {
  if (!IDBKeyRange) {
    if (typeof window === 'undefined') {
      throw new Error('IDBKeyRange missing');
    } else {
      IDBKeyRange = window.IDBKeyRange;
    }
  }
  var ret;
  /**
   * If index has only one field,
   * we have to pass the keys directly, not the key arrays.
   */
  if (queryPlan.index.length === 1) {
    ret = IDBKeyRange.bound(queryPlan.startKeys[0], queryPlan.endKeys[0], queryPlan.inclusiveStart, queryPlan.inclusiveEnd);
  } else {
    ret = IDBKeyRange.bound(queryPlan.startKeys, queryPlan.endKeys, queryPlan.inclusiveStart, queryPlan.inclusiveEnd);
  }
  return ret;
}

/**
 * Runs mango queries over the Dexie.js database.
 */
function dexieQuery(_x, _x2) {
  return _dexieQuery.apply(this, arguments);
}
function _dexieQuery() {
  _dexieQuery = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(instance, preparedQuery) {
    var state, query, skip, limit, skipPlusLimit, queryPlan, queryMatcher, keyRange, queryPlanFields, rows, sortComparator;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return instance.internals;
        case 2:
          state = _context2.sent;
          query = preparedQuery.query;
          skip = query.skip ? query.skip : 0;
          limit = query.limit ? query.limit : Infinity;
          skipPlusLimit = skip + limit;
          queryPlan = preparedQuery.queryPlan;
          queryMatcher = false;
          if (!queryPlan.selectorSatisfiedByIndex) {
            queryMatcher = _dexieStatics.RxStorageDexieStatics.getQueryMatcher(instance.schema, preparedQuery);
          }
          keyRange = getKeyRangeByQueryPlan(queryPlan, state.dexieDb._options.IDBKeyRange);
          queryPlanFields = queryPlan.index;
          rows = [];
          _context2.next = 15;
          return state.dexieDb.transaction('r', state.dexieTable, /*#__PURE__*/function () {
            var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(dexieTx) {
              var tx, store, index, indexName, cursorReq;
              return _regenerator["default"].wrap(function _callee$(_context) {
                while (1) switch (_context.prev = _context.next) {
                  case 0:
                    /**
                     * TODO here we use the native IndexedDB transaction
                     * to get the cursor.
                     * Instead we should not leave Dexie.js API and find
                     * a way to create the cursor with Dexie.js.
                     */
                    tx = dexieTx.idbtrans; // const nativeIndexedDB = state.dexieDb.backendDB();
                    // const trans = nativeIndexedDB.transaction([DEXIE_DOCS_TABLE_NAME], 'readonly');
                    store = tx.objectStore(_dexieHelper.DEXIE_DOCS_TABLE_NAME);
                    if (queryPlanFields.length === 1 && queryPlanFields[0] === instance.primaryPath) {
                      index = store;
                    } else {
                      if (queryPlanFields.length === 1) {
                        indexName = (0, _dexieHelper.dexieReplaceIfStartsWithPipe)(queryPlanFields[0]);
                      } else {
                        indexName = '[' + queryPlanFields.map(function (field) {
                          return (0, _dexieHelper.dexieReplaceIfStartsWithPipe)(field);
                        }).join('+') + ']';
                      }
                      index = store.index(indexName);
                    }
                    cursorReq = index.openCursor(keyRange);
                    _context.next = 6;
                    return new Promise(function (res) {
                      cursorReq.onsuccess = function (e) {
                        var cursor = e.target.result;
                        if (cursor) {
                          // We have a record in cursor.value
                          var docData = (0, _dexieHelper.fromDexieToStorage)(cursor.value);
                          if (!docData._deleted && (!queryMatcher || queryMatcher(docData))) {
                            rows.push(docData);
                          }

                          /**
                           * If we do not have to manually sort
                           * and have enough documents,
                           * we can abort iterating over the cursor
                           * because we already have every relevant document.
                           */
                          if (queryPlan.sortFieldsSameAsIndexFields && rows.length === skipPlusLimit) {
                            res();
                          } else {
                            cursor["continue"]();
                          }
                        } else {
                          // Iteration complete
                          res();
                        }
                      };
                    });
                  case 6:
                  case "end":
                    return _context.stop();
                }
              }, _callee);
            }));
            return function (_x5) {
              return _ref.apply(this, arguments);
            };
          }());
        case 15:
          if (!queryPlan.sortFieldsSameAsIndexFields) {
            sortComparator = _dexieStatics.RxStorageDexieStatics.getSortComparator(instance.schema, preparedQuery);
            rows = rows.sort(sortComparator);
          }

          // apply skip and limit boundaries.
          rows = rows.slice(skip, skipPlusLimit);

          /**
           * Comment this in for debugging to check all fields in the database.
           */
          // const docsInDb = await state.dexieTable.filter(queryMatcher).toArray();
          // let documents = docsInDb
          //     .map(docData => stripDexieKey(docData))
          //     .sort(sortComparator);
          // if (preparedQuery.skip) {
          //     documents = documents.slice(preparedQuery.skip);
          // }
          // if (preparedQuery.limit && documents.length > preparedQuery.limit) {
          //     documents = documents.slice(0, preparedQuery.limit);
          // }
          return _context2.abrupt("return", {
            documents: rows
          });
        case 18:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _dexieQuery.apply(this, arguments);
}
function dexieCount(_x3, _x4) {
  return _dexieCount.apply(this, arguments);
}
function _dexieCount() {
  _dexieCount = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(instance, preparedQuery) {
    var state, queryPlan, queryPlanFields, keyRange, count;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return instance.internals;
        case 2:
          state = _context4.sent;
          queryPlan = preparedQuery.queryPlan;
          queryPlanFields = queryPlan.index;
          keyRange = getKeyRangeByQueryPlan(queryPlan, state.dexieDb._options.IDBKeyRange);
          count = -1;
          _context4.next = 9;
          return state.dexieDb.transaction('r', state.dexieTable, /*#__PURE__*/function () {
            var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(dexieTx) {
              var tx, store, index, indexName, request;
              return _regenerator["default"].wrap(function _callee3$(_context3) {
                while (1) switch (_context3.prev = _context3.next) {
                  case 0:
                    tx = dexieTx.idbtrans;
                    store = tx.objectStore(_dexieHelper.DEXIE_DOCS_TABLE_NAME);
                    if (queryPlanFields.length === 1 && queryPlanFields[0] === instance.primaryPath) {
                      index = store;
                    } else {
                      if (queryPlanFields.length === 1) {
                        indexName = (0, _dexieHelper.dexieReplaceIfStartsWithPipe)(queryPlanFields[0]);
                      } else {
                        indexName = '[' + queryPlanFields.map(function (field) {
                          return (0, _dexieHelper.dexieReplaceIfStartsWithPipe)(field);
                        }).join('+') + ']';
                      }
                      index = store.index(indexName);
                    }
                    request = index.count(keyRange);
                    _context3.next = 6;
                    return new Promise(function (res, rej) {
                      request.onsuccess = function () {
                        res(request.result);
                      };
                      request.onerror = function (err) {
                        return rej(err);
                      };
                    });
                  case 6:
                    count = _context3.sent;
                  case 7:
                  case "end":
                    return _context3.stop();
                }
              }, _callee3);
            }));
            return function (_x6) {
              return _ref2.apply(this, arguments);
            };
          }());
        case 9:
          return _context4.abrupt("return", count);
        case 10:
        case "end":
          return _context4.stop();
      }
    }, _callee4);
  }));
  return _dexieCount.apply(this, arguments);
}
//# sourceMappingURL=dexie-query.js.map