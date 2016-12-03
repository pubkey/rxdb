'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

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
        this.subject$;
        this.collectionSub$;

        this.defaultQuery = false;
        if (!queryObj || Object.keys(queryObj).length === 0 && !Array.isArray(queryObj)) {
            queryObj = defaultQuery;
            this.defaultQuery = true;
        }

        this.mquery = (0, _mquery2.default)(queryObj);

        // merge mquery-prototype functions to this
        var mquery_proto = Object.getPrototypeOf(this.mquery);
        Object.keys(mquery_proto).map(function (attrName) {
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
            Object.keys(params).map(function (k) {
                return _this.mquery.where(k).gt(null);
            });

            _this.mquery.sort(params);
            return _this;
        };
    }

    // observe the result of this query


    (0, _createClass3.default)(RxQuery, [{
        key: 'refresh$',


        /**
         * regrap the result from the database
         * and save it to this.result
         */
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                var queryJSON, docs, ret;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (!this.refresh$_running) {
                                    _context.next = 2;
                                    break;
                                }

                                return _context.abrupt('return');

                            case 2:
                                this.refresh$_running = true;

                                queryJSON = this.toJSON();
                                _context.next = 6;
                                return this.collection.pouch.find(queryJSON);

                            case 6:
                                docs = _context.sent;
                                ret = RxDocument.createAr(this.collection, docs.docs, queryJSON);

                                this.subject$.next(ret);

                                this.refresh$_running = false;

                            case 10:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function refresh$() {
                return _ref.apply(this, arguments);
            }

            return refresh$;
        }()
    }, {
        key: 'toJSON',
        value: function toJSON() {
            var _this2 = this;

            var json = {
                selector: this.mquery._conditions
            };

            var options = this.mquery._optionsForExec();

            // select fields
            if (this.mquery._fields) {
                (function () {
                    var fields = _this2.mquery._fieldsForExec();
                    var useFields = Object.keys(fields).filter(function (fieldName) {
                        return fields[fieldName] == 1;
                    });

                    useFields.push('_id');
                    useFields.push('_rev');
                    useFields = useFields.filter(function (elem, pos, arr) {
                        return arr.indexOf(elem) == pos;
                    }); // unique
                    json.fields = useFields;
                })();
            }

            // sort
            if (options.sort) {
                (function () {
                    var sortArray = [];
                    Object.keys(options.sort).map(function (fieldName) {
                        var dirInt = options.sort[fieldName];
                        var dir = 'asc';
                        if (dirInt == -1) dir = 'desc';
                        var pushMe = {};

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
        key: '$',
        get: function get() {
            var _this3 = this;

            if (this.subject$) return this.subject$.asObservable();

            this.subject$ = new util.Rx.BehaviorSubject(null);
            this.refresh$(); // get init value
            this.collectionSub$ = this.collection.$.filter(function (c) {
                return _this3.subject$.observers.length > 0;
            }) // TODO replace with subject$.hasObservers() https://github.com/Reactive-Extensions/RxJS/issues/1364
            .filter(function (cEvent) {
                return ['RxCollection.insert', 'RxDocument.save'].includes(cEvent.data.op);
            }).subscribe(function (cEvent) {
                return _this3.refresh$();
            }); // TODO unsubscribe on destroy
            return this.$;
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