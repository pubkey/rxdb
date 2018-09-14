"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.isInstanceOf = isInstanceOf;
exports["default"] = exports.RxQuery = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _deepEqual = _interopRequireDefault(require("deep-equal"));

var _mquery = _interopRequireDefault(require("./mquery/mquery"));

var _util = require("./util");

var _queryChangeDetector = _interopRequireDefault(require("./query-change-detector"));

var _rxError = _interopRequireDefault(require("./rx-error"));

var _hooks = require("./hooks");

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _queryCount = 0;

var newQueryID = function newQueryID() {
  return ++_queryCount;
};

var RxQuery =
/*#__PURE__*/
function () {
  function RxQuery(op, queryObj, collection) {
    this.op = op;
    this.collection = collection;
    this.id = newQueryID();
    if (!queryObj) queryObj = _getDefaultQuery(this.collection);
    this.mquery = new _mquery["default"](queryObj);
    this._subs = []; // contains the results as plain json-data

    this._resultsData = null; // contains the results as RxDocument[]

    this._resultsDocs$ = new _rxjs.BehaviorSubject(null);
    this._queryChangeDetector = _queryChangeDetector["default"].create(this); // stores the changeEvent-Number of the last handled change-event

    this._latestChangeEvent = -1;
    /**
     * counts how often the execution on the whole db was done
     * (used for tests and debugging)
     * @type {Number}
     */

    this._execOverDatabaseCount = 0;
    this._ensureEqualQueue = Promise.resolve();
  }

  var _proto = RxQuery.prototype;

  _proto.toString = function toString() {
    if (!this.stringRep) {
      var stringObj = (0, _util.sortObject)({
        op: this.op,
        options: this.mquery.options,
        _conditions: this.mquery._conditions,
        _path: this.mquery._path,
        _fields: this.mquery._fields
      }, true);
      this.stringRep = JSON.stringify(stringObj, _util.stringifyFilter);
    }

    return this.stringRep;
  }; // returns a clone of this RxQuery


  _proto._clone = function _clone() {
    var cloned = new RxQuery(this.op, _getDefaultQuery(this.collection), this.collection);
    cloned.mquery = this.mquery.clone();
    return cloned;
  };
  /**
   * set the new result-data as result-docs of the query
   * @param {{}[]} newResultData json-docs that were recieved from pouchdb
   * @return {RxDocument[]}
   */


  _proto._setResultData = function _setResultData(newResultData) {
    this._resultsData = newResultData;

    var docs = this.collection._createDocuments(this._resultsData);

    this._resultsDocs$.next(docs);

    return docs;
  };
  /**
   * executes the query on the database
   * @return {Promise<{}[]>} results-array with document-data
   */


  _proto._execOverDatabase = function _execOverDatabase() {
    this._execOverDatabaseCount = this._execOverDatabaseCount + 1;
    var docsPromise;

    switch (this.op) {
      case 'find':
        docsPromise = this.collection._pouchFind(this);
        break;

      case 'findOne':
        docsPromise = this.collection._pouchFind(this, 1);
        break;

      default:
        throw _rxError["default"].newRxError('QU1', {
          op: this.op
        });
    }

    return docsPromise;
  };
  /**
   * Returns an observable that emits the results
   * This should behave like an rxjs-BehaviorSubject which means:
   * - Emit the current result-set on subscribe
   * - Emit the new result-set when an RxChangeEvent comes in
   * - Do not emit anything before the first result-set was created (no null)
   * @return {BehaviorSubject<RxDocument[]>}
   */


  /**
   * Execute the query
   * To have an easier implementations,
   * just subscribe and use the first result
   * @return {Promise<RxDocument|RxDocument[]>} found documents
   */
  _proto.exec =
  /*#__PURE__*/
  function () {
    var _exec = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee() {
      var _this = this;

      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", _ensureEqual(this).then(function () {
                return _this.$.pipe((0, _operators.first)()).toPromise();
              }));

            case 1:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function exec() {
      return _exec.apply(this, arguments);
    };
  }();

  _proto.toJSON = function toJSON() {
    if (this._toJSON) return this._toJSON;
    var primPath = this.collection.schema.primaryPath;
    var json = {
      selector: this.mquery._conditions
    };
    var options = (0, _util.clone)(this.mquery.options); // sort

    if (options.sort) {
      var sortArray = [];
      Object.keys(options.sort).map(function (fieldName) {
        var dirInt = options.sort[fieldName];
        var dir = 'asc';
        if (dirInt === -1) dir = 'desc';
        var pushMe = {}; // TODO run primary-swap somewhere else

        if (fieldName === primPath) fieldName = '_id';
        pushMe[fieldName] = dir;
        sortArray.push(pushMe);
      });
      json.sort = sortArray;
    }

    if (options.limit) {
      if (typeof options.limit !== 'number') {
        throw _rxError["default"].newRxTypeError('QU2', {
          limit: options.limit
        });
      }

      json.limit = options.limit;
    }

    if (options.skip) {
      if (typeof options.skip !== 'number') {
        throw _rxError["default"].newRxTypeError('QU3', {
          skip: options.skip
        });
      }

      json.skip = options.skip;
    } // strip empty selectors


    Object.entries(json.selector).filter(function (_ref) {
      var v = _ref[1];
      return (0, _typeof2["default"])(v) === 'object';
    }).filter(function (_ref2) {
      var v = _ref2[1];
      return v !== null;
    }).filter(function (_ref3) {
      var v = _ref3[1];
      return !Array.isArray(v);
    }).filter(function (_ref4) {
      var v = _ref4[1];
      return Object.keys(v).length === 0;
    }).forEach(function (_ref5) {
      var k = _ref5[0];
      return delete json.selector[k];
    }); // primary swap

    if (primPath !== '_id' && json.selector[primPath]) {
      // selector
      json.selector._id = json.selector[primPath];
      delete json.selector[primPath];
    } // if no selector is used, pouchdb has a bug, so we add a default-selector


    if (Object.keys(json.selector).length === 0) {
      json.selector = {
        _id: {}
      };
    }

    this._toJSON = json;
    return this._toJSON;
  };
  /**
   * get the key-compression version of this query
   * @return {{selector: {}, sort: []}} compressedQuery
   */


  _proto.keyCompress = function keyCompress() {
    if (!this.collection.schema.doKeyCompression()) {
      return this.toJSON();
    } else {
      if (!this._keyCompress) {
        this._keyCompress = this.collection._keyCompressor.compressQuery(this.toJSON());
      }

      return this._keyCompress;
    }
  };
  /**
   * deletes all found documents
   * @return {Promise(RxDocument|RxDocument[])} promise with deleted documents
   */


  _proto.remove = function remove() {
    var ret;
    return this.exec().then(function (docs) {
      ret = docs;
      if (Array.isArray(docs)) return Promise.all(docs.map(function (doc) {
        return doc.remove();
      }));else return docs.remove();
    }).then(function () {
      return ret;
    });
  };
  /**
   * updates all found documents
   * @overwritten by plugin (optinal)
   * @param  {object} updateObj
   * @return {Promise(RxDocument|RxDocument[])} promise with updated documents
   */


  _proto.update = function update() {
    throw _rxError["default"].pluginMissing('update');
  };
  /**
   * regex cannot run on primary _id
   * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
   */


  _proto.regex = function regex(params) {
    var clonedThis = this._clone();

    if (this.mquery._path === this.collection.schema.primaryPath) {
      throw _rxError["default"].newRxError('QU4', {
        path: this.mquery._path
      });
    }

    clonedThis.mquery.regex(params);
    return _tunnelQueryCache(clonedThis);
  };
  /**
   * make sure it searches index because of pouchdb-find bug
   * @link https://github.com/nolanlawson/pouchdb-find/issues/204
   */


  _proto.sort = function sort(params) {
    var clonedThis = this._clone(); // workarround because sort wont work on unused keys


    if ((0, _typeof2["default"])(params) !== 'object') {
      var checkParam = params.charAt(0) === '-' ? params.substring(1) : params;
      if (!clonedThis.mquery._conditions[checkParam]) _sortAddToIndex(checkParam, clonedThis);
    } else {
      Object.keys(params).filter(function (k) {
        return !clonedThis.mquery._conditions[k] || !clonedThis.mquery._conditions[k].$gt;
      }).forEach(function (k) {
        return _sortAddToIndex(k, clonedThis);
      });
    }

    clonedThis.mquery.sort(params);
    return _tunnelQueryCache(clonedThis);
  };

  _proto.limit = function limit(amount) {
    if (this.op === 'findOne') throw _rxError["default"].newRxError('QU6');else {
      var clonedThis = this._clone();

      clonedThis.mquery.limit(amount);
      return _tunnelQueryCache(clonedThis);
    }
  };

  (0, _createClass2["default"])(RxQuery, [{
    key: "$",
    get: function get() {
      var _this2 = this;

      if (!this._$) {
        /**
         * We use _resultsDocs$ to emit new results
         * This also ensure that there is a reemit on subscribe
         */
        var results$ = this._resultsDocs$.pipe((0, _operators.mergeMap)(function (docs) {
          return _ensureEqual(_this2).then(function (hasChanged) {
            if (hasChanged) return false; // wait for next emit
            else return docs;
          });
        }), (0, _operators.filter)(function (docs) {
          return !!docs;
        }), // not if previous returned false
        (0, _operators.map)(function (docs) {
          // findOne()-queries emit document or null
          if (_this2.op === 'findOne') {
            var doc = docs.length === 0 ? null : docs[0];
            return doc;
          } else return docs; // find()-queries emit RxDocument[]

        }), (0, _operators.map)(function (docs) {
          // copy the array so it wont matter if the user modifies it
          var ret = Array.isArray(docs) ? docs.slice() : docs;
          return ret;
        })).asObservable();
        /**
         * subscribe to the changeEvent-stream so it detects changed if it has subscribers
         */


        var changeEvents$ = this.collection.docChanges$.pipe((0, _operators.tap)(function () {
          return _ensureEqual(_this2);
        }), (0, _operators.filter)(function () {
          return false;
        }));
        this._$ = (0, _rxjs.merge)(results$, changeEvents$);
      }

      return this._$;
    }
  }]);
  return RxQuery;
}();

