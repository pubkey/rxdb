/**
 * this is based on
 * @link https://github.com/aheckmann/mquery/blob/master/lib/mquery.js
 */

'use strict';

/**
 * Dependencies
 */

const utils = require('./mquery_utils');
import {
    default as clone
} from 'clone';

/**
 * Query constructor used for building queries.
 *
 * ####Example:
 *
 *     var query = new Query({ name: 'mquery' });
 *     query.setOptions({ collection: moduleCollection })
 *     query.where('age').gte(21).exec(callback);
 *
 * @param {Object} [criteria]
 * @param {Object} [options]
 * @api public
 */

function Query(criteria, options) {
    if (!(this instanceof Query))
        return new Query(criteria, options);

    const proto = this.constructor.prototype;

    this.op = proto.op || undefined;

    this.options = {};
    this.setOptions(proto.options);

    this._conditions = proto._conditions ?
        clone(proto._conditions, {
            retainKeyOrder: this.options.retainKeyOrder
        }) : {};

    this._fields = proto._fields ?
        clone(proto._fields, {
            retainKeyOrder: this.options.retainKeyOrder
        }) :
        undefined;

    this._update = proto._update ?
        clone(proto._update, {
            retainKeyOrder: this.options.retainKeyOrder
        }) :
        undefined;

    this._path = proto._path || undefined;
    this._distinct = proto._distinct || undefined;
    this._traceFunction = proto._traceFunction || undefined;

    if (options)
        this.setOptions(options);

    if (criteria) {
        if (criteria.find && criteria.remove && criteria.update)
            this.collection(criteria);
        else
            this.find(criteria);

    }
}

/**
 * This is a parameter that the user can set which determines if mquery
 * uses $within or $geoWithin for queries. It defaults to true which
 * means $geoWithin will be used. If using MongoDB < 2.4 you should
 * set this to false.
 *
 * @api public
 * @property use$geoWithin
 */

let $withinCmd = '$geoWithin';
Object.defineProperty(Query, 'use$geoWithin', {
    get: function() {
        return $withinCmd == '$geoWithin';
    },
    set: function(v) {
        if (true === v) {
            // mongodb >= 2.4
            $withinCmd = '$geoWithin';
        } else
            $withinCmd = '$within';

    }
});

/**
 * Converts this query to a constructor function with all arguments and options retained.
 *
 * ####Example
 *
 *     // Create a query that will read documents with a "video" category from
 *     // `aCollection` on the primary node in the replica-set unless it is down,
 *     // in which case we'll read from a secondary node.
 *     var query = mquery({ category: 'video' })
 *     query.setOptions({ collection: aCollection, read: 'primaryPreferred' });
 *
 *     // create a constructor based off these settings
 *     var Video = query.toConstructor();
 *
 *     // Video is now a subclass of mquery() and works the same way but with the
 *     // default query parameters and options set.
 *
 *     // run a query with the previous settings but filter for movies with names
 *     // that start with "Life".
 *     Video().where({ name: /^Life/ }).exec(cb);
 *
 * @return {Query} new Query
 * @api public
 */

Query.prototype.toConstructor = function toConstructor() {
    function CustomQuery(criteria, options) {
        if (!(this instanceof CustomQuery))
            return new CustomQuery(criteria, options);
        Query.call(this, criteria, options);
    }

    utils.inherits(CustomQuery, Query);

    // set inherited defaults
    const p = CustomQuery.prototype;

    p.options = {};
    p.setOptions(this.options);

    p.op = this.op;
    p._conditions = clone(this._conditions, {
        retainKeyOrder: this.options.retainKeyOrder
    });
    p._fields = clone(this._fields, {
        retainKeyOrder: this.options.retainKeyOrder
    });
    p._update = clone(this._update, {
        retainKeyOrder: this.options.retainKeyOrder
    });
    p._path = this._path;
    p._distinct = this._distinct;
    p._traceFunction = this._traceFunction;

    return CustomQuery;
};

/**
 * Sets query options.
 *
 * ####Options:
 *
 * - [tailable](http://www.mongodb.org/display/DOCS/Tailable+Cursors) *
 * - [sort](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsort(\)%7D%7D) *
 * - [limit](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D) *
 * - [skip](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D) *
 * - [maxScan](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24maxScan) *
 * - [maxTime](http://docs.mongodb.org/manual/reference/operator/meta/maxTimeMS/#op._S_maxTimeMS) *
 * - [batchSize](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D) *
 * - [comment](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment) *
 * - [snapshot](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D) *
 * - [hint](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint) *
 * - [slaveOk](http://docs.mongodb.org/manual/applications/replication/#read-preference) *
 * - [safe](http://www.mongodb.org/display/DOCS/getLastError+Command)
 * - collection the collection to query against
 *
 * _* denotes a query helper method is also available_
 *
 * @param {Object} options
 * @api public
 */

