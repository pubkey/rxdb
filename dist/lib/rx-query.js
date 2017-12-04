'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxQuery = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;
exports.isInstanceOf = isInstanceOf;

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

var _customIdleQueue = require('custom-idle-queue');

var _customIdleQueue2 = _interopRequireDefault(_customIdleQueue);

var _mquery = require('./mquery/mquery');

var _mquery2 = _interopRequireDefault(_mquery);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _queryChangeDetector = require('./query-change-detector');

var _queryChangeDetector2 = _interopRequireDefault(_queryChangeDetector);

var _rxError = require('./rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _hooks = require('./hooks');

var _merge = require('rxjs/observable/merge');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

var _mergeMap = require('rxjs/operators/mergeMap');

var _filter = require('rxjs/operators/filter');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _queryCount = 0;
var newQueryID = function newQueryID() {
    return ++_queryCount;
};

var RxQuery = exports.RxQuery = function () {
    function RxQuery(op, queryObj, collection) {
        (0, _classCallCheck3['default'])(this, RxQuery);

        this.op = op;
        this.collection = collection;
        this.id = newQueryID();
        if (!queryObj) queryObj = this._defaultQuery();
        this.mquery = new _mquery2['default'](queryObj);
        this._queryChangeDetector = _queryChangeDetector2['default'].create(this);

        this._resultsData = null;
        this._results$ = new _BehaviorSubject.BehaviorSubject(null);
        this._latestChangeEvent = -1;

        /**
         * counts how often the execution on the whole db was done
         * (used for tests and debugging)
         * @type {Number}
         */
        this._execOverDatabaseCount = 0;
    }

    (0, _createClass3['default'])(RxQuery, [{
        key: '_defaultQuery',
        value: function _defaultQuery() {
            return (0, _defineProperty3['default'])({}, this.collection.schema.primaryPath, {});
        }

        // returns a clone of this RxQuery

    }, {
        key: '_clone',
        value: function _clone() {
            var cloned = new RxQuery(this.op, this._defaultQuery(), this.collection);
            cloned.mquery = this.mquery.clone();
            return cloned;
        }

        /**
         * run this query through the QueryCache
         * @return {RxQuery} can be this or another query with the equal state
         */

    }, {
        key: '_tunnelQueryCache',
        value: function _tunnelQueryCache() {
            return this.collection._queryCache.getByQuery(this);
        }
    }, {
        key: 'toString',
        value: function toString() {
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
        }

        /**
         * check if the current results-state is in sync with the database
         * @return {Boolean} false if not which means it should re-execute
         */

    }, {
        key: '_isResultsInSync',
        value: function _isResultsInSync() {
            if (this._latestChangeEvent >= this.collection._changeEventBuffer.counter) return true;else return false;
        }
    }, {
        key: '_ensureEqual',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
                var _this = this;

                var ret;
                return _regenerator2['default'].wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return this._ensureEqualQueue.requestIdlePromise();

                            case 2:
                                _context.next = 4;
                                return this._ensureEqualQueue.wrapCall(function () {
                                    return _this.__ensureEqual();
                                });

                            case 4:
                                ret = _context.sent;
                                return _context.abrupt('return', ret);

                            case 6:
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
        }()

        /**
         * ensures that the results of this query is equal to the results which a query over the database would give
         * @return {Promise<boolean>} true if results have changed
         */

    }, {
        key: '__ensureEqual',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2() {
                var ret, mustReExec, missedChangeEvents, runChangeEvents, changeResult, latestAfter, newResultData;
                return _regenerator2['default'].wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                ret = false;

                                if (!this._isResultsInSync()) {
                                    _context2.next = 3;
                                    break;
                                }

                                return _context2.abrupt('return', false);

                            case 3:
                                // nothing happend


                                mustReExec = false; // if this becomes true, a whole execution over the database is made

                                if (this._latestChangeEvent === -1) mustReExec = true;

                                /**
                                 * try to use the queryChangeDetector to calculate the new results
                                 */

                                if (mustReExec) {
                                    _context2.next = 19;
                                    break;
                                }

                                missedChangeEvents = this.collection._changeEventBuffer.getFrom(this._latestChangeEvent + 1);

                                if (!(missedChangeEvents === null)) {
                                    _context2.next = 11;
                                    break;
                                }

                                // changeEventBuffer is of bounds -> we must re-execute over the database
                                mustReExec = true;
                                _context2.next = 19;
                                break;

                            case 11:
                                this._latestChangeEvent = this.collection._changeEventBuffer.counter;
                                runChangeEvents = this.collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);
                                changeResult = this._queryChangeDetector.runChangeDetection(runChangeEvents);


                                if (!Array.isArray(changeResult) && changeResult) {
                                    // could not calculate the new results, execute must be done
                                    mustReExec = true;
                                }

                                if (!(Array.isArray(changeResult) && !(0, _deepEqual2['default'])(changeResult, this._resultsData))) {
                                    _context2.next = 19;
                                    break;
                                }

                                // we got the new results, we do not have to re-execute, mustReExec stays false
                                ret = true; // true because results changed
                                _context2.next = 19;
                                return this._setResultData(changeResult);

                            case 19:
                                if (!mustReExec) {
                                    _context2.next = 29;
                                    break;
                                }

                                // counter can change while _execOverDatabase() is running so we save it here
                                latestAfter = this.collection._changeEventBuffer.counter;
                                _context2.next = 23;
                                return this._execOverDatabase();

                            case 23:
                                newResultData = _context2.sent;

                                this._latestChangeEvent = latestAfter;

                                if ((0, _deepEqual2['default'])(newResultData, this._resultsData)) {
                                    _context2.next = 29;
                                    break;
                                }

                                ret = true; // true because results changed
                                _context2.next = 29;
                                return this._setResultData(newResultData);

                            case 29:
                                return _context2.abrupt('return', ret);

                            case 30:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function __ensureEqual() {
                return _ref3.apply(this, arguments);
            }

            return __ensureEqual;
        }()
    }, {
        key: '_setResultData',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3(newResultData) {
                var docs, newResultDocs;
                return _regenerator2['default'].wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                this._resultsData = newResultData;

                                _context3.next = 3;
                                return this.collection._createDocuments(this._resultsData);

                            case 3:
                                docs = _context3.sent;
                                newResultDocs = docs;

                                if (this.op === 'findOne') {
                                    if (docs.length === 0) newResultDocs = null;else newResultDocs = docs[0];
                                }

                                this._results$.next(newResultDocs);

                            case 7:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function _setResultData(_x) {
                return _ref4.apply(this, arguments);
            }

            return _setResultData;
        }()

        /**
         * executes the query on the database
         * @return {Promise<{}[]>} results-array with document-data
         */

    }, {
        key: '_execOverDatabase',
        value: function _execOverDatabase() {
            this._execOverDatabaseCount = this._execOverDatabaseCount + 1;

            var docsPromise = void 0;
            switch (this.op) {
                case 'find':
                    docsPromise = this.collection._pouchFind(this);
                    break;
                case 'findOne':
                    docsPromise = this.collection._pouchFind(this, 1);
                    break;
                default:
                    throw _rxError2['default'].newRxError('QU1', {
                        op: this.op
                    });
            }
            return docsPromise;
        }
    }, {
        key: 'toJSON',
        value: function toJSON() {
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
                    if (dirInt === -1) dir = 'desc';
                    var pushMe = {};
                    // TODO run primary-swap somewhere else
                    if (fieldName === primPath) fieldName = '_id';

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
                if (typeof options.limit !== 'number') {
                    throw _rxError2['default'].newRxTypeError('QU2', {
                        limit: options.limit
                    });
                }
                json.limit = options.limit;
            }

            if (options.skip) {
                if (typeof options.skip !== 'number') {
                    throw _rxError2['default'].newRxTypeError('QU3', {
                        skip: options.skip
                    });
                }
                json.skip = options.skip;
            }

            // add not-query to _id to prevend the grabbing of '_design..' docs
            // this is not the best solution because it prevents the usage of a 'language'-field
            if (!json.selector.language) json.selector.language = {};
            json.selector.language.$ne = 'query';

            // strip empty selectors
            Object.entries(json.selector).filter(function (entry) {
                return (0, _typeof3['default'])(entry[1]) === 'object';
            }).filter(function (entry) {
                return entry[1] !== null;
            }).filter(function (entry) {
                return !Array.isArray(entry[1]);
            }).filter(function (entry) {
                return Object.keys(entry[1]).length === 0;
            }).forEach(function (entry) {
                return delete json.selector[entry[0]];
            });

            // primary swap
            if (primPath !== '_id' && json.selector[primPath]) {
                // selector
                json.selector._id = json.selector[primPath];
                delete json.selector[primPath];
            }

            this._toJSON = json;
            return this._toJSON;
        }
    }, {
        key: 'keyCompress',


        /**
         * get the key-compression version of this query
         * @return {{selector: {}, sort: []}} compressedQuery
         */
        value: function keyCompress() {
            if (!this.collection.schema.doKeyCompression()) return this.toJSON();else {
                if (!this._keyCompress) {
                    this._keyCompress = this.collection._keyCompressor.compressQuery(this.toJSON());
                }
                return this._keyCompress;
            }
        }

        /**
         * deletes all found documents
         * @return {Promise(RxDocument|RxDocument[])} promise with deleted documents
         */

    }, {
        key: 'remove',
        value: function remove() {
            var ret = void 0;
            return this.exec().then(function (docs) {
                ret = docs;
                if (Array.isArray(docs)) return Promise.all(docs.map(function (doc) {
                    return doc.remove();
                }));else return docs.remove();
            }).then(function () {
                return ret;
            });
        }

        /**
         * updates all found documents
         * @overwritten by plugin (optinal)
         * @param  {object} updateObj
         * @return {Promise(RxDocument|RxDocument[])} promise with updated documents
         */

    }, {
        key: 'update',
        value: function update() {
            throw _rxError2['default'].pluginMissing('update');
        }

        /**
         * execute the query
         * @return {Promise<RxDocument|RxDocument[]>} found documents
         */

    }, {
        key: 'exec',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4() {
                var changed;
                return _regenerator2['default'].wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                changed = true;

                                // we run _ensureEqual() until we are in sync with the database-state

                            case 1:
                                if (!changed) {
                                    _context4.next = 7;
                                    break;
                                }

                                _context4.next = 4;
                                return this._ensureEqual();

                            case 4:
                                changed = _context4.sent;
                                _context4.next = 1;
                                break;

                            case 7:
                                return _context4.abrupt('return', this._results$.getValue());

                            case 8:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function exec() {
                return _ref5.apply(this, arguments);
            }

            return exec;
        }()

        /**
         * regex cannot run on primary _id
         * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
         */

    }, {
        key: 'regex',
        value: function regex(params) {
            var clonedThis = this._clone();

            if (this.mquery._path === this.collection.schema.primaryPath) {
                throw _rxError2['default'].newRxError('QU4', {
                    path: this.mquery._path
                });
            }

            clonedThis.mquery.regex(params);
            return clonedThis._tunnelQueryCache();
        }
    }, {
        key: 'sort',


        /**
         * make sure it searches index because of pouchdb-find bug
         * @link https://github.com/nolanlawson/pouchdb-find/issues/204
         */
        value: function sort(params) {
            var throwNotInSchema = function throwNotInSchema(key) {
                throw _rxError2['default'].newRxError('QU5', {
                    key: key
                });
            };
            var clonedThis = this._clone();

            // workarround because sort wont work on unused keys
            if ((typeof params === 'undefined' ? 'undefined' : (0, _typeof3['default'])(params)) !== 'object') {
                var checkParam = params.charAt(0) === '-' ? params.substring(1) : params;
                if (!clonedThis.mquery._conditions[checkParam]) {
                    var schemaObj = clonedThis.collection.schema.getSchemaByObjectPath(checkParam);
                    if (!schemaObj) throwNotInSchema(checkParam);

                    if (schemaObj.type === 'integer')
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

                    if (schemaObj.type === 'integer')
                        // TODO change back to -Infinity when issue resolved
                        // @link https://github.com/pouchdb/pouchdb/issues/6454
                        clonedThis.mquery.where(k).gt(-9999999999999999999999999999); // -Infinity does not work since pouchdb 6.2.0

                    else clonedThis.mquery.where(k).gt(null);
                });
            }
            clonedThis.mquery.sort(params);
            return clonedThis._tunnelQueryCache();
        }
    }, {
        key: 'limit',
        value: function limit(amount) {
            if (this.op === 'findOne') throw _rxError2['default'].newRxError('QU6');else {
                var clonedThis = this._clone();
                clonedThis.mquery.limit(amount);
                return clonedThis._tunnelQueryCache();
            }
        }
    }, {
        key: '_ensureEqualQueue',
        get: function get() {
            if (!this.__ensureEqualQueue) this.__ensureEqualQueue = new _customIdleQueue2['default']();
            return this.__ensureEqualQueue;
        }
    }, {
        key: '$',
        get: function get() {
            var _this2 = this;

            if (!this._$) {
                // use results$ to emit new results
                var res$ = this._results$.pipe(
                // whe run _ensureEqual() on each subscription
                // to ensure it triggers a re-run when subscribing after some time
                (0, _mergeMap.mergeMap)(function () {
                    var _ref6 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee5(results) {
                        var hasChanged;
                        return _regenerator2['default'].wrap(function _callee5$(_context5) {
                            while (1) {
                                switch (_context5.prev = _context5.next) {
                                    case 0:
                                        _context5.next = 2;
                                        return _this2._ensureEqual();

                                    case 2:
                                        hasChanged = _context5.sent;

                                        if (!hasChanged) {
                                            _context5.next = 7;
                                            break;
                                        }

                                        return _context5.abrupt('return', 'WAITFORNEXTEMIT');

                                    case 7:
                                        return _context5.abrupt('return', results);

                                    case 8:
                                    case 'end':
                                        return _context5.stop();
                                }
                            }
                        }, _callee5, _this2);
                    }));

                    return function (_x2) {
                        return _ref6.apply(this, arguments);
                    };
                }()), (0, _filter.filter)(function (results) {
                    return results !== 'WAITFORNEXTEMIT';
                })).asObservable();

                // we also subscribe to the changeEvent-stream so it detects changed if it has subscribers
                var changeEvents$ = this.collection.$.pipe((0, _filter.filter)(function (cEvent) {
                    return ['INSERT', 'UPDATE', 'REMOVE'].includes(cEvent.data.op);
                }), (0, _filter.filter)(function () {
                    _this2._ensureEqual();
                    return false;
                }));

                this._$ = (0, _merge.merge)(res$, changeEvents$);
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
function create(op, queryObj, collection) {
    // checks
    if (queryObj && (typeof queryObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(queryObj)) !== 'object') {
        throw _rxError2['default'].newRxTypeError('QU7', {
            queryObj: queryObj
        });
    }
    if (Array.isArray(queryObj)) {
        throw _rxError2['default'].newRxTypeError('QU8', {
            queryObj: queryObj
        });
    }

    var ret = new RxQuery(op, queryObj, collection);
    // ensure when created with same params, only one is created
    ret = ret._tunnelQueryCache();

    if (!protoMerged) {
        protoMerged = true;
        protoMerge(Object.getPrototypeOf(ret), Object.getOwnPropertyNames(ret.mquery.__proto__));
    }

    (0, _hooks.runPluginHooks)('createRxQuery', ret);
    return ret;
}

function isInstanceOf(obj) {
    return obj instanceof RxQuery;
}

exports['default'] = {
    create: create,
    RxQuery: RxQuery,
    isInstanceOf: isInstanceOf
};
