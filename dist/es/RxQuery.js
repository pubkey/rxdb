import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import deepEqual from 'deep-equal';
import MQuery from './mquery/mquery';
import clone from 'clone';

import * as util from './util';
import * as RxDocument from './RxDocument';
import * as QueryChangeDetector from './QueryChangeDetector';

var _queryCount = 0;
var newQueryID = function newQueryID() {
    return ++_queryCount;
};

var RxQuery = function () {
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
        this._observable$ = null;
        this._latestChangeEvent = -1;
        this._runningPromise = Promise.resolve(true);

        /**
         * if this is true, the results-state is not equal to the database
         * which means that the query must run agains the database again
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
        var _ref2 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee() {
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
                                _context.next = 25;
                                break;
                            }

                            _context.prev = 8;
                            missedChangeEvents = this.collection._changeEventBuffer.getFrom(this._latestChangeEvent + 1);
                            // console.dir(missedChangeEvents);

                            this._latestChangeEvent = this.collection._changeEventBuffer.counter;
                            runChangeEvents = this.collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);
                            changeResult = this._queryChangeDetector.runChangeDetection(runChangeEvents);

                            if (!Array.isArray(changeResult) && changeResult) this._mustReExec = true;

                            if (!(Array.isArray(changeResult) && !deepEqual(changeResult, this._resultsData))) {
                                _context.next = 18;
                                break;
                            }

                            ret = true;
                            _context.next = 18;
                            return this._setResultData(changeResult);

                        case 18:
                            _context.next = 25;
                            break;

                        case 20:
                            _context.prev = 20;
                            _context.t0 = _context['catch'](8);

                            console.error('RxQuery()._ensureEqual(): Unexpected Error:');
                            console.dir(_context.t0);
                            this._mustReExec = true;

                        case 25:
                            if (!this._mustReExec) {
                                _context.next = 35;
                                break;
                            }

                            // counter can change while _execOverDatabase() is running
                            latestAfter = this.collection._changeEventBuffer.counter;
                            _context.next = 29;
                            return this._execOverDatabase();

                        case 29:
                            newResultData = _context.sent;

                            this._latestChangeEvent = latestAfter;

                            if (deepEqual(newResultData, this._resultsData)) {
                                _context.next = 35;
                                break;
                            }

                            ret = true;
                            _context.next = 35;
                            return this._setResultData(newResultData);

                        case 35:

                            // console.log('_ensureEqual DONE (' + this.toString() + ')');

                            resolve(true);
                            return _context.abrupt('return', ret);

                        case 37:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this, [[8, 20]]);
        }));

        function _ensureEqual() {
            return _ref2.apply(this, arguments);
        }

        return _ensureEqual;
    }();

    RxQuery.prototype._setResultData = function () {
        var _ref3 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee2(newResultData) {
            var newResults;
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            this._resultsData = newResultData;
                            _context2.next = 3;
                            return this.collection._createDocuments(this._resultsData);

                        case 3:
                            newResults = _context2.sent;

                            this._results$.next(newResults);

                        case 5:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));

        function _setResultData(_x) {
            return _ref3.apply(this, arguments);
        }

        return _setResultData;
    }();

    /**
     * executes the query on the database
     * @return {Promise<{}[]>} returns new resultData
     */


    RxQuery.prototype._execOverDatabase = function () {
        var _ref4 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee3() {
            var docsData, ret;
            return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            this._execOverDatabaseCount++;
                            docsData = void 0, ret = void 0;
                            _context3.t0 = this.op;
                            _context3.next = _context3.t0 === 'find' ? 5 : _context3.t0 === 'findOne' ? 9 : 13;
                            break;

                        case 5:
                            _context3.next = 7;
                            return this.collection._pouchFind(this);

                        case 7:
                            docsData = _context3.sent;
                            return _context3.abrupt('break', 14);

                        case 9:
                            _context3.next = 11;
                            return this.collection._pouchFind(this, 1);

                        case 11:
                            docsData = _context3.sent;
                            return _context3.abrupt('break', 14);

                        case 13:
                            throw new Error('RxQuery.exec(): op (' + this.op + ') not known');

                        case 14:

                            this._mustReExec = false;
                            return _context3.abrupt('return', docsData);

                        case 16:
                        case 'end':
                            return _context3.stop();
                    }
                }
            }, _callee3, this);
        }));

        function _execOverDatabase() {
            return _ref4.apply(this, arguments);
        }

        return _execOverDatabase;
    }();

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
        Object.entries(json.selector).forEach(function (entry) {
            var key = entry[0];
            var select = entry[1];
            if (typeof select === 'object' && Object.keys(select) == 0) delete json.selector[key];
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
        return this.collection._keyCompressor.compressQuery(this.toJSON());
    };

    /**
     * deletes all found documents
     * @return {Promise(RxDocument|RxDocument[])} promise with deleted documents
     */


    RxQuery.prototype.remove = function () {
        var _ref5 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee4() {
            var docs;
            return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            _context4.next = 2;
                            return this.exec();

                        case 2:
                            docs = _context4.sent;

                            if (!Array.isArray(docs)) {
                                _context4.next = 8;
                                break;
                            }

                            _context4.next = 6;
                            return Promise.all(docs.map(function (doc) {
                                return doc.remove();
                            }));

                        case 6:
                            _context4.next = 10;
                            break;

                        case 8:
                            _context4.next = 10;
                            return docs.remove();

                        case 10:
                            return _context4.abrupt('return', docs);

                        case 11:
                        case 'end':
                            return _context4.stop();
                    }
                }
            }, _callee4, this);
        }));

        function remove() {
            return _ref5.apply(this, arguments);
        }

        return remove;
    }();

    /**
     * updates all found documents
     * @param  {object} updateObj
     * @return {Promise(RxDocument|RxDocument[])} promise with updated documents
     */


    RxQuery.prototype.update = function () {
        var _ref6 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee5(updateObj) {
            var docs;
            return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            _context5.next = 2;
                            return this.exec();

                        case 2:
                            docs = _context5.sent;

                            if (docs) {
                                _context5.next = 5;
                                break;
                            }

                            return _context5.abrupt('return', null);

                        case 5:
                            if (!Array.isArray(docs)) {
                                _context5.next = 10;
                                break;
                            }

                            _context5.next = 8;
                            return Promise.all(docs.map(function (doc) {
                                return doc.update(updateObj);
                            }));

                        case 8:
                            _context5.next = 12;
                            break;

                        case 10:
                            _context5.next = 12;
                            return docs.update(updateObj);

                        case 12:
                            return _context5.abrupt('return', docs);

                        case 13:
                        case 'end':
                            return _context5.stop();
                    }
                }
            }, _callee5, this);
        }));

        function update(_x2) {
            return _ref6.apply(this, arguments);
        }

        return update;
    }();

    RxQuery.prototype.exec = function () {
        var _ref7 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee6() {
            return _regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            _context6.next = 2;
                            return this.$.first().toPromise();

                        case 2:
                            return _context6.abrupt('return', _context6.sent);

                        case 3:
                        case 'end':
                            return _context6.stop();
                    }
                }
            }, _callee6, this);
        }));

        function exec() {
            return _ref7.apply(this, arguments);
        }

        return exec;
    }();

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
            var _this = this;

            if (!this._observable$) {

                var res$ = this._results$.mergeMap(function () {
                    var _ref8 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee7(results) {
                        var hasChanged;
                        return _regeneratorRuntime.wrap(function _callee7$(_context7) {
                            while (1) {
                                switch (_context7.prev = _context7.next) {
                                    case 0:
                                        _context7.next = 2;
                                        return _this._ensureEqual();

                                    case 2:
                                        hasChanged = _context7.sent;

                                        if (!hasChanged) {
                                            _context7.next = 5;
                                            break;
                                        }

                                        return _context7.abrupt('return', 'WAITFORNEXTEMIT');

                                    case 5:
                                        return _context7.abrupt('return', results);

                                    case 6:
                                    case 'end':
                                        return _context7.stop();
                                }
                            }
                        }, _callee7, _this);
                    }));

                    return function (_x3) {
                        return _ref8.apply(this, arguments);
                    };
                }()).filter(function (results) {
                    return results != 'WAITFORNEXTEMIT';
                }).asObservable();

                var changeEvents$ = this.collection.$.filter(function (cEvent) {
                    return ['INSERT', 'UPDATE', 'REMOVE'].includes(cEvent.data.op);
                }).mergeMap(function () {
                    var _ref9 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee8(changeEvent) {
                        return _regeneratorRuntime.wrap(function _callee8$(_context8) {
                            while (1) {
                                switch (_context8.prev = _context8.next) {
                                    case 0:
                                        return _context8.abrupt('return', _this._ensureEqual());

                                    case 1:
                                    case 'end':
                                        return _context8.stop();
                                }
                            }
                        }, _callee8, _this);
                    }));

                    return function (_x4) {
                        return _ref9.apply(this, arguments);
                    };
                }()).filter(function () {
                    return false;
                });

                this._observable$ = util.Rx.Observable.merge(res$, changeEvents$).filter(function (x) {
                    return x != null;
                }).map(function (results) {
                    if (_this.op != 'findOne') return results;else if (results.length == 0) return null;else return results[0];
                });
            }
            return this._observable$;
        }
    }]);

    return RxQuery;
}();

// tunnel the proto-functions of mquery to RxQuery


var protoMerge = function protoMerge(rxQueryProto, mQueryProto) {
    Object.keys(mQueryProto).filter(function (attrName) {
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
        protoMerge(Object.getPrototypeOf(ret), Object.getPrototypeOf(ret.mquery));
    }

    return ret;
}

export function isInstanceOf(obj) {
    return obj instanceof RxQuery;
}