Query.prototype.setOptions = function(options) {
    if (!(options && utils.isObject(options)))
        return this;

    // set arbitrary options
    const methods = Object.keys(options);
    let method;

    for (let i = 0; i < methods.length; ++i) {
        method = methods[i];

        // use methods if exist (safer option manipulation)
        if ('function' == typeof this[method]) {
            const args = Array.isArray(options[method]) ?
                options[method] : [options[method]];
            this[method].apply(this, args);
        } else
            this.options[method] = options[method];

    }

    return this;
};


/**
 * Specifies a `$where` condition
 *
 * Use `$where` when you need to select documents using a JavaScript expression.
 *
 * ####Example
 *
 *     query.$where('this.comments.length > 10 || this.name.length > 5')
 *
 *     query.$where(function () {
 *       return this.comments.length > 10 || this.name.length > 5;
 *     })
 *
 * @param {String|Function} js javascript string or function
 * @return {Query} this
 * @memberOf Query
 * @method $where
 * @api public
 */

Query.prototype.$where = function(js) {
    this._conditions.$where = js;
    return this;
};

/**
 * Specifies a `path` for use with chaining.
 *
 * ####Example
 *
 *     // instead of writing:
 *     User.find({age: {$gte: 21, $lte: 65}}, callback);
 *
 *     // we can instead write:
 *     User.where('age').gte(21).lte(65);
 *
 *     // passing query conditions is permitted
 *     User.find().where({ name: 'vonderful' })
 *
 *     // chaining
 *     User
 *     .where('age').gte(21).lte(65)
 *     .where('name', /^vonderful/i)
 *     .where('friends').slice(10)
 *     .exec(callback)
 *
 * @param {String} [path]
 * @param {Object} [val]
 * @return {Query} this
 * @api public
 */

Query.prototype.where = function() {
    if (!arguments.length) return this;
    if (!this.op) this.op = 'find';

    const type = typeof arguments[0];

    if ('string' == type) {
        this._path = arguments[0];

        if (2 === arguments.length)
            this._conditions[this._path] = arguments[1];


        return this;
    }

    if ('object' == type && !Array.isArray(arguments[0]))
        return this.merge(arguments[0]);

    throw new TypeError('path must be a string or object');
};

/**
 * Specifies the complementary comparison value for paths specified with `where()`
 *
 * ####Example
 *
 *     User.where('age').equals(49);
 *
 *     // is the same as
 *
 *     User.where('age', 49);
 *
 * @param {Object} val
 * @return {Query} this
 * @api public
 */

Query.prototype.equals = function equals(val) {
    this._ensurePath('equals');
    const path = this._path;
    this._conditions[path] = val;
    return this;
};

/**
 * Specifies the complementary comparison value for paths specified with `where()`
 * This is alias of `equals`
 *
 * ####Example
 *
 *     User.where('age').eq(49);
 *
 *     // is the same as
 *
 *     User.shere('age').equals(49);
 *
 *     // is the same as
 *
 *     User.where('age', 49);
 *
 * @param {Object} val
 * @return {Query} this
 * @api public
 */

Query.prototype.eq = function eq(val) {
    this._ensurePath('eq');
    const path = this._path;
    this._conditions[path] = val;
    return this;
};

/**
 * Specifies arguments for an `$or` condition.
 *
 * ####Example
 *
 *     query.or([{ color: 'red' }, { status: 'emergency' }])
 *
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

Query.prototype.or = function or(array) {
    var or = this._conditions.$or || (this._conditions.$or = []);
    if (!Array.isArray(array)) array = [array];
    or.push.apply(or, array);
    return this;
};

/**
 * Specifies arguments for a `$nor` condition.
 *
 * ####Example
 *
 *     query.nor([{ color: 'green' }, { status: 'ok' }])
 *
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

Query.prototype.nor = function nor(array) {
    var nor = this._conditions.$nor || (this._conditions.$nor = []);
    if (!Array.isArray(array)) array = [array];
    nor.push.apply(nor, array);
    return this;
};

/**
 * Specifies arguments for a `$and` condition.
 *
 * ####Example
 *
 *     query.and([{ color: 'green' }, { status: 'ok' }])
 *
 * @see $and http://docs.mongodb.org/manual/reference/operator/and/
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

Query.prototype.and = function and(array) {
    var and = this._conditions.$and || (this._conditions.$and = []);
    if (!Array.isArray(array)) array = [array];
    and.push.apply(and, array);
    return this;
};

/**
 * Specifies a $gt query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * ####Example
 *
 *     Thing.find().where('age').gt(21)
 *
 *     // or
 *     Thing.find().gt('age', 21)
 *
 * @method gt
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $gte query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method gte
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $lt query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lt
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $lte query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lte
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $ne query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method ne
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $in query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method in
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $nin query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method nin
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $all query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method all
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $size query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method size
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $regex query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method regex
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $maxDistance query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method maxDistance
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/*!
 * gt, gte, lt, lte, ne, in, nin, all, regex, size, maxDistance
 *
 *     Thing.where('type').nin(array)
 */

