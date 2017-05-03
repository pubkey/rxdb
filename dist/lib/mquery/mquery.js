/**
 * this is based on
 * @link https://github.com/aheckmann/mquery/blob/master/lib/mquery.js
 */
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _mquery_utils = require('./mquery_utils');

var utils = _interopRequireWildcard(_mquery_utils);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/**
 * Query constructor used for building queries.
 *
 * ####Example:
 *     var query = new Query({ name: 'mquery' });
 *     query.where('age').gte(21).exec(callback);
 *
 * @param {Object} [criteria]
 */
function Query(criteria) {
    var proto = this.constructor.prototype;
    this.options = {};
    this._conditions = proto._conditions ? (0, _clone2.default)(proto._conditions) : {};
    this._fields = proto._fields ? (0, _clone2.default)(proto._fields) : undefined;
    this._path = proto._path || undefined;

    if (criteria) this.find(criteria);
}

/**
 * returns a cloned version of the query
 * @return {Query}
 */
Query.prototype.clone = function () {
    var same = new Query();
    Object.entries(this).forEach(function (ar) {
        same[ar[0]] = ar[1];
    });
    return same;
};

/**
 * Specifies a `path` for use with chaining.
 * @param {String} [path]
 * @param {Object} [val]
 * @return {Query} this
 */
Query.prototype.where = function () {
    if (!arguments.length) return this;
    var type = _typeof(arguments[0]);
    if ('string' == type) {
        this._path = arguments[0];
        if (2 === arguments.length) this._conditions[this._path] = arguments[1];
        return this;
    }

    if ('object' == type && !Array.isArray(arguments[0])) return this.merge(arguments[0]);

    throw new TypeError('path must be a string or object');
};

/**
 * Specifies the complementary comparison value for paths specified with `where()`
 * ####Example
 *     User.where('age').equals(49);
 * @param {Object} val
 * @return {Query} this
 */
Query.prototype.equals = function equals(val) {
    this._ensurePath('equals');
    var path = this._path;
    this._conditions[path] = val;
    return this;
};

/**
 * Specifies the complementary comparison value for paths specified with `where()`
 * This is alias of `equals`
 * @param {Object} val
 * @return {Query} this
 */
Query.prototype.eq = function eq(val) {
    this._ensurePath('eq');
    var path = this._path;
    this._conditions[path] = val;
    return this;
};

/**
 * Specifies arguments for an `$or` condition.
 * ####Example
 *     query.or([{ color: 'red' }, { status: 'emergency' }])
 * @param {Array} array array of conditions
 * @return {Query} this
 */
Query.prototype.or = function (array) {
    var or = this._conditions.$or || (this._conditions.$or = []);
    if (!Array.isArray(array)) array = [array];
    or.push.apply(or, array);
    return this;
};

/**
 * Specifies arguments for a `$nor` condition.
 * ####Example
 *     query.nor([{ color: 'green' }, { status: 'ok' }])
 * @param {Array} array array of conditions
 * @return {Query} this
 */
Query.prototype.nor = function (array) {
    var nor = this._conditions.$nor || (this._conditions.$nor = []);
    if (!Array.isArray(array)) array = [array];
    nor.push.apply(nor, array);
    return this;
};

/**
 * Specifies arguments for a `$and` condition.
 * ####Example
 *     query.and([{ color: 'green' }, { status: 'ok' }])
 * @see $and http://docs.mongodb.org/manual/reference/operator/and/
 * @param {Array} array array of conditions
 * @return {Query} this
 */
Query.prototype.and = function (array) {
    var and = this._conditions.$and || (this._conditions.$and = []);
    if (!Array.isArray(array)) array = [array];
    and.push.apply(and, array);
    return this;
};

/**
 * gt, gte, lt, lte, ne, in, nin, all, regex, size, maxDistance
 *
 *     Thing.where('type').nin(array)
 */
['gt', 'gte', 'lt', 'lte', 'ne', 'in', 'nin', 'all', 'regex', 'size'].forEach(function ($conditional) {
    Query.prototype[$conditional] = function () {
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

        var conds = this._conditions[path] === null || _typeof(this._conditions[path]) === 'object' ? this._conditions[path] : this._conditions[path] = {};
        conds['$' + $conditional] = val;
        return this;
    };
});

/**
 * Specifies a `$mod` condition
 *
 * @param {String} [path]
 * @param {Number} val
 * @return {Query} this
 * @api public
 */
Query.prototype.mod = function () {
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
};

/**
 * Specifies an `$exists` condition
 * ####Example
 *     // { name: { $exists: true }}
 *     Thing.where('name').exists()
 *     Thing.where('name').exists(true)
 *     Thing.find().exists('name')
 * @param {String} [path]
 * @param {Number} val
 * @return {Query} this
 * @api public
 */
Query.prototype.exists = function () {
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
};

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
 * @return {Query} this
 */
