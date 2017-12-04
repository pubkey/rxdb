'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _mquery_utils = require('./mquery_utils');

var utils = _interopRequireWildcard(_mquery_utils);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _clone2 = require('clone');

var _clone3 = _interopRequireDefault(_clone2);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var MQuery = function () {
    /**
     * MQuery constructor used for building queries.
     *
     * ####Example:
     *     var query = new MQuery({ name: 'mquery' });
     *     query.where('age').gte(21).exec(callback);
     *
     * @param {Object} [criteria]
     */
    function MQuery(criteria) {
        (0, _classCallCheck3['default'])(this, MQuery);

        var proto = this.constructor.prototype;
        this.options = {};
        this._conditions = proto._conditions ? (0, _clone3['default'])(proto._conditions) : {};
        this._fields = proto._fields ? (0, _clone3['default'])(proto._fields) : undefined;
        this._path = proto._path || undefined;

        if (criteria) this.find(criteria);
    }

    /**
     * returns a cloned version of the query
     * @return {MQuery}
     */


    (0, _createClass3['default'])(MQuery, [{
        key: 'clone',
        value: function clone() {
            var same = new MQuery();
            Object.entries(this).forEach(function (entry) {
                same[entry[0]] = (0, _clone3['default'])(entry[1]);
            });
            return same;
        }

        /**
         * Specifies a `path` for use with chaining.
         * @param {String} [path]
         * @param {Object} [val]
         * @return {MQuery} this
         */

    }, {
        key: 'where',
        value: function where() {
            if (!arguments.length) return this;
            var type = (0, _typeof3['default'])(arguments[0]);
            if ('string' === type) {
                this._path = arguments[0];
                if (2 === arguments.length) this._conditions[this._path] = arguments[1];
                return this;
            }

            if ('object' === type && !Array.isArray(arguments[0])) return this.merge(arguments[0]);

            throw _rxError2['default'].newRxTypeError('MQ1', {
                path: arguments[0]
            });
        }

        /**
         * Specifies the complementary comparison value for paths specified with `where()`
         * ####Example
         *     User.where('age').equals(49);
         * @param {Object} val
         * @return {MQuery} this
         */

    }, {
        key: 'equals',
        value: function equals(val) {
            this._ensurePath('equals');
            var path = this._path;
            this._conditions[path] = val;
            return this;
        }

        /**
         * Specifies the complementary comparison value for paths specified with `where()`
         * This is alias of `equals`
         * @param {Object} val
         * @return {MQuery} this
         */

    }, {
        key: 'eq',
        value: function eq(val) {
            this._ensurePath('eq');
            var path = this._path;
            this._conditions[path] = val;
            return this;
        }

        /**
         * Specifies arguments for an `$or` condition.
         * ####Example
         *     query.or([{ color: 'red' }, { status: 'emergency' }])
         * @param {Array} array array of conditions
         * @return {MQuery} this
         */

    }, {
        key: 'or',
        value: function or(array) {
            var or = this._conditions.$or || (this._conditions.$or = []);
            if (!Array.isArray(array)) array = [array];
            or.push.apply(or, array);
            return this;
        }

        /**
         * Specifies arguments for a `$nor` condition.
         * ####Example
         *     query.nor([{ color: 'green' }, { status: 'ok' }])
         * @param {Array} array array of conditions
         * @return {MQuery} this
         */

    }, {
        key: 'nor',
        value: function nor(array) {
            var nor = this._conditions.$nor || (this._conditions.$nor = []);
            if (!Array.isArray(array)) array = [array];
            nor.push.apply(nor, array);
            return this;
        }

        /**
         * Specifies arguments for a `$and` condition.
         * ####Example
         *     query.and([{ color: 'green' }, { status: 'ok' }])
         * @see $and http://docs.mongodb.org/manual/reference/operator/and/
         * @param {Array} array array of conditions
         * @return {MQuery} this
         */

    }, {
        key: 'and',
        value: function and(array) {
            var and = this._conditions.$and || (this._conditions.$and = []);
            if (!Array.isArray(array)) array = [array];
            and.push.apply(and, array);
            return this;
        }

        /**
         * Specifies a `$mod` condition
         *
         * @param {String} [path]
         * @param {Number} val
         * @return {MQuery} this
         * @api public
         */

    }, {
        key: 'mod',
        value: function mod() {
            var val = void 0;
            var path = void 0;

            if (1 === arguments.length) {
                this._ensurePath('mod');
                val = arguments[0];
                path = this._path;
            } else if (2 === arguments.length && !Array.isArray(arguments[1])) {
                this._ensurePath('mod');
                val = arguments.slice();
                path = this._path;
            } else if (3 === arguments.length) {
                val = arguments.slice(1);
                path = arguments[0];
            } else {
                val = arguments[1];
                path = arguments[0];
            }

            var conds = this._conditions[path] || (this._conditions[path] = {});
            conds.$mod = val;
            return this;
        }

        /**
         * Specifies an `$exists` condition
         * ####Example
         *     // { name: { $exists: true }}
         *     Thing.where('name').exists()
         *     Thing.where('name').exists(true)
         *     Thing.find().exists('name')
         * @param {String} [path]
         * @param {Number} val
         * @return {MQuery} this
         * @api public
         */

    }, {
        key: 'exists',
        value: function exists() {
            var path = void 0;
            var val = void 0;
            if (0 === arguments.length) {
                this._ensurePath('exists');
                path = this._path;
                val = true;
            } else if (1 === arguments.length) {
                if ('boolean' === typeof arguments[0]) {
                    this._ensurePath('exists');
                    path = this._path;
                    val = arguments[0];
                } else {
                    path = arguments[0];
                    val = true;
                }
            } else if (2 === arguments.length) {
                path = arguments[0];
                val = arguments[1];
            }

            var conds = this._conditions[path] || (this._conditions[path] = {});
            conds.$exists = val;
            return this;
        }

        /**
         * Specifies an `$elemMatch` condition
         * ####Example
         *     query.elemMatch('comment', { author: 'autobot', votes: {$gte: 5}})
         *     query.where('comment').elemMatch({ author: 'autobot', votes: {$gte: 5}})
         *     query.elemMatch('comment', function (elem) {
         *       elem.where('author').equals('autobot');
         *       elem.where('votes').gte(5);
         *     })
         *     query.where('comment').elemMatch(function (elem) {
         *       elem.where({ author: 'autobot' });
         *       elem.where('votes').gte(5);
         *     })
         * @param {String|Object|Function} path
         * @param {Object|Function} criteria
         * @return {MQuery} this
         */

    }, {
        key: 'elemMatch',
        value: function elemMatch() {
            if (null === arguments[0]) throw _rxError2['default'].newRxTypeError('MQ2');

            var fn = void 0;
            var path = void 0;
            var criteria = void 0;

            if ('function' === typeof arguments[0]) {
                this._ensurePath('elemMatch');
                path = this._path;
                fn = arguments[0];
            } else if (utils.isObject(arguments[0])) {
                this._ensurePath('elemMatch');
                path = this._path;
                criteria = arguments[0];
            } else if ('function' === typeof arguments[1]) {
                path = arguments[0];
                fn = arguments[1];
            } else if (arguments[1] && utils.isObject(arguments[1])) {
                path = arguments[0];
                criteria = arguments[1];
            } else throw _rxError2['default'].newRxTypeError('MQ2');

            if (fn) {
                criteria = new MQuery();
                fn(criteria);
                criteria = criteria._conditions;
            }

            var conds = this._conditions[path] || (this._conditions[path] = {});
            conds.$elemMatch = criteria;
            return this;
        }

        /**
         * Sets the sort order
         * If an object is passed, values allowed are 'asc', 'desc', 'ascending', 'descending', 1, and -1.
         * If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
         * ####Example
         *     query.sort({ field: 'asc', test: -1 });
         *     query.sort('field -test');
         *     query.sort([['field', 1], ['test', -1]]);
         * @param {Object|String|Array} arg
         * @return {MQuery} this
         */

    }, {
        key: 'sort',
        value: function sort(arg) {
            var _this = this;

            if (!arg) return this;
            var len = void 0;
            var type = typeof arg === 'undefined' ? 'undefined' : (0, _typeof3['default'])(arg);
            // .sort([['field', 1], ['test', -1]])
            if (Array.isArray(arg)) {
                len = arg.length;
                for (var i = 0; i < arg.length; ++i) {
                    _pushArr(this.options, arg[i][0], arg[i][1]);
                }return this;
            }

            // .sort('field -test')
            if (1 === arguments.length && 'string' === type) {
                arg = arg.split(/\s+/);
                len = arg.length;
                for (var _i = 0; _i < len; ++_i) {
                    var field = arg[_i];
                    if (!field) continue;
                    var ascend = '-' === field[0] ? -1 : 1;
                    if (ascend === -1) field = field.substring(1);
                    push(this.options, field, ascend);
                }

                return this;
            }

            // .sort({ field: 1, test: -1 })
            if (utils.isObject(arg)) {
                var keys = Object.keys(arg);
                keys.forEach(function (field) {
                    return push(_this.options, field, arg[field]);
                });
                return this;
            }

            throw _rxError2['default'].newRxTypeError('MQ3', {
                args: arguments
            });
        }

        /**
         * Merges another MQuery or conditions object into this one.
         *
         * When a MQuery is passed, conditions, field selection and options are merged.
         *
         * @param {MQuery|Object} source
         * @return {MQuery} this
         */

    }, {
        key: 'merge',
        value: function merge(source) {
            if (!source) return this;

            if (!MQuery.canMerge(source)) {
                throw _rxError2['default'].newRxTypeError('MQ4', {
                    source: source
                });
            }

            if (source instanceof MQuery) {
                // if source has a feature, apply it to ourselves

                if (source._conditions) utils.merge(this._conditions, source._conditions);

                if (source._fields) {
                    this._fields || (this._fields = {});
                    utils.merge(this._fields, source._fields);
                }

                if (source.options) {
                    this.options || (this.options = {});
                    utils.merge(this.options, source.options);
                }

                if (source._update) {
                    this._update || (this._update = {});
                    utils.mergeClone(this._update, source._update);
                }

                if (source._distinct) this._distinct = source._distinct;

                return this;
            }

            // plain object
            utils.merge(this._conditions, source);

            return this;
        }

        /**
         * Finds documents.
         * ####Example
         *     query.find()
         *     query.find({ name: 'Burning Lights' })
         * @param {Object} [criteria] mongodb selector
         * @return {MQuery} this
         */

    }, {
        key: 'find',
        value: function find(criteria) {
            if (MQuery.canMerge(criteria)) this.merge(criteria);

            return this;
        }

        /**
         * Returns default options.
         * @return {Object}
         */

    }, {
        key: '_optionsForExec',
        value: function _optionsForExec() {
            var options = (0, _clone3['default'])(this.options);
            return options;
        }

        /**
         * Make sure _path is set.
         *
         * @parmam {String} method
         */

    }, {
        key: '_ensurePath',
        value: function _ensurePath(method) {
            if (!this._path) {
                throw _rxError2['default'].newRxError('MQ5', {
                    method: method
                });
            }
        }
    }]);
    return MQuery;
}();

