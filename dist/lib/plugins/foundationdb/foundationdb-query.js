"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.queryFoundationDB = void 0;
var _customIndex = require("../../custom-index");
var _util = require("../../util");
var _dexie = require("../dexie");
var _foundationdbHelpers = require("./foundationdb-helpers");
function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }
        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }
    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }
    pact.s = state;
    pact.v = value;
    var observer = pact.o;
    if (observer) {
      observer(pact);
    }
  }
}
var _Pact = /*#__PURE__*/function () {
  function _Pact() {}
  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;
    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;
      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }
        return result;
      } else {
        return this;
      }
    }
    this.o = function (_this) {
      try {
        var value = _this.v;
        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };
    return result;
  };
  return _Pact;
}();
function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}
function _for(test, update, body) {
  var stage;
  for (;;) {
    var shouldContinue = test();
    if (_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }
    if (!shouldContinue) {
      return result;
    }
    if (shouldContinue.then) {
      stage = 0;
      break;
    }
    var result = body();
    if (result && result.then) {
      if (_isSettledPact(result)) {
        result = result.s;
      } else {
        stage = 1;
        break;
      }
    }
    if (update) {
      var updateValue = update();
      if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
        stage = 2;
        break;
      }
    }
  }
  var pact = new _Pact();
  var reject = _settle.bind(null, pact, 2);
  (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
  return pact;
  function _resumeAfterBody(value) {
    result = value;
    do {
      if (update) {
        updateValue = update();
        if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
          updateValue.then(_resumeAfterUpdate).then(void 0, reject);
          return;
        }
      }
      shouldContinue = test();
      if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.v) {
        _settle(pact, 1, result);
        return;
      }
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }
      result = body();
      if (_isSettledPact(result)) {
        result = result.v;
      }
    } while (!result || !result.then);
    result.then(_resumeAfterBody).then(void 0, reject);
  }
  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      result = body();
      if (result && result.then) {
        result.then(_resumeAfterBody).then(void 0, reject);
      } else {
        _resumeAfterBody(result);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
  function _resumeAfterUpdate() {
    if (shouldContinue = test()) {
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _resumeAfterTest(shouldContinue);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
}
var queryFoundationDB = function queryFoundationDB(instance, preparedQuery) {
  try {
    var queryPlan = preparedQuery.queryPlan;
    var query = preparedQuery.query;
    var skip = query.skip ? query.skip : 0;
    var limit = query.limit ? query.limit : Infinity;
    var skipPlusLimit = skip + limit;
    var queryPlanFields = queryPlan.index;
    var mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;
    var queryMatcher = false;
    if (!queryPlan.selectorSatisfiedByIndex) {
      queryMatcher = _dexie.RxStorageDexieStatics.getQueryMatcher(instance.schema, preparedQuery);
    }
    return Promise.resolve(instance.internals.dbsPromise).then(function (dbs) {
      var indexForName = queryPlanFields.slice(0);
      indexForName.unshift('_deleted');
      var indexName = (0, _foundationdbHelpers.getFoundationDBIndexName)(indexForName);
      var indexDB = (0, _util.ensureNotFalsy)(dbs.indexes[indexName]).db;
      var lowerBound = queryPlan.startKeys;
      lowerBound = [false].concat(lowerBound);
      var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(instance.schema, indexForName, lowerBound, queryPlan.inclusiveStart);
      var upperBound = queryPlan.endKeys;
      upperBound = [false].concat(upperBound);
      var upperBoundString = (0, _customIndex.getStartIndexStringFromUpperBound)(instance.schema, indexForName, upperBound, queryPlan.inclusiveEnd);
      return Promise.resolve(dbs.root.doTransaction(function (tx) {
        try {
          var _interrupt = false;
          var innerResult = [];
          var indexTx = tx.at(indexDB.subspace);
          var mainTx = tx.at(dbs.main.subspace);
          var range = indexTx.getRangeBatch(lowerBoundString, upperBoundString, {
            // TODO these options seem to be broken in the foundationdb node bindings
            // limit: instance.settings.batchSize,
            // streamingMode: StreamingMode.Exact
          });
          var done = false;
          var _temp = _for(function () {
            return !_interrupt && !done;
          }, void 0, function () {
            return Promise.resolve(range.next()).then(function (next) {
              if (next.done) {
                done = true;
                _interrupt = true;
                return;
              }
              var docIds = next.value.map(function (row) {
                return row[1];
              });
              return Promise.resolve(Promise.all(docIds.map(function (docId) {
                return mainTx.get(docId);
              }))).then(function (docsData) {
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
              });
            });
          });
          return Promise.resolve(_temp && _temp.then ? _temp.then(function () {
            return innerResult;
          }) : innerResult);
        } catch (e) {
          return Promise.reject(e);
        }
      })).then(function (result) {
        if (mustManuallyResort) {
          var sortComparator = _dexie.RxStorageDexieStatics.getSortComparator(instance.schema, preparedQuery);
          result = result.sort(sortComparator);
        }

        // apply skip and limit boundaries.
        result = result.slice(skip, skipPlusLimit);
        return {
          documents: result
        };
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
exports.queryFoundationDB = queryFoundationDB;
//# sourceMappingURL=foundationdb-query.js.map