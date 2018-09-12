/**
 * if a query is observed and a changeEvent comes in,
 * the QueryChangeDetector tries to execute the changeEvent-delta on the exisiting query-results
 * or tells the query it should re-exec on the database if previous not possible.
 *
 * This works equal to meteors oplog-observe-driver
 * @link https://github.com/meteor/docs/blob/version-NEXT/long-form/oplog-observe-driver.md
 */
import { filterInMemoryFields, massageSelector } from 'pouchdb-selector-core';
import objectPath from 'object-path';
var DEBUG = false;

var QueryChangeDetector =
/*#__PURE__*/
function () {
  function QueryChangeDetector(query) {
    /**
     * @type {RxQuery}
     */
    this.query = query;
    this.primaryKey = this.query.collection.schema.primaryPath;
  }
  /**
   * @param {ChangeEvent[]} changeEvents
   * @return {boolean|Object[]} true if mustReExec, false if no change, array if calculated new results
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
  };
  /**
   * handle a single ChangeEvent and try to calculate the new results
   * @param {Object[]} resultsData of previous results
   * @param {ChangeEvent} changeEvent
   * @return {boolean|Object[]} true if mustReExec, false if no change, array if calculated new results
   */


  _proto.handleSingleChange = function handleSingleChange(resultsData, changeEvent) {
    var _this2 = this;

    var results = resultsData.slice(0); // copy to stay immutable

    var options = this.query.toJSON();
    var docData = changeEvent.data.v;

    var wasDocInResults = _isDocInResultData(this, docData, resultsData);

    var doesMatchNow = doesDocMatchQuery(this, docData);
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
        var docBefore = resultsData.find(function (doc) {
          return doc[_this2.primaryKey] === docData[_this2.primaryKey];
        });
        __sortFieldChanged = _sortFieldChanged(_this2, docBefore, docData);
      }

      return _sortFieldChanged;
    };

    if (changeEvent.data.op === 'REMOVE') {
      // R1 (never matched)
      if (!wasDocInResults && !doesMatchNow) {
        DEBUG && _debugMessage(this, 'R1', docData);
        return false;
      } // R2 sorted before got removed but results not filled


      if (options.skip && doesMatchNow && sortBefore() && !isFilled) {
        DEBUG && _debugMessage(this, 'R2', docData);
        results.shift();
        return results;
      } // R3 (was in results and got removed)


      if (doesMatchNow && wasDocInResults && !isFilled) {
        DEBUG && _debugMessage(this, 'R3', docData);
        results = results.filter(function (doc) {
          return doc[_this2.primaryKey] !== docData[_this2.primaryKey];
        });
        return results;
      } // R3.05 was in findOne-result and got removed


      if (options.limit === 1 && !doesMatchNow && wasDocInResults) {
        DEBUG && _debugMessage(this, 'R3.05', docData);
        return true;
      } // R3.1 was in results and got removed, no limit, no skip


      if (doesMatchNow && wasDocInResults && !options.limit && !options.skip) {
        DEBUG && _debugMessage(this, 'R3.1', docData);
        results = results.filter(function (doc) {
          return doc[_this2.primaryKey] !== docData[_this2.primaryKey];
        });
        return results;
      } // R4 matching but after results got removed


      if (doesMatchNow && options.limit && sortAfter()) {
        DEBUG && _debugMessage(this, 'R4', docData);
        return false;
      }
    } else {
      // U1 doc not matched and also not matches now
      if (!options.skip && !options.limit && !wasDocInResults && !doesMatchNow) {
        DEBUG && _debugMessage(this, 'U1', docData);
        return false;
      } // U2 still matching -> only resort


      if (!options.skip && !options.limit && wasDocInResults && doesMatchNow) {
        // DEBUG && this._debugMessage('U2', docData);
        // replace but make sure its the same position
        var wasDoc = results.find(function (doc) {
          return doc[_this2.primaryKey] === docData[_this2.primaryKey];
        });
        var i = results.indexOf(wasDoc);
        results[i] = docData;

        if (sortFieldChanged()) {
          DEBUG && _debugMessage(this, 'U2 - resort', docData);
          return _resortDocData(this, results);
        } else {
          DEBUG && _debugMessage(this, 'U2 - no-resort', docData);
          return results;
        }
      } // U3 not matched, but matches now, no.skip, limit < length


      if (!options.skip && !limitAndFilled && !wasDocInResults && doesMatchNow) {
        DEBUG && _debugMessage(this, 'U3', docData);
        results.push(docData); //    console.log('U3: preSort:');
        //    console.dir(results);

        var sorted = _resortDocData(this, results); //        console.log('U3: postSort:');
        //            console.dir(sorted);


        return sorted;
      }
    } // if no optimisation-algo matches, return mustReExec:true


    return true;
  };

  return QueryChangeDetector;
}();