'gt gte lt lte ne in nin all regex size maxDistance minDistance'.split(' ').forEach(function($conditional) {
    Query.prototype[$conditional] = function() {
        let path;
        let val;

        if (1 === arguments.length) {
            this._ensurePath($conditional);
            val = arguments[0];
            path = this._path;
        } else {
            val = arguments[1];
            path = arguments[0];
        }

        const conds = this._conditions[path] === null || typeof this._conditions[path] === 'object' ?
            this._conditions[path] :
            (this._conditions[path] = {});
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

Query.prototype.mod = function() {
    let val;
    let path;

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

    const conds = this._conditions[path] || (this._conditions[path] = {});
    conds.$mod = val;
    return this;
};

/**
 * Specifies an `$exists` condition
 *
 * ####Example
 *
 *     // { name: { $exists: true }}
 *     Thing.where('name').exists()
 *     Thing.where('name').exists(true)
 *     Thing.find().exists('name')
 *
 *     // { name: { $exists: false }}
 *     Thing.where('name').exists(false);
 *     Thing.find().exists('name', false);
 *
 * @param {String} [path]
 * @param {Number} val
 * @return {Query} this
 * @api public
 */

Query.prototype.exists = function() {
    let path;
    let val;

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

    const conds = this._conditions[path] || (this._conditions[path] = {});
    conds.$exists = val;
    return this;
};

/**
 * Specifies an `$elemMatch` condition
 *
 * ####Example
 *
 *     query.elemMatch('comment', { author: 'autobot', votes: {$gte: 5}})
 *
 *     query.where('comment').elemMatch({ author: 'autobot', votes: {$gte: 5}})
 *
 *     query.elemMatch('comment', function (elem) {
 *       elem.where('author').equals('autobot');
 *       elem.where('votes').gte(5);
 *     })
 *
 *     query.where('comment').elemMatch(function (elem) {
 *       elem.where({ author: 'autobot' });
 *       elem.where('votes').gte(5);
 *     })
 *
 * @param {String|Object|Function} path
 * @param {Object|Function} criteria
 * @return {Query} this
 * @api public
 */

Query.prototype.elemMatch = function() {
    if (null == arguments[0])
        throw new TypeError('Invalid argument');

    let fn;
    let path;
    let criteria;

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
    } else
        throw new TypeError('Invalid argument');


    if (fn) {
        criteria = new Query;
        fn(criteria);
        criteria = criteria._conditions;
    }

    const conds = this._conditions[path] || (this._conditions[path] = {});
    conds.$elemMatch = criteria;
    return this;
};

// Spatial queries

/**
 * Sugar for geo-spatial queries.
 *
 * ####Example
 *
 *     query.within().box()
 *     query.within().circle()
 *     query.within().geometry()
 *
 *     query.where('loc').within({ center: [50,50], radius: 10, unique: true, spherical: true });
 *     query.where('loc').within({ box: [[40.73, -73.9], [40.7, -73.988]] });
 *     query.where('loc').within({ polygon: [[],[],[],[]] });
 *
 *     query.where('loc').within([], [], []) // polygon
 *     query.where('loc').within([], []) // box
 *     query.where('loc').within({ type: 'LineString', coordinates: [...] }); // geometry
 *
 * #### n o t e:
 *
 * Must be used after `where()`.
 *
 * @memberOf Query
 * @return {Query} this
 * @api public
 */

Query.prototype.within = function within() {
    // opinionated, must be used after where
    this._ensurePath('within');
    this._geoComparison = $withinCmd;

    if (0 === arguments.length)
        return this;


    if (2 === arguments.length)
        return this.box.apply(this, arguments);
    else if (2 < arguments.length)
        return this.polygon.apply(this, arguments);


    const area = arguments[0];

    if (!area)
        throw new TypeError('Invalid argument');

    if (area.center)
        return this.circle(area);

    if (area.box)
        return this.box.apply(this, area.box);

    if (area.polygon)
        return this.polygon.apply(this, area.polygon);

    if (area.type && area.coordinates)
        return this.geometry(area);

    throw new TypeError('Invalid argument');
};

/**
 * Specifies a $box condition
 *
 * ####Example
 *
 *     var lowerLeft = [40.73083, -73.99756]
 *     var upperRight= [40.741404,  -73.988135]
 *
 *     query.where('loc').within().box(lowerLeft, upperRight)
 *     query.box('loc', lowerLeft, upperRight )
 *
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @see Query#within #query_Query-within
 * @param {String} path
 * @param {Object} val
 * @return {Query} this
 * @api public
 */

Query.prototype.box = function() {
    let path;
    let box;

    if (3 === arguments.length) {
        // box('loc', [], [])
        path = arguments[0];
        box = [arguments[1], arguments[2]];
    } else if (2 === arguments.length) {
        // box([], [])
        this._ensurePath('box');
        path = this._path;
        box = [arguments[0], arguments[1]];
    } else
        throw new TypeError('Invalid argument');


    const conds = this._conditions[path] || (this._conditions[path] = {});
    conds[this._geoComparison || $withinCmd] = {
        '$box': box
    };
    return this;
};

/**
 * Specifies a $polygon condition
 *
 * ####Example
 *
 *     query.where('loc').within().polygon([10,20], [13, 25], [7,15])
 *     query.polygon('loc', [10,20], [13, 25], [7,15])
 *
 * @param {String|Array} [path]
 * @param {Array|Object} [val]
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.polygon = function() {
    let val;
    let path;

    if ('string' == typeof arguments[0]) {
        // polygon('loc', [],[],[])
        path = arguments[0];
        val = arguments.slice(1);
    } else {
        // polygon([],[],[])
        this._ensurePath('polygon');
        path = this._path;
        val = arguments.slice();
    }

    var conds = this._conditions[path] || (this._conditions[path] = {});
    conds[this._geoComparison || $withinCmd] = {
        '$polygon': val
    };
    return this;
};

/**
 * Specifies a $center or $centerSphere condition.
 *
 * ####Example
 *
 *     var area = { center: [50, 50], radius: 10, unique: true }
 *     query.where('loc').within().circle(area)
 *     query.center('loc', area);
 *
 *     // for spherical calculations
 *     var area = { center: [50, 50], radius: 10, unique: true, spherical: true }
 *     query.where('loc').within().circle(area)
 *     query.center('loc', area);
 *
 * @param {String} [path]
 * @param {Object} area
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.circle = function() {
    let path;
    let val;

    if (1 === arguments.length) {
        this._ensurePath('circle');
        path = this._path;
        val = arguments[0];
    } else if (2 === arguments.length) {
        path = arguments[0];
        val = arguments[1];
    } else
        throw new TypeError('Invalid argument');


    if (!('radius' in val && val.center))
        throw new Error('center and radius are required');

    var conds = this._conditions[path] || (this._conditions[path] = {});

    var type = val.spherical ?
        '$centerSphere' :
        '$center';

    var wKey = this._geoComparison || $withinCmd;
    conds[wKey] = {};
    conds[wKey][type] = [val.center, val.radius];

    if ('unique' in val)
        conds[wKey].$uniqueDocs = !!val.unique;

    return this;
};

/**
 * Specifies a `$near` or `$nearSphere` condition
 *
 * These operators return documents sorted by distance.
 *
 * ####Example
 *
 *     query.where('loc').near({ center: [10, 10] });
 *     query.where('loc').near({ center: [10, 10], maxDistance: 5 });
 *     query.where('loc').near({ center: [10, 10], maxDistance: 5, spherical: true });
 *     query.near('loc', { center: [10, 10], maxDistance: 5 });
 *     query.near({ center: { type: 'Point', coordinates: [..] }})
 *     query.near().geometry({ type: 'Point', coordinates: [..] })
 *
 * @param {String} [path]
 * @param {Object} val
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */
Query.prototype.near = function near() {
    let path;
    let val;

    this._geoComparison = '$near';

    if (0 === arguments.length) {
        return this;
    } else if (1 === arguments.length) {
        this._ensurePath('near');
        path = this._path;
        val = arguments[0];
    } else if (2 === arguments.length) {
        path = arguments[0];
        val = arguments[1];
    } else {
        throw new TypeError('Invalid argument');
    }

    if (!val.center) {
        throw new Error('center is required');
    }

    var conds = this._conditions[path] || (this._conditions[path] = {});

    var type = val.spherical ?
        '$nearSphere' :
        '$near';

    // center could be a GeoJSON object or an Array
    if (Array.isArray(val.center)) {
        conds[type] = val.center;

        var radius = 'maxDistance' in val ?
            val.maxDistance :
            null;

        if (null != radius) {
            conds.$maxDistance = radius;
        }
        if (null != val.minDistance) {
            conds.$minDistance = val.minDistance;
        }
    } else {
        // GeoJSON?
        if (val.center.type != 'Point' || !Array.isArray(val.center.coordinates)) {
            throw new Error("Invalid GeoJSON specified for " + type);
        }
        conds[type] = {
            $geometry: val.center
        };

        // MongoDB 2.6 insists on maxDistance being in $near / $nearSphere
        if ('maxDistance' in val) {
            conds[type]['$maxDistance'] = val.maxDistance;
        }
        if ('minDistance' in val) {
            conds[type]['$minDistance'] = val.minDistance;
        }
    }

    return this;
}

/**
 * Declares an intersects query for `geometry()`.
 *
 * ####Example
 *
 *     query.where('path').intersects().geometry({
 *         type: 'LineString'
 *       , coordinates: [[180.0, 11.0], [180, 9.0]]
 *     })
 *
 *     query.where('path').intersects({
 *         type: 'LineString'
 *       , coordinates: [[180.0, 11.0], [180, 9.0]]
 *     })
 *
 * @param {Object} [arg]
 * @return {Query} this
 * @api public
 */

Query.prototype.intersects = function intersects() {
    // opinionated, must be used after where
    this._ensurePath('intersects');

    this._geoComparison = '$geoIntersects';

    if (0 === arguments.length) {
        return this;
    }

    var area = arguments[0];

    if (null != area && area.type && area.coordinates)
        return this.geometry(area);

    throw new TypeError('Invalid argument');
}

/**
 * Specifies a `$geometry` condition
 *
 * ####Example
 *
 *     var polyA = [[[ 10, 20 ], [ 10, 40 ], [ 30, 40 ], [ 30, 20 ]]]
 *     query.where('loc').within().geometry({ type: 'Polygon', coordinates: polyA })
 *
 *     // or
 *     var polyB = [[ 0, 0 ], [ 1, 1 ]]
 *     query.where('loc').within().geometry({ type: 'LineString', coordinates: polyB })
 *
 *     // or
 *     var polyC = [ 0, 0 ]
 *     query.where('loc').within().geometry({ type: 'Point', coordinates: polyC })
 *
 *     // or
 *     query.where('loc').intersects().geometry({ type: 'Point', coordinates: polyC })
 *
 * #### N O T E :
 *
 * `geometry()` **must** come after either `intersects()` or `within()`.
 *
 * The `object` argument must contain `type` and `coordinates` properties.
 * - type {String}
 * - coordinates {Array}
 *
 * The most recent path passed to `where()` is used.
 *
 * @param {Object} object Must contain a `type` property which is a String and a `coordinates` property which is an Array. See the examples.
 * @return {Query} this
 * @see http://docs.mongodb.org/manual/release-notes/2.4/#new-geospatial-indexes-with-geojson-and-improved-spherical-geometry
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @see $geometry http://docs.mongodb.org/manual/reference/operator/geometry/
 * @api public
 */

Query.prototype.geometry = function geometry() {
    if (!('$within' == this._geoComparison ||
            '$geoWithin' == this._geoComparison ||
            '$near' == this._geoComparison ||
            '$geoIntersects' == this._geoComparison)) {
        throw new Error('geometry() must come after `within()`, `intersects()`, or `near()');
    }

    var val, path;

    if (1 === arguments.length) {
        this._ensurePath('geometry');
        path = this._path;
        val = arguments[0];
    } else {
        throw new TypeError('Invalid argument');
    }

    if (!(val.type && Array.isArray(val.coordinates))) {
        throw new TypeError('Invalid argument');
    }

    var conds = this._conditions[path] || (this._conditions[path] = {});
    conds[this._geoComparison] = {
        $geometry: val
    };

    return this;
}

// end spatial

/**
 * Specifies which document fields to include or exclude
 *
 * ####String syntax
 *
 * When passing a string, prefixing a path with `-` will flag that path as excluded. When a path does not have the `-` prefix, it is included.
 *
 * ####Example
 *
 *     // include a and b, exclude c
 *     query.select('a b -c');
 *
 *     // or you may use object notation, useful when
 *     // you have keys already prefixed with a "-"
 *     query.select({a: 1, b: 1, c: 0});
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @param {Object|String} arg
 * @return {Query} this
 * @see SchemaType
 * @api public
 */

Query.prototype.select = function select() {
    let arg = arguments[0];
    if (!arg) return this;

    if (arguments.length !== 1)
        throw new Error('Invalid select: select only takes 1 argument');


    this._validate('select');

    const fields = this._fields || (this._fields = {});
    const type = typeof arg;

    if (('string' == type || utils.isArgumentsObject(arg)) &&
        'number' == typeof arg.length) {
        if ('string' == type)
            arg = arg.split(/\s+/);

        for (let i = 0, len = arg.length; i < len; ++i) {
            let field = arg[i];
            if (!field) continue;
            const include = '-' == field[0] ? 0 : 1;
            if (include === 0) field = field.substring(1);
            fields[field] = include;
        }

        return this;
    }

    if (utils.isObject(arg) && !Array.isArray(arg)) {
        const keys = Object.keys(arg);
        for (let i = 0; i < keys.length; ++i)
            fields[keys[i]] = arg[keys[i]];

        return this;
    }

    throw new TypeError('Invalid select() argument. Must be string or object.');
}

/**
 * Specifies a $slice condition for a `path`
 *
 * ####Example
 *
 *     query.slice('comments', 5)
 *     query.slice('comments', -5)
 *     query.slice('comments', [10, 5])
 *     query.where('comments').slice(5)
 *     query.where('comments').slice([-10, 5])
 *
 * @param {String} [path]
 * @param {Number} val number/range of elements to slice
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Retrieving+a+Subset+of+Fields#RetrievingaSubsetofFields-RetrievingaSubrangeofArrayElements
 * @api public
 */

Query.prototype.slice = function() {
    if (0 === arguments.length)
        return this;

    this._validate('slice');

    let path;
    let val;

    if (1 === arguments.length) {
        const arg = arguments[0];
        if (typeof arg === 'object' && !Array.isArray(arg)) {
            const keys = Object.keys(arg);
            const numKeys = keys.length;
            for (let i = 0; i < numKeys; ++i)
                this.slice(keys[i], arg[keys[i]]);

            return this;
        }
        this._ensurePath('slice');
        path = this._path;
        val = arguments[0];
    } else if (2 === arguments.length) {
        if ('number' === typeof arguments[0]) {
            this._ensurePath('slice');
            path = this._path;
            val = arguments.slice();
        } else {
            path = arguments[0];
            val = arguments[1];
        }
    } else if (3 === arguments.length) {
        path = arguments[0];
        val = arguments.slice(1);
    }

    const myFields = this._fields || (this._fields = {});
    myFields[path] = {
        '$slice': val
    };
    return this;
};

/**
 * Sets the sort order
 *
 * If an object is passed, values allowed are 'asc', 'desc', 'ascending', 'descending', 1, and -1.
 *
 * If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
 *
 * ####Example
 *
 *     // these are equivalent
 *     query.sort({ field: 'asc', test: -1 });
 *     query.sort('field -test');
 *     query.sort([['field', 1], ['test', -1]]);
 *
 * ####Note
 *
 *  - The array syntax `.sort([['field', 1], ['test', -1]])` can only be used with [mongodb driver >= 2.0.46](https://github.com/mongodb/node-mongodb-native/blob/2.1/HISTORY.md#2046-2015-10-15).
 *  - Cannot be used with `distinct()`
 *
 * @param {Object|String|Array} arg
 * @return {Query} this
 * @api public
 */

Query.prototype.sort = function(arg) {
    if (!arg) return this;
    let len;

    this._validate('sort');

    let type = typeof arg;

    // .sort([['field', 1], ['test', -1]])
    if (Array.isArray(arg)) {
        len = arg.length;
        for (let i = 0; i < arg.length; ++i)
            _pushArr(this.options, arg[i][0], arg[i][1]);

        return this;
    }

    // .sort('field -test')
    if (1 === arguments.length && 'string' == type) {
        arg = arg.split(/\s+/);
        len = arg.length;
        for (let i = 0; i < len; ++i) {
            let field = arg[i];
            if (!field) continue;
            let ascend = '-' == field[0] ? -1 : 1;
            if (ascend === -1) field = field.substring(1);
            push(this.options, field, ascend);
        }

        return this;
    }

    // .sort({ field: 1, test: -1 })
    if (utils.isObject(arg)) {
        var keys = Object.keys(arg);
        for (var i = 0; i < keys.length; ++i) {
            var field = keys[i];
            push(this.options, field, arg[field]);
        }

        return this;
    }

    throw new TypeError('Invalid sort() argument. Must be a string, object, or array.');
}

/*!
 * @ignore
 */

function push(opts, field, value) {
    if (Array.isArray(opts.sort)) {
        throw new TypeError('Can\'t mix sort syntaxes. Use either array or object:' +
            '\n- `.sort([[\'field\', 1], [\'test\', -1]])`' +
            '\n- `.sort({ field: 1, test: -1 })`');
    }

    if (value && value.$meta) {
        var s = opts.sort || (opts.sort = {});
        s[field] = {
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
    var valueStr = value.toString()
        .replace('asc', '1')
        .replace('ascending', '1')
        .replace('desc', '-1')
        .replace('descending', '-1');
    s[field] = parseInt(valueStr, 10);
}

function _pushArr(opts, field, value) {
    opts.sort = opts.sort || [];
    if (!Array.isArray(opts.sort)) {
        throw new TypeError(`
          Can't mix sort syntaxes. Use either array or object:
            \n- .sort([['field', 1], ['test', -1]])
            \n- .sort({ field: 1, test: -1 })`);
    }
    var valueStr = value.toString()
        .replace('asc', '1')
        .replace('ascending', '1')
        .replace('desc', '-1')
        .replace('descending', '-1');
    opts.sort.push([field, value]);
}

/**
 * Specifies the limit option.
 *
 * ####Example
 *
 *     query.limit(20)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method limit
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D
 * @api public
 */
/**
 * Specifies the skip option.
 *
 * ####Example
 *
 *     query.skip(100).limit(20)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method skip
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D
 * @api public
 */
/**
 * Specifies the maxScan option.
 *
 * ####Example
 *
 *     query.maxScan(100)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method maxScan
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24maxScan
 * @api public
 */
/**
 * Specifies the batchSize option.
 *
 * ####Example
 *
 *     query.batchSize(100)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method batchSize
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D
 * @api public
 */
/**
 * Specifies the `comment` option.
 *
 * ####Example
 *
 *     query.comment('login query')
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method comment
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment
 * @api public
 */

/*!
 * limit, skip, maxScan, batchSize, comment
 *
 * Sets these associated options.
 *
 *     query.comment('feed query');
 */

;
['limit', 'skip', 'maxScan', 'batchSize', 'comment'].forEach(function(method) {
    Query.prototype[method] = function(v) {
        this._validate(method);
        this.options[method] = v;
        return this;
    };
})

/**
 * Specifies the maxTimeMS option.
 *
 * ####Example
 *
 *     query.maxTime(100)
 *
 * @method maxTime
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://docs.mongodb.org/manual/reference/operator/meta/maxTimeMS/#op._S_maxTimeMS
 * @api public
 */

Query.prototype.maxTime = function(v) {
    this._validate('maxTime');
    this.options.maxTimeMS = v;
    return this;
};

/**
 * Specifies this query as a `snapshot` query.
 *
 * ####Example
 *
 *     mquery().snapshot() // true
 *     mquery().snapshot(true)
 *     mquery().snapshot(false)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D
 * @return {Query} this
 * @api public
 */

Query.prototype.snapshot = function() {
    this._validate('snapshot');

    this.options.snapshot = arguments.length ?
        !!arguments[0] :
        true

    return this;
}

/**
 * Sets query hints.
 *
 * ####Example
 *
 *     query.hint({ indexA: 1, indexB: -1})
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @param {Object} val a hint object
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint
 * @api public
 */

Query.prototype.hint = function() {
    if (0 === arguments.length) return this;

    this._validate('hint');

    var arg = arguments[0];
    if (utils.isObject(arg)) {
        var hint = this.options.hint || (this.options.hint = {});

        // must keep object keys in order so don't use Object.keys()
        for (var k in arg) {
            hint[k] = arg[k];
        }

        return this;
    }

    throw new TypeError('Invalid hint. ' + arg);
}


/**
 * Sets tailable option.
 *
 * ####Example
 *
 *     query.tailable() <== true
 *     query.tailable(true)
 *     query.tailable(false)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @param {Boolean} v defaults to true
 * @see mongodb http://www.mongodb.org/display/DOCS/Tailable+Cursors
 * @api public
 */

Query.prototype.tailable = function() {
    this._validate('tailable');

    this.options.tailable = arguments.length ?
        !!arguments[0] :
        true;

    return this;
}

/**
 * Merges another Query or conditions object into this one.
 *
 * When a Query is passed, conditions, field selection and options are merged.
 *
 * @param {Query|Object} source
 * @return {Query} this
 */

Query.prototype.merge = function(source) {
    if (!source)
        return this;

    if (!Query.canMerge(source))
        throw new TypeError('Invalid argument. Expected instanceof mquery or plain object');

    if (source instanceof Query) {
        // if source has a feature, apply it to ourselves

        if (source._conditions) {
            utils.merge(this._conditions, source._conditions);
        }

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

        if (source._distinct) {
            this._distinct = source._distinct;
        }

        return this;
    }

    // plain object
    utils.merge(this._conditions, source);

    return this;
}

/**
 * Finds documents.
 *
 * Passing a `callback` executes the query.
 *
 * ####Example
 *
 *     query.find()
 *     query.find(callback)
 *     query.find({ name: 'Burning Lights' }, callback)
 *
 * @param {Object} [criteria] mongodb selector
 * @return {Query} this
 * @api public
 */

Query.prototype.find = function(criteria) {
    this.op = 'find';

    if ('function' === typeof criteria) {
        callback = criteria;
        criteria = undefined;
    } else if (Query.canMerge(criteria))
        this.merge(criteria);

    return this;
}




/**
 * Declares or executes a distinct() operation.
 *
 * Passing a `callback` executes the query.
 *
 * ####Example
 *
 *     distinct(criteria, field, fn)
 *     distinct(criteria, field)
 *     distinct(field, fn)
 *     distinct(field)
 *     distinct(fn)
 *     distinct()
 *
 * @param {Object|Query} [criteria]
 * @param {String} [field]
 * @param {Function} [callback]
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Aggregation#Aggregation-Distinct
 * @api public
 */
Query.prototype.distinct = function(criteria, field) {
    this.op = 'distinct';
    this._validate();

    switch (typeof field) {
        case 'function':
            callback = field;
            if ('string' == typeof criteria) {
                field = criteria;
                criteria = undefined;
            }
            break;
        case 'undefined':
        case 'string':
            break;
        default:
            throw new TypeError('Invalid `field` argument. Must be string or function');
            break;
    }

    switch (typeof criteria) {
        case 'function':
            callback = criteria;
            criteria = field = undefined;
            break;
        case 'string':
            field = criteria;
            criteria = undefined;
            break;
    }

    if ('string' == typeof field) {
        this._distinct = field;
    }

    if (Query.canMerge(criteria)) {
        this.merge(criteria);
    }


    return this;
};




/**
 * Determines if field selection has been made.
 *
 * @return {Boolean}
 * @api public
 */
Query.prototype.selected = function selected() {
    return !!(this._fields && Object.keys(this._fields).length > 0);
};

/**
 * Determines if inclusive field selection has been made.
 *
 *     query.selectedInclusively() // false
 *     query.select('name')
 *     query.selectedInclusively() // true
 *     query.selectedExlusively() // false
 *
 * @returns {Boolean}
 */

Query.prototype.selectedInclusively = function selectedInclusively() {
    if (!this._fields) return false;

    var keys = Object.keys(this._fields);
    if (0 === keys.length) return false;

    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (0 === this._fields[key]) return false;
        if (this._fields[key] &&
            typeof this._fields[key] === 'object' &&
            this._fields[key].$meta) {
            return false;
        }
    }

    return true;
};

/**
 * Determines if exclusive field selection has been made.
 *
 *     query.selectedExlusively() // false
 *     query.select('-name')
 *     query.selectedExlusively() // true
 *     query.selectedInclusively() // false
 *
 * @returns {Boolean}
 */

Query.prototype.selectedExclusively = function selectedExclusively() {
    if (!this._fields) return false;

    var keys = Object.keys(this._fields);
    if (0 === keys.length) return false;

    for (let i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (0 === this._fields[key]) return true;
    }

    return false;
};

/**
 * Merges `doc` with the current update object.
 *
 * @param {Object} doc
 */
Query.prototype._mergeUpdate = function(doc) {
    if (!this._update) this._update = {};
    if (doc instanceof Query) {
        if (doc._update)
            utils.mergeClone(this._update, doc._update);
    } else
        utils.mergeClone(this._update, doc);
};

/**
 * Returns default options.
 *
 * @return {Object}
 * @api private
 */

Query.prototype._optionsForExec = function() {
    var options = clone(this.options, {
        retainKeyOrder: true
    });
    return options;
};


/**
 * Make sure _path is set.
 *
 * @parmam {String} method
 */

Query.prototype._ensurePath = function(method) {
    if (!this._path) {
        var msg = method + '() must be used after where() ' +
            'when called with these arguments'
        throw new Error(msg);
    }
};

Query.prototype._validate = function(action) {};

/**
 * Determines if `conds` can be merged using `mquery().merge()`
 *
 * @param {Object} conds
 * @return {Boolean}
 */
Query.canMerge = function(conds) {
    return conds instanceof Query || utils.isObject(conds);
};


Query.utils = utils;
export default Query;
