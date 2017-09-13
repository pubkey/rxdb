import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import deepEqual from 'deep-equal';
import MQuery from './mquery/mquery';

import * as util from './util';
import QueryChangeDetector from './query-change-detector';
import RxError from './rx-error';
import { runPluginHooks } from './hooks';

var _queryCount = 0;
var newQueryID = function newQueryID() {
    return ++_queryCount;
};

export var RxQuery = function () {
    function RxQuery(op, queryObj, collection) {
        _classCallCheck(this, RxQuery);

        this.op = op;
        this.collection = collection;
        this.id = newQueryID();

        if (!queryObj) queryObj = this._defaultQuery();

        this.mquery = new MQuery(queryObj);

        this._queryChangeDetector = QueryChangeDetector.create(this);
        this._resultsData = null;
        this._results$ = new util.Rx.BehaviorSubject(null);
        this._latestChangeEvent = -1;
        this._runningPromise = Promise.resolve(true);

        /**
         * if this is true, the results-state is not equal to the database
         * which means that the query must run against the database again
         * @type {Boolean}
         */
        this._mustReExec = true;

        /**
         * counts how often the execution on the whole db was done
         * (used for tests and debugging)
         * @type {Number}
         */
        this._execOverDatabaseCount = 0;
    }

    RxQuery.prototype._defaultQuery = function _defaultQuery() {
        var _ref;

        return _ref = {}, _ref[this.collection.schema.primaryPath] = {}, _ref;
    };

    // returns a clone of this RxQuery


    RxQuery.prototype._clone = function _clone() {
        var cloned = new RxQuery(this.op, this._defaultQuery(), this.collection);
        cloned.mquery = this.mquery.clone();
        return cloned;
    };

    /**
     * run this query through the QueryCache
     * @return {RxQuery} can be this or another query with the equal state
     */


    RxQuery.prototype._tunnelQueryCache = function _tunnelQueryCache() {
        return this.collection._queryCache.getByQuery(this);
    };

    RxQuery.prototype.toString = function toString() {
        if (!this.stringRep) {
            var stringObj = util.sortObject({
                op: this.op,
                options: this.mquery.options,
                _conditions: this.mquery._conditions,
                _path: this.mquery._path,
                _fields: this.mquery._fields
            }, true);

            this.stringRep = JSON.stringify(stringObj, util.stringifyFilter);
        }
        return this.stringRep;
    };

    /**
     * ensures that the results of this query is equal to the results which a query over the database would give
     * @return {Promise<boolean>} true if results have changed
     */


    RxQuery.prototype._ensureEqual = function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
            var ret, resolve, missedChangeEvents, runChangeEvents, changeResult, latestAfter, newResultData;
            return _regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            if (!(this._latestChangeEvent >= this.collection._changeEventBuffer.counter)) {
                                _context.next = 2;
                                break;
                            }

                            return _context.abrupt('return', false);

                        case 2:
                            ret = false;

                            // make sure it does not run in parallel

                            _context.next = 5;
                            return this._runningPromise;

                        case 5:

                            // console.log('_ensureEqual(' + this.toString() + ') '+ this._mustReExec);

                            resolve = void 0;

                            this._runningPromise = new Promise(function (res) {
                                resolve = res;
                            });

                            if (this._mustReExec) {
                                _context.next = 21;
                                break;
                            }

                            missedChangeEvents = this.collection._changeEventBuffer.getFrom(this._latestChangeEvent + 1);

                            if (!(missedChangeEvents === null)) {
                                _context.next = 13;
                                break;
                            }

                            // out of bounds -> reExec
                            this._mustReExec = true;
                            _context.next = 21;
                            break;

                        case 13:
                            // console.dir(missedChangeEvents);
                            this._latestChangeEvent = this.collection._changeEventBuffer.counter;
                            runChangeEvents = this.collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);
                            changeResult = this._queryChangeDetector.runChangeDetection(runChangeEvents);

                            if (!Array.isArray(changeResult) && changeResult) this._mustReExec = true;

                            if (!(Array.isArray(changeResult) && !deepEqual(changeResult, this._resultsData))) {
                                _context.next = 21;
                                break;
                            }

                            ret = true;
                            _context.next = 21;
                            return this._setResultData(changeResult);

                        case 21:
                            if (!this._mustReExec) {
                                _context.next = 31;
                                break;
                            }

                            // counter can change while _execOverDatabase() is running
                            latestAfter = this.collection._changeEventBuffer.counter;
                            _context.next = 25;
                            return this._execOverDatabase();

                        case 25:
                            newResultData = _context.sent;

                            this._latestChangeEvent = latestAfter;

                            if (deepEqual(newResultData, this._resultsData)) {
                                _context.next = 31;
                                break;
                            }

                            ret = true;
                            _context.next = 31;
                            return this._setResultData(newResultData);

                        case 31:

                            // console.log('_ensureEqual DONE (' + this.toString() + ')');

                            resolve(true);
                            return _context.abrupt('return', ret);

                        case 33:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this);
        }));

        function _ensureEqual() {
            return _ref2.apply(this, arguments);
        }

        return _ensureEqual;
    }();

    RxQuery.prototype._setResultData = function _setResultData(newResultData) {
        var _this = this;

        this._resultsData = newResultData;
        return this.collection._createDocuments(this._resultsData).then(function (newResults) {
            return _this._results$.next(newResults);
        });
    };

    /**
     * executes the query on the database
     * @return {Promise<{}[]>} results-array with document-data
     */


    RxQuery.prototype._execOverDatabase = function _execOverDatabase() {
        var _this2 = this;

        this._execOverDatabaseCount++;

        var docsPromise = void 0;
        switch (this.op) {
            case 'find':
                docsPromise = this.collection._pouchFind(this);
                break;
            case 'findOne':
                docsPromise = this.collection._pouchFind(this, 1);
                break;
            default:
                throw new Error('RxQuery.exec(): op (' + this.op + ') not known');
        }

        return docsPromise.then(function (docsData) {
            _this2._mustReExec = false;
            return docsData;
        });
    };

    RxQuery.prototype.toJSON = function toJSON() {
        if (this._toJSON) return this._toJSON;

        var primPath = this.collection.schema.primaryPath;

        var json = {
            selector: this.mquery._conditions
        };

        var options = this.mquery._optionsForExec();

        // sort
        if (options.sort) {
            var sortArray = [];
            Object.keys(options.sort).map(function (fieldName) {
                var dirInt = options.sort[fieldName];
                var dir = 'asc';
                if (dirInt == -1) dir = 'desc';
                var pushMe = {};
                // TODO run primary-swap somewhere else
                if (fieldName == primPath) fieldName = '_id';

                pushMe[fieldName] = dir;
                sortArray.push(pushMe);
            });
            json.sort = sortArray;
        } else {
            // sort by primaryKey as default
            // (always use _id because there is no primary-swap on json.sort)
            json.sort = [{
                _id: 'asc'
            }];
        }

        if (options.limit) {
            if (typeof options.limit !== 'number') throw new TypeError('limit() must get a number');
            json.limit = options.limit;
        }

        if (options.skip) {
            if (typeof options.skip !== 'number') throw new TypeError('skip() must get a number');
            json.skip = options.skip;
        }

        // add not-query to _id to prevend the grabbing of '_design..' docs
        // this is not the best solution because it prevents the usage of a 'language'-field
        if (!json.selector.language) json.selector.language = {};
        json.selector.language.$ne = 'query';

        // strip empty selectors
        Object.entries(json.selector).filter(function (entry) {
            return typeof entry[1] === 'object';
        }).filter(function (entry) {
            return entry[1] != null;
        }).filter(function (entry) {
            return Object.keys(entry[1]) == 0;
        }).forEach(function (entry) {
            return delete json.selector[entry[0]];
        });

        // primary swap
        if (primPath != '_id' && json.selector[primPath]) {
            // selector
            json.selector._id = json.selector[primPath];
            delete json.selector[primPath];
        }

        this._toJSON = json;
        return this._toJSON;
    };

    /**
     * get the key-compression version of this query
     * @return {{selector: {}, sort: []}} compressedQuery
     */
    RxQuery.prototype.keyCompress = function keyCompress() {
        if (!this.collection.schema.doKeyCompression()) return this.toJSON();else {
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


    RxQuery.prototype.remove = function remove() {
        var ret = void 0;
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


    RxQuery.prototype.update = function update() {
        throw RxError.pluginMissing('update');
    };

    /**
     * execute the query
     * @return {Promise<RxDocument|RxDocument[]>} found documents
     */


    RxQuery.prototype.exec = function exec() {
        return this.$.first().toPromise();
    };

    /**
     * regex cannot run on primary _id
     * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
     */


    RxQuery.prototype.regex = function regex(params) {
        var clonedThis = this._clone();

        if (this.mquery._path == this.collection.schema.primaryPath) throw new Error('You cannot use .regex() on the primary field \'' + this.mquery._path + '\'');

        clonedThis.mquery.regex(params);
        return clonedThis._tunnelQueryCache();
    };

    /**
     * make sure it searches index because of pouchdb-find bug
     * @link https://github.com/nolanlawson/pouchdb-find/issues/204
     */
    RxQuery.prototype.sort = function sort(params) {
        var throwNotInSchema = function throwNotInSchema(key) {
            throw new Error('RxQuery.sort(' + key + ') does not work because ' + key + ' is not defined in the schema');
        };
        var clonedThis = this._clone();

        // workarround because sort wont work on unused keys
        if (typeof params !== 'object') {
            var checkParam = params.charAt(0) == '-' ? params.substring(1) : params;
            if (!clonedThis.mquery._conditions[checkParam]) {
                var schemaObj = clonedThis.collection.schema.getSchemaByObjectPath(checkParam);
                if (!schemaObj) throwNotInSchema(checkParam);

                if (schemaObj.type == 'integer')
                    // TODO change back to -Infinity when issue resolved
                    // @link https://github.com/pouchdb/pouchdb/issues/6454
                    clonedThis.mquery.where(checkParam).gt(-9999999999999999999999999999); // -Infinity does not work since pouchdb 6.2.0
                else clonedThis.mquery.where(checkParam).gt(null);
            }
        } else {
            Object.keys(params).filter(function (k) {
                return !clonedThis.mquery._conditions[k] || !clonedThis.mquery._conditions[k].$gt;
            }).forEach(function (k) {
                var schemaObj = clonedThis.collection.schema.getSchemaByObjectPath(k);
                if (!schemaObj) throwNotInSchema(k);

                if (schemaObj.type == 'integer')
                    // TODO change back to -Infinity when issue resolved
                    // @link https://github.com/pouchdb/pouchdb/issues/6454
                    clonedThis.mquery.where(k).gt(-9999999999999999999999999999); // -Infinity does not work since pouchdb 6.2.0

                else clonedThis.mquery.where(k).gt(null);
            });
        }
        clonedThis.mquery.sort(params);
        return clonedThis._tunnelQueryCache();
    };

    RxQuery.prototype.limit = function limit(amount) {
        if (this.op == 'findOne') throw new Error('.limit() cannot be called on .findOne()');else {
            var clonedThis = this._clone();
            clonedThis.mquery.limit(amount);
            return clonedThis._tunnelQueryCache();
        }
    };

    _createClass(RxQuery, [{
        key: '$',
        get: function get() {
            var _this3 = this;

            if (!this._$) {
                var res$ = this._results$.mergeMap(function (results) {
                    return _this3._ensureEqual().then(function (hasChanged) {
                        if (hasChanged) return 'WAITFORNEXTEMIT';else return results;
                    });
                }).filter(function (results) {
                    return results != 'WAITFORNEXTEMIT';
                }).asObservable();

                var changeEvents$ = this.collection.$.filter(function (cEvent) {
                    return ['INSERT', 'UPDATE', 'REMOVE'].includes(cEvent.data.op);
                }).mergeMap(_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
                    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                        while (1) {
                            switch (_context2.prev = _context2.next) {
                                case 0:
                                    return _context2.abrupt('return', _this3._ensureEqual());

                                case 1:
                                case 'end':
                                    return _context2.stop();
                            }
                        }
                    }, _callee2, _this3);
                }))).filter(function () {
                    return false;
                });

                this._$ = util.Rx.Observable.merge(res$, changeEvents$).filter(function (x) {
                    return x != null;
                }).map(function (results) {
                    if (_this3.op != 'findOne') return results;else if (results.length == 0) return null;else return results[0];
                });
            }
            return this._$;
        }
    }]);

    return RxQuery;
}();