function _debugMessage(queryChangeDetector, key) {
  var changeEventData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var title = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'optimized';
  console.dir({
    name: 'QueryChangeDetector',
    title: title,
    query: queryChangeDetector.query.toString(),
    key: key,
    changeEventData: changeEventData
  });
}
/**
 * reruns the sort on the given resultsData
 * @param  {object[]} resultsData
 * @return {object[]}
 */


export function _resortDocData(queryChangeDetector, resultsData) {
  var sortOptions = _getSortOptions(queryChangeDetector);

  var rows = resultsData.map(function (doc) {
    return {
      doc: queryChangeDetector.query.collection.schema.swapPrimaryToId(doc)
    };
  });
  var inMemoryFields = Object.keys(queryChangeDetector.query.toJSON().selector); // TODO use createFieldSorter

  var sortedRows = filterInMemoryFields(rows, {
    selector: massageSelector(queryChangeDetector.query.toJSON().selector),
    sort: sortOptions
  }, inMemoryFields);
  var sortedDocs = sortedRows.map(function (row) {
    return row.doc;
  }).map(function (doc) {
    return queryChangeDetector.query.collection.schema.swapIdToPrimary(doc);
  });
  return sortedDocs;
}
/**
 * checks if the newDocLeft would be placed before docDataRight
 * when the query would be reExecuted
 * @param  {Object} docDataNew
 * @param  {Object} docDataIs
 * @return {boolean} true if before, false if after
 */

export function _isSortedBefore(queryChangeDetector, docDataLeft, docDataRight) {
  var sortOptions = _getSortOptions(queryChangeDetector);

  var inMemoryFields = Object.keys(queryChangeDetector.query.toJSON().selector);
  var swappedLeft = queryChangeDetector.query.collection.schema.swapPrimaryToId(docDataLeft);
  var swappedRight = queryChangeDetector.query.collection.schema.swapPrimaryToId(docDataRight);
  var rows = [swappedLeft, swappedRight].map(function (doc) {
    return {
      id: doc._id,
      doc: doc
    };
  }); // TODO use createFieldSorter

  var sortedRows = filterInMemoryFields(rows, {
    selector: massageSelector(queryChangeDetector.query.toJSON().selector),
    sort: sortOptions
  }, inMemoryFields);
  return sortedRows[0].id === swappedLeft._id;
}
/**
 * checks if the sort-relevant fields have changed
 * @param  {object} docDataBefore
 * @param  {object} docDataAfter
 * @return {boolean}
 */

export function _sortFieldChanged(queryChangeDetector, docDataBefore, docDataAfter) {
  var sortOptions = _getSortOptions(queryChangeDetector);

  var sortFields = sortOptions.map(function (sortObj) {
    return Object.keys(sortObj).pop();
  });
  var changed = false;
  sortFields.find(function (field) {
    var beforeData = objectPath.get(docDataBefore, field);
    var afterData = objectPath.get(docDataAfter, field);

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

export function _getSortOptions(queryChangeDetector) {
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
 * @param {object} docData
 * @param {object[]} resultData
 */

export function _isDocInResultData(queryChangeDetector, docData, resultData) {
  var primaryPath = queryChangeDetector.query.collection.schema.primaryPath;
  var first = resultData.find(function (doc) {
    return doc[primaryPath] === docData[primaryPath];
  });
  return !!first;
}
/**
 * check if the document matches the query
 * @param {object} docData
 * @return {boolean}
 */

export function doesDocMatchQuery(queryChangeDetector, docData) {
  // if doc is deleted, it cannot match
  if (docData._deleted) return false;
  docData = queryChangeDetector.query.collection.schema.swapPrimaryToId(docData);
  var inMemoryFields = Object.keys(queryChangeDetector.query.toJSON().selector);
  var retDocs = filterInMemoryFields([{
    doc: docData
  }], {
    selector: massageSelector(queryChangeDetector.query.toJSON().selector)
  }, inMemoryFields);
  var ret = retDocs.length === 1;
  return ret;
}
export function enableDebugging() {
  console.log('QueryChangeDetector.enableDebugging()');
  DEBUG = true;
}
/**
 * @param  {RxQuery} query
 * @return {QueryChangeDetector}
 */

export function create(query) {
  var ret = new QueryChangeDetector(query);
  return ret;
}
export default {
  create: create,
  enableDebugging: enableDebugging
};