Query.prototype.elemMatch = function () {
    if (null == arguments[0]) throw new TypeError('Invalid argument');

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
    } else throw new TypeError('Invalid argument');
    if (fn) {
        criteria = new Query();
        fn(criteria);
        criteria = criteria._conditions;
    }

    var conds = this._conditions[path] || (this._conditions[path] = {});
    conds.$elemMatch = criteria;
    return this;
};

/**
 * Sets the sort order
 * If an object is passed, values allowed are 'asc', 'desc', 'ascending', 'descending', 1, and -1.
 * If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
 * ####Example
 *     query.sort({ field: 'asc', test: -1 });
 *     query.sort('field -test');
 *     query.sort([['field', 1], ['test', -1]]);
 * @param {Object|String|Array} arg
 * @return {Query} this
 */
Query.prototype.sort = function (arg) {
    var _this = this;

    if (!arg) return this;
    var len = void 0;
    var type = typeof arg === 'undefined' ? 'undefined' : _typeof(arg);
    // .sort([['field', 1], ['test', -1]])
    if (Array.isArray(arg)) {
        len = arg.length;
        for (var i = 0; i < arg.length; ++i) {
            _pushArr(this.options, arg[i][0], arg[i][1]);
        }return this;
    }

    // .sort('field -test')
    if (1 === arguments.length && 'string' == type) {
        arg = arg.split(/\s+/);
        len = arg.length;
        for (var _i = 0; _i < len; ++_i) {
            var field = arg[_i];
            if (!field) continue;
            var ascend = '-' == field[0] ? -1 : 1;
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

    throw new TypeError('Invalid sort() argument. Must be a string, object, or array.');
};

/*!
 * @ignore
 */
function push(opts, field, value) {
    if (Array.isArray(opts.sort)) {
        throw new TypeError('Can\'t mix sort syntaxes. Use either array or object:' + '\n- `.sort([[\'field\', 1], [\'test\', -1]])`' + '\n- `.sort({ field: 1, test: -1 })`');
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
        throw new TypeError('Invalid sort value: {' + field + ': ' + value + ' }');
    }
    // store `sort` in a sane format
    var s = opts.sort || (opts.sort = {});
    var valueStr = value.toString().replace('asc', '1').replace('ascending', '1').replace('desc', '-1').replace('descending', '-1');
    s[field] = parseInt(valueStr, 10);
}

function _pushArr(opts, field, value) {
    opts.sort = opts.sort || [];
    if (!Array.isArray(opts.sort)) {
        throw new TypeError('\n          Can\'t mix sort syntaxes. Use either array or object:\n            \n- .sort([[\'field\', 1], [\'test\', -1]])\n            \n- .sort({ field: 1, test: -1 })');
    }
    var valueStr = value.toString().replace('asc', '1').replace('ascending', '1').replace('desc', '-1').replace('descending', '-1');
    opts.sort.push([field, value]);
};

/**
 * limit, skip, maxScan, batchSize, comment
 *
 * Sets these associated options.
 *
 *     query.comment('feed query');
 */
['limit', 'skip', 'maxScan', 'batchSize', 'comment'].forEach(function (method) {
    Query.prototype[method] = function (v) {
        this.options[method] = v;
        return this;
    };
});

/**
 * Merges another Query or conditions object into this one.
 *
 * When a Query is passed, conditions, field selection and options are merged.
 *
 * @param {Query|Object} source
 * @return {Query} this
 */
Query.prototype.merge = function (source) {
    if (!source) return this;

    if (!Query.canMerge(source)) throw new TypeError('Invalid argument. Expected instanceof mquery or plain object');

    if (source instanceof Query) {
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
};

/**
 * Finds documents.
 * ####Example
 *     query.find()
 *     query.find({ name: 'Burning Lights' })
 * @param {Object} [criteria] mongodb selector
 * @return {Query} this
 */
Query.prototype.find = function (criteria) {
    if ('function' === typeof criteria) {
        callback = criteria;
        criteria = undefined;
    } else if (Query.canMerge(criteria)) this.merge(criteria);

    return this;
};

/**
 * Returns default options.
 * @return {Object}
 */
Query.prototype._optionsForExec = function () {
    var options = (0, _clone2.default)(this.options);
    return options;
};

/**
 * Make sure _path is set.
 *
 * @parmam {String} method
 */
Query.prototype._ensurePath = function (method) {
    if (!this._path) {
        throw new Error('\n          ' + method + '() must be used after where()\n          when called with these arguments\n        ');
    }
};
Query.prototype._validate = function (action) {};

/**
 * Determines if `conds` can be merged using `mquery().merge()`
 *
 * @param {Object} conds
 * @return {Boolean}
 */
Query.canMerge = function (conds) {
    return conds instanceof Query || utils.isObject(conds);
};

Query.utils = utils;
exports.default = Query;
