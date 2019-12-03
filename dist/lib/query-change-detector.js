"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sortCompareFunction = sortCompareFunction;
exports._isSortedBefore = _isSortedBefore;
exports._sortFieldChanged = _sortFieldChanged;
exports._getSortOptions = _getSortOptions;
exports._isDocInResultData = _isDocInResultData;
exports.enableDebugging = enableDebugging;
exports.create = create;
exports["default"] = exports.QueryChangeDetector = void 0;

var _pouchdbSelectorCore = require("pouchdb-selector-core");

var _objectPath = _interopRequireDefault(require("object-path"));

var _arrayPushAtSortPosition = require("array-push-at-sort-position");

var _util = require("./util");

/**
 * if a query is observed and a changeEvent comes in,
 * the QueryChangeDetector tries to execute the changeEvent-delta on the exisiting query-results
 * or tells the query it should re-exec on the database if previous not possible.
 *
 * This works equal to meteors oplog-observe-driver
 * @link https://github.com/meteor/docs/blob/version-NEXT/long-form/oplog-observe-driver.md
 */
var DEBUG = false;

var QueryChangeDetector =
/*#__PURE__*/
function () {
  function QueryChangeDetector(query) {
    this.query = query;
    this.primaryKey = query.collection.schema.primaryPath;
  }
  /**
   * @return true if mustReExec, false if no change, array if calculated new results
   */


  var _proto = QueryChangeDetector.prototype;

  _proto.runChangeDetection = function runChangeDetection(changeEvents) {
    var _this = this;

    if (changeEvents.length === 0) return false; // check if enabled

    if (!this.query.collection.database.queryChangeDetection) {
      return true;
    }

    var resultsData = this.query._resultsData;
    var changed = false;
    var found = changeEvents.find(function (changeEvent) {
      var res = _this.handleSingleChange(resultsData, changeEvent);

      if (Array.isArray(res)) {
        changed = true;
        resultsData = res;
        return false;
      } else if (res) return true;
    });
    if (found) return true;
    if (!changed) return false;else return resultsData;
  }
  /**
   * handle a single ChangeEvent and try to calculate the new results
   * @return true if mustReExec, false if no change, array if calculated new results
   */
  ;

  _proto.handleSingleChange = function handleSingleChange(resultsData, changeEvent) {
    var _this2 = this;

    var results = resultsData.slice(0); // copy to stay immutable

    var options = this.query.toJSON();
    var docData = changeEvent.data.v;

    var wasDocInResults = _isDocInResultData(this, docData, resultsData);

    var doesMatchNow = this.query.doesDocumentDataMatch(docData);
    var isFilled = !options.limit || options.limit && resultsData.length >= options.limit;
    var limitAndFilled = options.limit && resultsData.length >= options.limit;

    if (DEBUG) {
      console.log('QueryChangeDetector.handleSingleChange()'); // TODO this should not be an error

      _debugMessage(this, 'start', changeEvent.data.v, 'handleSingleChange()');

      console.log('changeEvent.data:');
      console.dir(changeEvent.data);
      console.log('wasDocInResults: ' + wasDocInResults);
      console.log('doesMatchNow: ' + doesMatchNow);
      console.log('isFilled: ' + isFilled);
      console.log('options:' + JSON.stringify(options));
    }

    var _sortAfter = null;

    var sortAfter = function sortAfter() {
      if (_sortAfter === null) _sortAfter = _isSortedBefore(_this2, results[results.length - 1], docData);
      return _sortAfter;
    };

    var _sortBefore = null;

    var sortBefore = function sortBefore() {
      if (_sortBefore === null) _sortBefore = _isSortedBefore(_this2, docData, results[0]);
      return _sortBefore;
    };

    var __sortFieldChanged = null;

    var sortFieldChanged = function sortFieldChanged() {
      if (__sortFieldChanged === null) {
        var docBefore = (0, _util.removeOneFromArrayIfMatches)(resultsData, function (doc) {
          return doc[_this2.primaryKey] === docData[_this2.primaryKey];
        });
        __sortFieldChanged = _sortFieldChanged(_this2, docBefore, docData);
      }

      return _sortFieldChanged;
    }; // console.log('## ' + results.length);


    if (changeEvent.data.op === 'REMOVE') {
      // R1 (never matched)
      if (!wasDocInResults && !doesMatchNow) {
        _debugMessage(this, 'R1', docData);

        return false;
      } // R2 sorted before got removed but results not filled


      if (options.skip && doesMatchNow && sortBefore() && !isFilled) {
        _debugMessage(this, 'R2', docData);

        results.shift();
        return results;
      } // R3 (was in results and got removed)


      if (doesMatchNow && wasDocInResults && !isFilled) {
        _debugMessage(this, 'R3', docData);

        results = (0, _util.removeOneFromArrayIfMatches)(results, function (doc) {
          return doc[_this2.primaryKey] === docData[_this2.primaryKey];
        });
        return results;
      } // R3.05 was in findOne-result and got removed


      if (options.limit === 1 && !doesMatchNow && wasDocInResults) {
        _debugMessage(this, 'R3.05', docData);

        return true;
      } // R3.1 was in results and got removed, no limit, no skip


      if (doesMatchNow && wasDocInResults && !options.limit && !options.skip) {
        _debugMessage(this, 'R3.1', docData);

        results = (0, _util.removeOneFromArrayIfMatches)(results, function (doc) {
          return doc[_this2.primaryKey] === docData[_this2.primaryKey];
        });
        return results;
      } // R4 matching but after results got removed


      if (doesMatchNow && options.limit && sortAfter()) {
        _debugMessage(this, 'R4', docData);

        return false;
      }
    } else {
      // U1 doc not matched and also not matches now
      if (!options.skip && !wasDocInResults && !doesMatchNow) {
        _debugMessage(this, 'U1', docData);

        return false;
      } // U2 still matching -> only resort


      if (!options.skip && !options.limit && wasDocInResults && doesMatchNow) {
        // DEBUG && this._debugMessage('U2', docData);
        if (sortFieldChanged()) {
          _debugMessage(this, 'U2 - resort', docData); // remove and insert at new sort position


          results = (0, _util.removeOneFromArrayIfMatches)(results, function (doc) {
            return doc[_this2.primaryKey] === docData[_this2.primaryKey];
          });
          results = (0, _arrayPushAtSortPosition.pushAtSortPosition)(results, docData, sortCompareFunction(this));
          return results;
        } else {
          _debugMessage(this, 'U2 - no-resort', docData); // replace but make sure its the same position


          var wasDoc = results.find(function (doc) {
            return doc[_this2.primaryKey] === docData[_this2.primaryKey];
          });
          var i = results.indexOf(wasDoc);
          results[i] = docData;
          return results;
        }
      } // U3 not matched, but matches now, no.skip, limit < length


      if (!options.skip && !limitAndFilled && !wasDocInResults && doesMatchNow) {
        _debugMessage(this, 'U3', docData);

        results = (0, _arrayPushAtSortPosition.pushAtSortPosition)(results, docData, sortCompareFunction(this));
        return results;
      }
    } // if no optimisation-algo matches, return mustReExec:true


    _debugMessage(this, 'NO_MATCH', docData);

    return true;
  };

  return QueryChangeDetector;
}();

