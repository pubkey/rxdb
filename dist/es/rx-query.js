import _createClass from "@babel/runtime/helpers/createClass";
import deepEqual from 'fast-deep-equal';
import { BehaviorSubject, firstValueFrom, merge } from 'rxjs';
import { mergeMap, filter, map, startWith, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { sortObject, stringifyFilter, pluginMissing, clone, overwriteGetterForCaching, now, PROMISE_RESOLVE_FALSE, RXJS_SHARE_REPLAY_DEFAULTS, ensureNotFalsy } from './util';
import { newRxError } from './rx-error';
import { runPluginHooks } from './hooks';
import { createRxDocuments } from './rx-document-prototype-merge';
import { calculateNewResults } from './event-reduce';
import { triggerCacheReplacement } from './query-cache';
import { normalizeMangoQuery } from './rx-query-helper';
/**
 * Runs the query over the storage instance
 * of the collection.
 * Does some optimizations to ensuer findById is used
 * when specific queries are used.
 */
export var queryCollection = function queryCollection(rxQuery) {
  try {
    var docs = [];
    var _collection = rxQuery.collection;

    /**
     * Optimizations shortcut.
     * If query is find-one-document-by-id,
     * then we do not have to use the slow query() method
     * but instead can use findDocumentsById()
     */
    var _temp2 = function () {
      if (rxQuery.isFindOneByIdQuery) {
        var docId = rxQuery.isFindOneByIdQuery;
        return Promise.resolve(_collection.storageInstance.findDocumentsById([docId], false)).then(function (docsMap) {
          var docData = docsMap[docId];
          if (docData) {
            docs.push(docData);
          }
        });
      } else {
        var preparedQuery = rxQuery.getPreparedQuery();
        return Promise.resolve(_collection.storageInstance.query(preparedQuery)).then(function (queryResult) {
          docs = queryResult.documents;
        });
      }
    }();
    return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {
      return docs;
    }) : docs);
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Returns true if the given query
 * selects exactly one document by its id.
 * Used to optimize performance because these kind of
 * queries do not have to run over an index and can use get-by-id instead.
 * Returns false if no query of that kind.
 * Returns the document id otherwise.
 */
var _queryCount = 0;
var newQueryID = function newQueryID() {
  return ++_queryCount;
};
export var RxQueryBase = /*#__PURE__*/function () {
  /**
   * Some stats then are used for debugging and cache replacement policies
   */

  // used in the query-cache to determine if the RxQuery can be cleaned up.

  // used by some plugins

  // used to count the subscribers to the query

  /**
   * Contains the current result state
   * or null if query has not run yet.
   */

  function RxQueryBase(op, mangoQuery, collection) {
    this.id = newQueryID();
    this._execOverDatabaseCount = 0;
    this._creationTime = now();
    this._lastEnsureEqual = 0;
    this.other = {};
    this.uncached = false;
    this.refCount$ = new BehaviorSubject(null);
    this._result = null;
    this._latestChangeEvent = -1;
    this._lastExecStart = 0;
    this._lastExecEnd = 0;
    this._ensureEqualQueue = PROMISE_RESOLVE_FALSE;
    this.op = op;
    this.mangoQuery = mangoQuery;
    this.collection = collection;
    if (!mangoQuery) {
      this.mangoQuery = _getDefaultQuery();
    }
    this.isFindOneByIdQuery = isFindOneByIdQuery(this.collection.schema.primaryPath, mangoQuery);
  }
  var _proto = RxQueryBase.prototype;
  /**
   * set the new result-data as result-docs of the query
   * @param newResultData json-docs that were received from pouchdb
   */
  _proto._setResultData = function _setResultData(newResultData) {
    if (typeof newResultData === 'number') {
      this._result = {
        docsData: [],
        docsDataMap: new Map(),
        count: newResultData,
        docs: [],
        time: now()
      };
      return;
    }
    var docs = createRxDocuments(this.collection, newResultData);

    /**
     * Instead of using the newResultData in the result cache,
     * we directly use the objects that are stored in the RxDocument
     * to ensure we do not store the same data twice and fill up the memory.
     */
    var primPath = this.collection.schema.primaryPath;
    var docsDataMap = new Map();
    var docsData = docs.map(function (doc) {
      var docData = doc._dataSync$.getValue();
      var id = docData[primPath];
      docsDataMap.set(id, docData);
      return docData;
    });
    this._result = {
      docsData: docsData,
      docsDataMap: docsDataMap,
      count: docsData.length,
      docs: docs,
      time: now()
    };
  }

  /**
   * executes the query on the database
   * @return results-array with document-data
   */;
  _proto._execOverDatabase = function _execOverDatabase() {
    var _this = this;
    this._execOverDatabaseCount = this._execOverDatabaseCount + 1;
    this._lastExecStart = now();
    if (this.op === 'count') {
      var preparedQuery = this.getPreparedQuery();
      return this.collection.storageInstance.count(preparedQuery).then(function (result) {
        if (result.mode === 'slow' && !_this.collection.database.allowSlowCount) {
          throw newRxError('QU14', {
            collection: _this.collection,
            queryObj: _this.mangoQuery
          });
        } else {
          return result.count;
        }
      });
    }
    var docsPromise = queryCollection(this);
    return docsPromise.then(function (docs) {
      _this._lastExecEnd = now();
      return docs;
    });
  }

  /**
   * Execute the query
   * To have an easier implementations,
   * just subscribe and use the first result
   */;
  _proto.exec = function exec(throwIfMissing) {
    var _this2 = this;
    if (throwIfMissing && this.op !== 'findOne') {
      throw newRxError('QU9', {
        collection: this.collection.name,
        query: this.mangoQuery,
        op: this.op
      });
    }

    /**
     * run _ensureEqual() here,
     * this will make sure that errors in the query which throw inside of the RxStorage,
     * will be thrown at this execution context and not in the background.
     */
    return _ensureEqual(this).then(function () {
      return firstValueFrom(_this2.$);
    }).then(function (result) {
      if (!result && throwIfMissing) {
        throw newRxError('QU10', {
          collection: _this2.collection.name,
          query: _this2.mangoQuery,
          op: _this2.op
        });
      } else {
        return result;
      }
    });
  }

  /**
   * cached call to get the queryMatcher
   * @overwrites itself with the actual value
   */;
  /**
   * returns a string that is used for equal-comparisons
   * @overwrites itself with the actual value
   */
  _proto.toString = function toString() {
    var stringObj = sortObject({
      op: this.op,
      query: this.mangoQuery,
      other: this.other
    }, true);
    var value = JSON.stringify(stringObj, stringifyFilter);
    this.toString = function () {
      return value;
    };
    return value;
  }

  /**
   * returns the prepared query
   * which can be send to the storage instance to query for documents.
   * @overwrites itself with the actual value.
   */;
  _proto.getPreparedQuery = function getPreparedQuery() {
    var hookInput = {
      rxQuery: this,
      // can be mutated by the hooks so we have to deep clone first.
      mangoQuery: normalizeMangoQuery(this.collection.schema.jsonSchema, clone(this.mangoQuery))
    };
    runPluginHooks('prePrepareQuery', hookInput);
    var value = this.collection.database.storage.statics.prepareQuery(this.collection.schema.jsonSchema, hookInput.mangoQuery);
    this.getPreparedQuery = function () {
      return value;
    };
    return value;
  }

  /**
   * returns true if the document matches the query,
   * does not use the 'skip' and 'limit'
   */;
  _proto.doesDocumentDataMatch = function doesDocumentDataMatch(docData) {
    // if doc is deleted, it cannot match
    if (docData._deleted) {
      return false;
    }
    return this.queryMatcher(docData);
  }

  /**
   * deletes all found documents
   * @return promise with deleted documents
   */;
  _proto.remove = function remove() {
    var ret;
    return this.exec().then(function (docs) {
      ret = docs;
      if (Array.isArray(docs)) {
        // TODO use a bulk operation instead of running .remove() on each document
        return Promise.all(docs.map(function (doc) {
          return doc.remove();
        }));
      } else {
        return docs.remove();
      }
    }).then(function () {
      return ret;
    });
  }

  /**
   * helper function to transform RxQueryBase to RxQuery type
   */;
  /**
   * updates all found documents
   * @overwritten by plugin (optional)
   */
  _proto.update = function update(_updateObj) {
    throw pluginMissing('update');
  }

  // we only set some methods of query-builder here
  // because the others depend on these ones
  ;
  _proto.where = function where(_queryObj) {
    throw pluginMissing('query-builder');
  };
  _proto.sort = function sort(_params) {
    throw pluginMissing('query-builder');
  };
  _proto.skip = function skip(_amount) {
    throw pluginMissing('query-builder');
  };
  _proto.limit = function limit(_amount) {
    throw pluginMissing('query-builder');
  };
  _createClass(RxQueryBase, [{
    key: "$",
    get: function get() {
      var _this3 = this;
      if (!this._$) {
        var results$ = this.collection.$.pipe(
        /**
         * Performance shortcut.
         * Changes to local documents are not relevant for the query.
         */
        filter(function (changeEvent) {
          return !changeEvent.isLocal;
        }),
        /**
         * Start once to ensure the querying also starts
         * when there where no changes.
         */
        startWith(null),
        // ensure query results are up to date.
        mergeMap(function () {
          return _ensureEqual(_this3);
        }),
        // use the current result set, written by _ensureEqual().
        map(function () {
          return _this3._result;
        }),
        // do not run stuff above for each new subscriber, only once.
        shareReplay(RXJS_SHARE_REPLAY_DEFAULTS),
        // do not proceed if result set has not changed.
        distinctUntilChanged(function (prev, curr) {
          if (prev && prev.time === ensureNotFalsy(curr).time) {
            return true;
          } else {
            return false;
          }
        }), filter(function (result) {
          return !!result;
        }),
        /**
         * Map the result set to a single RxDocument or an array,
         * depending on query type
         */
        map(function (result) {
          var useResult = ensureNotFalsy(result);
          if (_this3.op === 'count') {
            return useResult.count;
          } else if (_this3.op === 'findOne') {
            // findOne()-queries emit RxDocument or null
            return useResult.docs.length === 0 ? null : useResult.docs[0];
          } else {
            // find()-queries emit RxDocument[]
            // Flat copy the array so it won't matter if the user modifies it.
            return useResult.docs.slice(0);
          }
        }));
        this._$ = merge(results$,
        /**
         * Also add the refCount$ to the query observable
         * to allow us to count the amount of subscribers.
         */
        this.refCount$.pipe(filter(function () {
          return false;
        })));
      }
      return this._$;
    }

    // stores the changeEvent-number of the last handled change-event
  }, {
    key: "queryMatcher",
    get: function get() {
      var schema = this.collection.schema.jsonSchema;

      /**
       * Instead of calling this.getPreparedQuery(),
       * we have to prepare the query for the query matcher
       * so that it does not contain modifications from the hooks
       * like the key compression.
       */
      var usePreparedQuery = this.collection.database.storage.statics.prepareQuery(schema, normalizeMangoQuery(this.collection.schema.jsonSchema, clone(this.mangoQuery)));
      return overwriteGetterForCaching(this, 'queryMatcher', this.collection.database.storage.statics.getQueryMatcher(schema, usePreparedQuery));
    }
  }, {
    key: "asRxQuery",
    get: function get() {
      return this;
    }
  }]);
  return RxQueryBase;
}();
export function _getDefaultQuery() {
  return {
    selector: {}
  };
}

/**
 * run this query through the QueryCache
 */
export function tunnelQueryCache(rxQuery) {
  return rxQuery.collection._queryCache.getByQuery(rxQuery);
}
export function createRxQuery(op, queryObj, collection) {
  runPluginHooks('preCreateRxQuery', {
    op: op,
    queryObj: queryObj,
    collection: collection
  });
  var ret = new RxQueryBase(op, queryObj, collection);

  // ensure when created with same params, only one is created
  ret = tunnelQueryCache(ret);
  triggerCacheReplacement(collection);
  return ret;
}

/**
 * Check if the current results-state is in sync with the database
 * which means that no write event happened since the last run.
 * @return false if not which means it should re-execute
 */
function _isResultsInSync(rxQuery) {
  var currentLatestEventNumber = rxQuery.asRxQuery.collection._changeEventBuffer.counter;
  if (rxQuery._latestChangeEvent >= currentLatestEventNumber) {
    return true;
  } else {
    return false;
  }
}

/**
 * wraps __ensureEqual()
 * to ensure it does not run in parallel
 * @return true if has changed, false if not
 */
function _ensureEqual(rxQuery) {
  // Optimisation shortcut
  if (rxQuery.collection.database.destroyed || _isResultsInSync(rxQuery)) {
    return PROMISE_RESOLVE_FALSE;
  }
  rxQuery._ensureEqualQueue = rxQuery._ensureEqualQueue.then(function () {
    return __ensureEqual(rxQuery);
  });
  return rxQuery._ensureEqualQueue;
}

/**
 * ensures that the results of this query is equal to the results which a query over the database would give
 * @return true if results have changed
 */
function __ensureEqual(rxQuery) {
  rxQuery._lastEnsureEqual = now();

  /**
   * Optimisation shortcuts
   */
  if (
  // db is closed
  rxQuery.collection.database.destroyed ||
  // nothing happened since last run
  _isResultsInSync(rxQuery)) {
    return PROMISE_RESOLVE_FALSE;
  }
  var ret = false;
  var mustReExec = false; // if this becomes true, a whole execution over the database is made
  if (rxQuery._latestChangeEvent === -1) {
    // have not executed yet -> must run
    mustReExec = true;
  }

  /**
   * try to use EventReduce to calculate the new results
   */
  if (!mustReExec) {
    var missedChangeEvents = rxQuery.asRxQuery.collection._changeEventBuffer.getFrom(rxQuery._latestChangeEvent + 1);
    if (missedChangeEvents === null) {
      // changeEventBuffer is of bounds -> we must re-execute over the database
      mustReExec = true;
    } else {
      rxQuery._latestChangeEvent = rxQuery.asRxQuery.collection._changeEventBuffer.counter;
      var runChangeEvents = rxQuery.asRxQuery.collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);
      if (rxQuery.op === 'count') {
        // 'count' query
        var previousCount = ensureNotFalsy(rxQuery._result).count;
        var newCount = previousCount;
        runChangeEvents.forEach(function (cE) {
          var didMatchBefore = cE.previousDocumentData && rxQuery.doesDocumentDataMatch(cE.previousDocumentData);
          var doesMatchNow = rxQuery.doesDocumentDataMatch(cE.documentData);
          if (!didMatchBefore && doesMatchNow) {
            newCount++;
          }
          if (didMatchBefore && !doesMatchNow) {
            newCount--;
          }
        });
        if (newCount !== previousCount) {
          ret = true; // true because results changed
          rxQuery._setResultData(newCount);
        }
      } else {
        // 'find' or 'findOne' query
        var eventReduceResult = calculateNewResults(rxQuery, runChangeEvents);
        if (eventReduceResult.runFullQueryAgain) {
          // could not calculate the new results, execute must be done
          mustReExec = true;
        } else if (eventReduceResult.changed) {
          // we got the new results, we do not have to re-execute, mustReExec stays false
          ret = true; // true because results changed
          rxQuery._setResultData(eventReduceResult.newResults);
        }
      }
    }
  }

  // oh no we have to re-execute the whole query over the database
  if (mustReExec) {
    // counter can change while _execOverDatabase() is running so we save it here
    var latestAfter = rxQuery.collection._changeEventBuffer.counter;
    return rxQuery._execOverDatabase().then(function (newResultData) {
      rxQuery._latestChangeEvent = latestAfter;
      if (!rxQuery._result || !deepEqual(newResultData, rxQuery._result.docsData)) {
        ret = true; // true because results changed
        rxQuery._setResultData(newResultData);
      }
      return ret;
    });
  }
  return Promise.resolve(ret); // true if results have changed
}

export function isFindOneByIdQuery(primaryPath, query) {
  if (!query.skip && query.selector && Object.keys(query.selector).length === 1 && query.selector[primaryPath]) {
    if (typeof query.selector[primaryPath] === 'string') {
      return query.selector[primaryPath];
    } else if (Object.keys(query.selector[primaryPath]).length === 1 && typeof query.selector[primaryPath].$eq === 'string') {
      return query.selector[primaryPath].$eq;
    }
  }
  return false;
}
export function isInstanceOf(obj) {
  return obj instanceof RxQueryBase;
}
//# sourceMappingURL=rx-query.js.map