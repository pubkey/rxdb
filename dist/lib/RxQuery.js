'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;

var _mquery = require('./mquery/mquery');

var _mquery2 = _interopRequireDefault(_mquery);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _RxDocument = require('./RxDocument');

var RxDocument = _interopRequireWildcard(_RxDocument);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultQuery = {
    _id: {}
}; /**
    * this is the query-builder
    * it basically uses mquery with a few overwrites
    */

var RxQuery = function () {
    function RxQuery(queryObj, collection) {
        var _this = this;

        (0, _classCallCheck3.default)(this, RxQuery);

        this.collection = collection;

        this.defaultQuery = false;
        if (!queryObj || Object.keys(queryObj).length === 0 && !Array.isArray(queryObj)) {
            queryObj = defaultQuery;
            this.defaultQuery = true;
        }

        this.mquery = (0, _mquery2.default)(queryObj);

        // merge mquery-prototype functions to this
        var mquery_proto = Object.getPrototypeOf(this.mquery);
        Object.keys(mquery_proto).forEach(function (attrName) {

            if (['select'].includes(attrName)) return;

            // only param1 is tunneled here on purpose so no callback-call can be done
            _this[attrName] = function (param1) {
                _this.mquery[attrName](param1);
                return _this;
            };
        });

        // overwrites

        /**
         * make sure it searches index because of pouchdb-find bug
         * @link https://github.com/nolanlawson/pouchdb-find/issues/204
         */
        this.sort = function (params) {

            // workarround because sort wont work on unused keys
            if ((typeof params === 'undefined' ? 'undefined' : (0, _typeof3.default)(params)) !== 'object') _this.mquery.where(params).gt(null);else Object.keys(params).map(function (k) {
                return _this.mquery.where(k).gt(null);
            });

            _this.mquery.sort(params);
            return _this;
        };

        /**
         * regex cannot run on primary _id
         * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
         */
        this.regex = function (params) {
            if (_this.mquery._path == _this.collection.schema.primaryPath) throw new Error('You cannot use .regex() on the primary field \'' + _this.mquery._path + '\'');

            _this.mquery.regex(params);
            return _this;
        };
    }

    // observe the result of this query


    (0, _createClass3.default)(RxQuery, [{
        key: 'toJSON',
        value: function toJSON() {
            var _this2 = this;

            var json = {
                selector: this.mquery._conditions
            };

            var options = this.mquery._optionsForExec();

            // sort
            if (options.sort) {
                (function () {
                    var sortArray = [];
                    Object.keys(options.sort).map(function (fieldName) {
                        var dirInt = options.sort[fieldName];
                        var dir = 'asc';
                        if (dirInt == -1) dir = 'desc';
                        var pushMe = {};
                        // TODO run primary-swap somewhere else
                        if (fieldName == _this2.collection.schema.primaryPath) fieldName = '_id';

                        pushMe[fieldName] = dir;
                        sortArray.push(pushMe);
                    });
                    json.sort = sortArray;
                })();
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

            // primary swap
            if (this.collection.schema.primaryPath && json.selector[this.collection.schema.primaryPath]) {
                var primPath = this.collection.schema.primaryPath;

                // selector
                json.selector._id = json.selector[primPath];
                delete json.selector[primPath];
            }

            return json;
        }
    }, {
        key: 'keyCompress',


        /**
         * get the key-compression version of this query
         * @return {{selector: {}, sort: []}} compressedQuery
         */
        value: function keyCompress() {
            return this.collection.keyCompressor.compressQuery(this.toJSON());
        }
    }, {
        key: '$',
        get: function get() {
            var _this3 = this;

            if (!this._subject) {
                this._subject = new util.Rx.BehaviorSubject(null);
                this._obsRunning = false;
                var collection$ = this.collection.$.filter(function (cEvent) {
                    return ['RxCollection.insert', 'RxDocument.save', 'RxDocument.remove'].includes(cEvent.data.op);
                }).startWith(1).filter(function (x) {
                    return !_this3._obsRunning;
                }).do(function (x) {
                    return _this3._obsRunning = true;
                }).mergeMap(function () {
                    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(cEvent) {
                        var docs;
                        return _regenerator2.default.wrap(function _callee$(_context) {
                            while (1) {
                                switch (_context.prev = _context.next) {
                                    case 0:
                                        _context.next = 2;
                                        return _this3.collection._pouchFind(_this3);

                                    case 2:
                                        docs = _context.sent;
                                        return _context.abrupt('return', docs);

                                    case 4:
                                    case 'end':
                                        return _context.stop();
                                }
                            }
                        }, _callee, _this3);
                    }));

                    return function (_x) {
                        return _ref.apply(this, arguments);
                    };
                }()).do(function (x) {
                    return _this3._obsRunning = false;
                }).distinctUntilChanged(function (prev, now) {
                    return util.fastUnsecureHash(prev) == util.fastUnsecureHash(now);
                }).map(function (docs) {
                    return RxDocument.createAr(_this3.collection, docs, _this3.toJSON());
                }).do(function (docs) {
                    return _this3._subject.next(docs);
                }).map(function (x) {
                    return '';
                });

                this._observable$ = util.Rx.Observable.merge(this._subject, collection$).filter(function (x) {
                    return typeof x != 'string' || x != '';
                });
            }
            return this._observable$;
        }
    }]);
    return RxQuery;
}();

function create() {
    var queryObj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : defaultQuery;
    var collection = arguments[1];

    if (Array.isArray(queryObj)) // TODO should typecheck be done here ?
        throw new TypeError('query cannot be an array');

    return new RxQuery(queryObj, collection);
}