exports.RxQuery = RxQuery;

function _getDefaultQuery(collection) {
  var _ref6;

  return _ref6 = {}, _ref6[collection.schema.primaryPath] = {}, _ref6;
}
/**
 * run this query through the QueryCache
 * @return {RxQuery} can be this or another query with the equal state
 */


function _tunnelQueryCache(rxQuery) {
  return rxQuery.collection._queryCache.getByQuery(rxQuery);
}
/**
 * tunnel the proto-functions of mquery to RxQuery
 * @param  {any} rxQueryProto    [description]
 * @param  {string[]} mQueryProtoKeys [description]
 * @return {void}                 [description]
 */


function protoMerge(rxQueryProto, mQueryProtoKeys) {
  mQueryProtoKeys.filter(function (attrName) {
    return !attrName.startsWith('_');
  }).filter(function (attrName) {
    return !rxQueryProto[attrName];
  }).forEach(function (attrName) {
    rxQueryProto[attrName] = function (p1) {
      var clonedThis = this._clone();

      clonedThis.mquery[attrName](p1);
      return _tunnelQueryCache(clonedThis);
    };
  });
}

var protoMerged = false;

function create(op, queryObj, collection) {
  // checks
  if (queryObj && (0, _typeof2["default"])(queryObj) !== 'object') {
    throw _rxError["default"].newRxTypeError('QU7', {
      queryObj: queryObj
    });
  }

  if (Array.isArray(queryObj)) {
    throw _rxError["default"].newRxTypeError('QU8', {
      queryObj: queryObj
    });
  }

  var ret = new RxQuery(op, queryObj, collection); // ensure when created with same params, only one is created

  ret = _tunnelQueryCache(ret);

  if (!protoMerged) {
    protoMerged = true;
    protoMerge(Object.getPrototypeOf(ret), Object.getOwnPropertyNames(ret.mquery.__proto__));
  }

  (0, _hooks.runPluginHooks)('createRxQuery', ret);
  return ret;
}
/**
 * throws an error that says that the key is not in the schema
 */