/**
 * tunnel the proto-functions of mquery to RxQuery
 * @param  {any} rxQueryProto    [description]
 * @param  {string[]} mQueryProtoKeys [description]
 * @return {void}                 [description]
 */
var protoMerge = function protoMerge(rxQueryProto, mQueryProtoKeys) {
    mQueryProtoKeys.filter(function (attrName) {
        return !attrName.startsWith('_');
    }).filter(function (attrName) {
        return !rxQueryProto[attrName];
    }).forEach(function (attrName) {
        rxQueryProto[attrName] = function (p1) {
            var clonedThis = this._clone();
            clonedThis.mquery[attrName](p1);
            return clonedThis._tunnelQueryCache();
        };
    });
};

var protoMerged = false;
export function create(op, queryObj, collection) {
    if (queryObj && typeof queryObj !== 'object') throw new TypeError('query must be an object');
    if (Array.isArray(queryObj)) throw new TypeError('query cannot be an array');

    var ret = new RxQuery(op, queryObj, collection);

    if (!protoMerged) {
        protoMerged = true;
        protoMerge(Object.getPrototypeOf(ret), Object.getOwnPropertyNames(ret.mquery.__proto__));
    }

    runPluginHooks('createRxQuery', ret);
    return ret;
}

export function isInstanceOf(obj) {
    return obj instanceof RxQuery;
}

export default {
    create: create,
    RxQuery: RxQuery,
    isInstanceOf: isInstanceOf
};