/**
 * gt, gte, lt, lte, ne, in, nin, all, regex, size, maxDistance
 *
 *     Thing.where('type').nin(array)
 */
/**
 * this is based on
 * @link https://github.com/aheckmann/mquery/blob/master/lib/mquery.js
 */


['gt', 'gte', 'lt', 'lte', 'ne', 'in', 'nin', 'all', 'regex', 'size'].forEach(function ($conditional) {
    MQuery.prototype[$conditional] = function () {
        var path = void 0;
        var val = void 0;
        if (1 === arguments.length) {
            this._ensurePath($conditional);
            val = arguments[0];
            path = this._path;
        } else {
            val = arguments[1];
            path = arguments[0];
        }

        var conds = this._conditions[path] === null || (0, _typeof3['default'])(this._conditions[path]) === 'object' ? this._conditions[path] : this._conditions[path] = {};
        conds['$' + $conditional] = val;
        return this;
    };
});

/*!
 * @ignore
 */
function push(opts, field, value) {
    if (Array.isArray(opts.sort)) {
        throw _rxError2['default'].newRxTypeError('MQ6', {
            opts: opts,
            field: field,
            value: value
        });
    }

    if (value && value.$meta) {
        var _s = opts.sort || (opts.sort = {});
        _s[field] = {
            $meta: value.$meta
        };
        return;
    }

    var val = String(value || 1).toLowerCase();
    if (!/^(?:ascending|asc|descending|desc|1|-1)$/.test(val)) {
        if (Array.isArray(value)) value = '[' + value + ']';
        throw _rxError2['default'].newRxTypeError('MQ7', {
            field: field,
            value: value
        });
    }
    // store `sort` in a sane format
    var s = opts.sort || (opts.sort = {});
    var valueStr = value.toString().replace('asc', '1').replace('ascending', '1').replace('desc', '-1').replace('descending', '-1');
    s[field] = parseInt(valueStr, 10);
};

function _pushArr(opts, field, value) {
    opts.sort = opts.sort || [];
    if (!Array.isArray(opts.sort)) {
        throw _rxError2['default'].newRxTypeError('MQ8', {
            opts: opts,
            field: field,
            value: value
        });
    }

    /*    const valueStr = value.toString()
            .replace('asc', '1')
            .replace('ascending', '1')
            .replace('desc', '-1')
            .replace('descending', '-1');*/
    opts.sort.push([field, value]);
};

/**
 * Determines if `conds` can be merged using `mquery().merge()`
 *
 * @param {Object} conds
 * @return {Boolean}
 */
MQuery.canMerge = function (conds) {
    return conds instanceof MQuery || utils.isObject(conds);
};

/**
 * limit, skip, maxScan, batchSize, comment
 *
 * Sets these associated options.
 *
 *     query.comment('feed query');
 */
['limit', 'skip', 'maxScan', 'batchSize', 'comment'].forEach(function (method) {
    MQuery.prototype[method] = function (v) {
        this.options[method] = v;
        return this;
    };
});

MQuery.utils = utils;
exports['default'] = MQuery;