function _throwNotInSchema(key) {
  throw _rxError["default"].newRxError('QU5', {
    key: key
  });
}
/**
 * adds the field of 'sort' to the search-index
 * @link https://github.com/nolanlawson/pouchdb-find/issues/204
 */


function _sortAddToIndex(checkParam, clonedThis) {
  var schemaObj = clonedThis.collection.schema.getSchemaByObjectPath(checkParam);
  if (!schemaObj) _throwNotInSchema(checkParam);

  switch (schemaObj.type) {
    case 'integer':
      // TODO change back to -Infinity when issue resolved
      // @link https://github.com/pouchdb/pouchdb/issues/6454
      clonedThis.mquery.where(checkParam).gt(-9999999999999999999999999999); // -Infinity does not work since pouchdb 6.2.0

      break;

    case 'string':
      /**
       * strings need an empty string, see
       * @link https://github.com/pubkey/rxdb/issues/585
       */
      clonedThis.mquery.where(checkParam).gt('');
      break;

    default:
      clonedThis.mquery.where(checkParam).gt(null);
      break;
  }
}
/**
 * check if the current results-state is in sync with the database
 * @return {Boolean} false if not which means it should re-execute
 */


function _isResultsInSync(rxQuery) {
  if (rxQuery._latestChangeEvent >= rxQuery.collection._changeEventBuffer.counter) return true;else return false;
}
/**
 * wraps __ensureEqual()
 * to ensure it does not run in parallel
 */


