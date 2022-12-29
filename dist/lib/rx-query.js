"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxQueryBase = void 0;
exports._getDefaultQuery = _getDefaultQuery;
exports.createRxQuery = createRxQuery;
exports.isFindOneByIdQuery = isFindOneByIdQuery;
exports.isInstanceOf = isInstanceOf;
exports.queryCollection = queryCollection;
exports.tunnelQueryCache = tunnelQueryCache;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _rxjs = require("rxjs");
var _operators = require("rxjs/operators");
var _util = require("./util");
var _rxError = require("./rx-error");
var _hooks = require("./hooks");
var _eventReduce = require("./event-reduce");
var _queryCache = require("./query-cache");
var _rxQueryHelper = require("./rx-query-helper");
var _queryCount = 0;
var newQueryID = function newQueryID() {
  return ++_queryCount;
};
var RxQueryBase = /*#__PURE__*/function () {
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
    this._creationTime = (0, _util.now)();
    this._lastEnsureEqual = 0;
    this.other = {};
    this.uncached = false;
    this.refCount$ = new _rxjs.BehaviorSubject(null);
    this._result = null;
    this._latestChangeEvent = -1;
    this._lastExecStart = 0;
    this._lastExecEnd = 0;
    this._ensureEqualQueue = _util.PROMISE_RESOLVE_FALSE;
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
   * @param newResultData json-docs that were received from the storage
   */
  _proto._setResultData = function _setResultData(newResultData) {
    var _this = this;
    if (typeof newResultData === 'number') {
      this._result = {
        docsData: [],
        docsMap: new Map(),
        docsDataMap: new Map(),
        count: newResultData,
        docs: [],
        time: (0, _util.now)()
      };
      return;
    } else if (newResultData instanceof Map) {
      newResultData = Array.from(newResultData.values());
    }
    var docsDataMap = new Map();
    var docsMap = new Map();
    var docs = newResultData.map(function (docData) {
      return _this.collection._docCache.getCachedRxDocument(docData);
    });

    /**
     * Instead of using the newResultData in the result cache,
     * we directly use the objects that are stored in the RxDocument
     * to ensure we do not store the same data twice and fill up the memory.
     */
    var docsData = docs.map(function (doc) {
      docsDataMap.set(doc.primary, doc._data);
      docsMap.set(doc.primary, doc);
      return doc._data;
    });
    this._result = {
      docsData: docsData,
      docsMap: docsMap,
      docsDataMap: docsDataMap,
      count: docsData.length,
      docs: docs,
      time: (0, _util.now)()
    };
  }

  /**
   * executes the query on the database
   * @return results-array with document-data
   */;
  _proto._execOverDatabase =
  /*#__PURE__*/
  function () {
    var _execOverDatabase2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var _this2 = this;
      var preparedQuery, result, ids, ret, mustBeQueried, docs, docsPromise;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            this._execOverDatabaseCount = this._execOverDatabaseCount + 1;
            this._lastExecStart = (0, _util.now)();
            if (!(this.op === 'count')) {
              _context.next = 12;
              break;
            }
            preparedQuery = this.getPreparedQuery();
            _context.next = 6;
            return this.collection.storageInstance.count(preparedQuery);
          case 6:
            result = _context.sent;
            if (!(result.mode === 'slow' && !this.collection.database.allowSlowCount)) {
              _context.next = 11;
              break;
            }
            throw (0, _rxError.newRxError)('QU14', {
              collection: this.collection,
              queryObj: this.mangoQuery
            });
          case 11:
            return _context.abrupt("return", result.count);
          case 12:
            if (!(this.op === 'findByIds')) {
              _context.next = 23;
              break;
            }
            ids = (0, _util.ensureNotFalsy)(this.mangoQuery.selector)[this.collection.schema.primaryPath].$in;
            ret = new Map();
            mustBeQueried = []; // first try to fill from docCache
            ids.forEach(function (id) {
              var docData = _this2.collection._docCache.getLatestDocumentDataIfExists(id);
              if (docData) {
                if (!docData._deleted) {
                  var doc = _this2.collection._docCache.getCachedRxDocument(docData);
                  ret.set(id, doc);
                }
              } else {
                mustBeQueried.push(id);
              }
            });
            // everything which was not in docCache must be fetched from the storage
            if (!(mustBeQueried.length > 0)) {
              _context.next = 22;
              break;
            }
            _context.next = 20;
            return this.collection.storageInstance.findDocumentsById(mustBeQueried, false);
          case 20:
            docs = _context.sent;
            Object.values(docs).forEach(function (docData) {
              var doc = _this2.collection._docCache.getCachedRxDocument(docData);
              ret.set(doc.primary, doc);
            });
          case 22:
            return _context.abrupt("return", ret);
          case 23:
            docsPromise = queryCollection(this);
            return _context.abrupt("return", docsPromise.then(function (docs) {
              _this2._lastExecEnd = (0, _util.now)();
              return docs;
            }));
          case 25:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function _execOverDatabase() {
      return _execOverDatabase2.apply(this, arguments);
    }
    return _execOverDatabase;
  }()
  /**
   * Execute the query
   * To have an easier implementations,
   * just subscribe and use the first result
   */
  ;
  _proto.exec = function exec(throwIfMissing) {
    var _this3 = this;
    if (throwIfMissing && this.op !== 'findOne') {
      throw (0, _rxError.newRxError)('QU9', {
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
      return (0, _rxjs.firstValueFrom)(_this3.$);
    }).then(function (result) {
      if (!result && throwIfMissing) {
        throw (0, _rxError.newRxError)('QU10', {
          collection: _this3.collection.name,
          query: _this3.mangoQuery,
          op: _this3.op
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
    var stringObj = (0, _util.sortObject)({
      op: this.op,
      query: this.mangoQuery,
      other: this.other
    }, true);
    var value = JSON.stringify(stringObj, _util.stringifyFilter);
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
      mangoQuery: (0, _rxQueryHelper.normalizeMangoQuery)(this.collection.schema.jsonSchema, (0, _util.clone)(this.mangoQuery))
    };
    (0, _hooks.runPluginHooks)('prePrepareQuery', hookInput);
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
    return this.exec().then(function (docs) {
      if (Array.isArray(docs)) {
        // TODO use a bulk operation instead of running .remove() on each document
        return Promise.all(docs.map(function (doc) {
          return doc.remove();
        }));
      } else {
        return docs.remove();
      }
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
    throw (0, _util.pluginMissing)('update');
  }

  // we only set some methods of query-builder here
  // because the others depend on these ones
  ;
  _proto.where = function where(_queryObj) {
    throw (0, _util.pluginMissing)('query-builder');
  };
  _proto.sort = function sort(_params) {
    throw (0, _util.pluginMissing)('query-builder');
  };
  _proto.skip = function skip(_amount) {
    throw (0, _util.pluginMissing)('query-builder');
  };
  _proto.limit = function limit(_amount) {
    throw (0, _util.pluginMissing)('query-builder');
  };
  (0, _createClass2["default"])(RxQueryBase, [{
    key: "$",
    get: function get() {
      var _this4 = this;
      if (!this._$) {
        var results$ = this.collection.$.pipe(
        /**
         * Performance shortcut.
         * Changes to local documents are not relevant for the query.
         */
        (0, _operators.filter)(function (changeEvent) {
          return !changeEvent.isLocal;
        }),
        /**
         * Start once to ensure the querying also starts
         * when there where no changes.
         */
        (0, _operators.startWith)(null),
        // ensure query results are up to date.
        (0, _operators.mergeMap)(function () {
          return _ensureEqual(_this4);
        }),
        // use the current result set, written by _ensureEqual().
        (0, _operators.map)(function () {
          return _this4._result;
        }),
        // do not run stuff above for each new subscriber, only once.
        (0, _operators.shareReplay)(_util.RXJS_SHARE_REPLAY_DEFAULTS),
        // do not proceed if result set has not changed.
        (0, _operators.distinctUntilChanged)(function (prev, curr) {
          if (prev && prev.time === (0, _util.ensureNotFalsy)(curr).time) {
            return true;
          } else {
            return false;
          }
        }), (0, _operators.filter)(function (result) {
          return !!result;
        }),
        /**
         * Map the result set to a single RxDocument or an array,
         * depending on query type
         */
        (0, _operators.map)(function (result) {
          var useResult = (0, _util.ensureNotFalsy)(result);
          if (_this4.op === 'count') {
            return useResult.count;
          } else if (_this4.op === 'findOne') {
            // findOne()-queries emit RxDocument or null
            return useResult.docs.length === 0 ? null : useResult.docs[0];
          } else if (_this4.op === 'findByIds') {
            return useResult.docsMap;
          } else {
            // find()-queries emit RxDocument[]
            // Flat copy the array so it won't matter if the user modifies it.
            return useResult.docs.slice(0);
          }
        }));
        this._$ = (0, _rxjs.merge)(results$,
        /**
         * Also add the refCount$ to the query observable
         * to allow us to count the amount of subscribers.
         */
        this.refCount$.pipe((0, _operators.filter)(function () {
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
      var usePreparedQuery = this.collection.database.storage.statics.prepareQuery(schema, (0, _rxQueryHelper.normalizeMangoQuery)(this.collection.schema.jsonSchema, (0, _util.clone)(this.mangoQuery)));
      return (0, _util.overwriteGetterForCaching)(this, 'queryMatcher', this.collection.database.storage.statics.getQueryMatcher(schema, usePreparedQuery));
    }
  }, {
    key: "asRxQuery",
    get: function get() {
      return this;
    }
  }]);
  return RxQueryBase;
}();
exports.RxQueryBase = RxQueryBase;
function _getDefaultQuery() {
  return {
    selector: {}
  };
}

/**
 * run this query through the QueryCache
 */
function tunnelQueryCache(rxQuery) {
  return rxQuery.collection._queryCache.getByQuery(rxQuery);
}
function createRxQuery(op, queryObj, collection) {
  (0, _hooks.runPluginHooks)('preCreateRxQuery', {
    op: op,
    queryObj: queryObj,
    collection: collection
  });
  var ret = new RxQueryBase(op, queryObj, collection);

  // ensure when created with same params, only one is created
  ret = tunnelQueryCache(ret);
  (0, _queryCache.triggerCacheReplacement)(collection);
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
    return _util.PROMISE_RESOLVE_FALSE;
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
  rxQuery._lastEnsureEqual = (0, _util.now)();

  /**
   * Optimisation shortcuts
   */
  if (
  // db is closed
  rxQuery.collection.database.destroyed ||
  // nothing happened since last run
  _isResultsInSync(rxQuery)) {
    return _util.PROMISE_RESOLVE_FALSE;
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
        var previousCount = (0, _util.ensureNotFalsy)(rxQuery._result).count;
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
        var eventReduceResult = (0, _eventReduce.calculateNewResults)(rxQuery, runChangeEvents);
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

      // A count query needs a different has-changed check.
      if (typeof newResultData === 'number') {
        if (!rxQuery._result || newResultData !== rxQuery._result.count) {
          ret = true;
          rxQuery._setResultData(newResultData);
        }
        return ret;
      }
      if (!rxQuery._result || !(0, _util.areRxDocumentArraysEqual)(rxQuery.collection.schema.primaryPath, newResultData, rxQuery._result.docsData)) {
        ret = true; // true because results changed
        rxQuery._setResultData(newResultData);
      }
      return ret;
    });
  }
  return Promise.resolve(ret); // true if results have changed
}

/**
 * Runs the query over the storage instance
 * of the collection.
 * Does some optimizations to ensuer findById is used
 * when specific queries are used.
 */
function queryCollection(_x) {
  return _queryCollection.apply(this, arguments);
}
/**
 * Returns true if the given query
 * selects exactly one document by its id.
 * Used to optimize performance because these kind of
 * queries do not have to run over an index and can use get-by-id instead.
 * Returns false if no query of that kind.
 * Returns the document id otherwise.
 */
function _queryCollection() {
  _queryCollection = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(rxQuery) {
    var docs, collection, docId, docData, docsMap, preparedQuery, queryResult;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          docs = [];
          collection = rxQuery.collection;
          /**
           * Optimizations shortcut.
           * If query is find-one-document-by-id,
           * then we do not have to use the slow query() method
           * but instead can use findDocumentsById()
           */
          if (!rxQuery.isFindOneByIdQuery) {
            _context2.next = 13;
            break;
          }
          docId = rxQuery.isFindOneByIdQuery; // first try to fill from docCache
          docData = rxQuery.collection._docCache.getLatestDocumentDataIfExists(docId);
          if (docData) {
            _context2.next = 10;
            break;
          }
          _context2.next = 8;
          return collection.storageInstance.findDocumentsById([docId], false);
        case 8:
          docsMap = _context2.sent;
          docData = docsMap[docId];
        case 10:
          if (docData) {
            docs.push(docData);
          }
          _context2.next = 18;
          break;
        case 13:
          preparedQuery = rxQuery.getPreparedQuery();
          _context2.next = 16;
          return collection.storageInstance.query(preparedQuery);
        case 16:
          queryResult = _context2.sent;
          docs = queryResult.documents;
        case 18:
          return _context2.abrupt("return", docs);
        case 19:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _queryCollection.apply(this, arguments);
}
function isFindOneByIdQuery(primaryPath, query) {
  if (!query.skip && query.selector && Object.keys(query.selector).length === 1 && query.selector[primaryPath]) {
    var value = query.selector[primaryPath];
    if (typeof value === 'string') {
      return value;
    } else if (Object.keys(value).length === 1 && typeof value.$eq === 'string') {
      return value.$eq;
    }
  }
  return false;
}
function isInstanceOf(obj) {
  return obj instanceof RxQueryBase;
}
//# sourceMappingURL=rx-query.js.map