exports.QueryChangeDetector = QueryChangeDetector;

function _debugMessage(queryChangeDetector, key) {
  var changeEventData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var title = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'optimized';

  if (!DEBUG) {
    return;
  }

  console.dir({
    name: 'QueryChangeDetector',
    title: title,
    query: queryChangeDetector.query.toString(),
    key: key,
    changeEventData: changeEventData
  });
}

var sortCompareFunctionCache = new WeakMap();
/**
 * returns the sort-comparator
 * which results in the equal sorting that a new query over the db would do
 */

function sortCompareFunction(queryChangeDetector) {
  if (!sortCompareFunctionCache.has(queryChangeDetector)) {
    var sortOptions = _getSortOptions(queryChangeDetector);

    var inMemoryFields = Object.keys(queryChangeDetector.query.toJSON().selector);

    var fun = function fun(a, b) {
      // TODO use createFieldSorter
      var rows = [a, b].map(function (doc) {
        return {
          doc: queryChangeDetector.query.collection.schema.swapPrimaryToId(doc)
        };
      });
      var sortedRows = (0, _pouchdbSelectorCore.filterInMemoryFields)(rows, {
        selector: queryChangeDetector.query.massageSelector,
        sort: sortOptions
      }, inMemoryFields);

      if (sortedRows[0].doc._id === rows[0].doc._id) {
        return -1;
      } else {
        return 1;
      }
    };

    sortCompareFunctionCache.set(queryChangeDetector, fun);
    return fun;
  } else {
    return sortCompareFunctionCache.get(queryChangeDetector);
  }
}
/**
 * checks if the newDocLeft would be placed before docDataRight
 * when the query would be reExecuted
 * @return true if before, false if after
 */


function _isSortedBefore(queryChangeDetector, docDataLeft, docDataRight) {
  var comparator = sortCompareFunction(queryChangeDetector);
  var result = comparator(docDataLeft, docDataRight);
  return result !== 1;
}
/**
 * checks if the sort-relevant fields have changed
 */


function _sortFieldChanged(queryChangeDetector, docDataBefore, docDataAfter) {
  var sortOptions = _getSortOptions(queryChangeDetector);

  var sortFields = sortOptions.map(function (sortObj) {
    return Object.keys(sortObj).pop();
  });
  var changed = false;
  sortFields.find(function (field) {
    var beforeData = _objectPath["default"].get(docDataBefore, field);

    var afterData = _objectPath["default"].get(docDataAfter, field);

    if (beforeData !== afterData) {
      changed = true;
      return true;
    } else return false;
  });
  return changed;
}
/**
 * if no sort-order is specified,
 * pouchdb will use the primary
 */


function _getSortOptions(queryChangeDetector) {
  if (!queryChangeDetector._sortOptions) {
    var options = queryChangeDetector.query.toJSON();
    var sortOptions = options.sort;

    if (!sortOptions) {
      sortOptions = [{
        _id: 'asc'
      }];
    }

    queryChangeDetector._sortOptions = sortOptions;
  }

  return queryChangeDetector._sortOptions;
}
/**
 * check if the document exists in the results data
 */


function _isDocInResultData(queryChangeDetector, docData, resultData) {
  var primaryPath = queryChangeDetector.query.collection.schema.primaryPath;
  var first = resultData.find(function (doc) {
    return doc[primaryPath] === docData[primaryPath];
  });
  return !!first;
}

function enableDebugging() {
  console.log('QueryChangeDetector.enableDebugging()');
  DEBUG = true;
}

function create(query) {
  var ret = new QueryChangeDetector(query);
  return ret;
}

var _default = {
  create: create,
  enableDebugging: enableDebugging
};
exports["default"] = _default;

//# sourceMappingURL=query-change-detector.js.map