function _ensureEqual(rxQuery) {
  rxQuery._ensureEqualQueue = rxQuery._ensureEqualQueue.then(function () {
    return new Promise(function (res) {
      return setTimeout(res, 0);
    });
  }).then(function () {
    return __ensureEqual(rxQuery);
  }).then(function (ret) {
    return new Promise(function (res) {
      return setTimeout(res, 0);
    }).then(function () {
      return ret;
    });
  });
  return rxQuery._ensureEqualQueue;
}
/**
 * ensures that the results of this query is equal to the results which a query over the database would give
 * @return {Promise<boolean>|boolean} true if results have changed
 */


function __ensureEqual(rxQuery) {
  if (rxQuery.collection.database.destroyed) return false; // db is closed

  if (_isResultsInSync(rxQuery)) return false; // nothing happend

  var ret = false;
  var mustReExec = false; // if this becomes true, a whole execution over the database is made

  if (rxQuery._latestChangeEvent === -1) mustReExec = true; // have not executed yet -> must run

  /**
   * try to use the queryChangeDetector to calculate the new results
   */

  if (!mustReExec) {
    var missedChangeEvents = rxQuery.collection._changeEventBuffer.getFrom(rxQuery._latestChangeEvent + 1);

    if (missedChangeEvents === null) {
      // changeEventBuffer is of bounds -> we must re-execute over the database
      mustReExec = true;
    } else {
      rxQuery._latestChangeEvent = rxQuery.collection._changeEventBuffer.counter;

      var runChangeEvents = rxQuery.collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);

      var changeResult = rxQuery._queryChangeDetector.runChangeDetection(runChangeEvents);

      if (!Array.isArray(changeResult) && changeResult) {
        // could not calculate the new results, execute must be done
        mustReExec = true;
      }

      if (Array.isArray(changeResult) && !(0, _deepEqual["default"])(changeResult, rxQuery._resultsData)) {
        // we got the new results, we do not have to re-execute, mustReExec stays false
        ret = true; // true because results changed

        rxQuery._setResultData(changeResult);
      }
    }
  } // oh no we have to re-execute the whole query over the database


  if (mustReExec) {
    // counter can change while _execOverDatabase() is running so we save it here
    var latestAfter = rxQuery.collection._changeEventBuffer.counter;
    return rxQuery._execOverDatabase().then(function (newResultData) {
      rxQuery._latestChangeEvent = latestAfter;

      if (!(0, _deepEqual["default"])(newResultData, rxQuery._resultsData)) {
        ret = true; // true because results changed

        rxQuery._setResultData(newResultData);
      }

      return ret;
    });
  }

  return ret; // true if results have changed
}

function isInstanceOf(obj) {
  return obj instanceof RxQuery;
}

var _default = {
  create: create,
  RxQuery: RxQuery,
  isInstanceOf: isInstanceOf
};
exports["default"] = _default;
