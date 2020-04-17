/**
 * this is based on
 * @link https://github.com/aheckmann/mquery/blob/master/lib/mquery.js
 */
import {
    isObject,
    merge
} from './mquery-utils';
import {
    newRxTypeError,
    newRxError
} from '../../../rx-error';
import type {
    MangoQuery,
    MangoQuerySelector,
    MangoQuerySortPart,
    MangoQuerySortDirection
} from '../../../types';


declare type MQueryOptions = {
    limit?: number;
    skip?: number;
    sort?: any;
};

export class NoSqlQueryBuilderClass<DocType> {

    public options: MQueryOptions = {};
    public _conditions: MangoQuerySelector<DocType> = {};
    public _fields: any = {};
    public _path?: any;
    private _distinct: any;

    /**
     * MQuery constructor used for building queries.
     *
     * ####Example:
     *     var query = new MQuery({ name: 'mquery' });
     *     query.where('age').gte(21).exec(callback);
     *
     */
    constructor(
        mangoQuery?: MangoQuery<DocType>
    ) {
        if (mangoQuery) {
            const queryBuilder: NoSqlQueryBuilder<DocType> = this as any;

            if (mangoQuery.selector) {
                queryBuilder.find(mangoQuery.selector);
            }
            if (mangoQuery.limit) {
                queryBuilder.limit(mangoQuery.limit);
            }
            if (mangoQuery.skip) {
                queryBuilder.skip(mangoQuery.skip);
            }
            if (mangoQuery.sort) {
                mangoQuery.sort.forEach(s => queryBuilder.sort(s));
            }
        }
    }

    /**
     * Specifies a `path` for use with chaining.
     */
    where(_path: string, _val?: MangoQuerySelector<DocType>): NoSqlQueryBuilder<DocType> {
        if (!arguments.length) return this as any;
        const type = typeof arguments[0];
        if ('string' === type) {
            this._path = arguments[0];
            if (2 === arguments.length) {
                this._conditions[this._path] = arguments[1];
            }
            return this as any;
        }

        if ('object' === type && !Array.isArray(arguments[0])) {
            return this.merge(arguments[0]);
        }

        throw newRxTypeError('MQ1', {
            path: arguments[0]
        });
    }

    /**
     * Specifies the complementary comparison value for paths specified with `where()`
     * ####Example
     *     User.where('age').equals(49);
     */
    equals(val: any): NoSqlQueryBuilder<DocType> {
        this._ensurePath('equals');
        const path = this._path;
        this._conditions[path] = val;
        return this as any;
    }

    /**
     * Specifies the complementary comparison value for paths specified with `where()`
     * This is alias of `equals`
     */
    eq(val: any): NoSqlQueryBuilder<DocType> {
        this._ensurePath('eq');
        const path = this._path;
        this._conditions[path] = val;
        return this as any;
    }

    /**
     * Specifies arguments for an `$or` condition.
     * ####Example
     *     query.or([{ color: 'red' }, { status: 'emergency' }])
     */
    or(array: any[]): NoSqlQueryBuilder<DocType> {
        const or = this._conditions.$or || (this._conditions.$or = []);
        if (!Array.isArray(array)) array = [array];
        or.push.apply(or, array);
        return this as any;
    }

    /**
     * Specifies arguments for a `$nor` condition.
     * ####Example
     *     query.nor([{ color: 'green' }, { status: 'ok' }])
     */
    nor(array: any[]): NoSqlQueryBuilder<DocType> {
        const nor = this._conditions.$nor || (this._conditions.$nor = []);
        if (!Array.isArray(array)) array = [array];
        nor.push.apply(nor, array);
        return this as any;
    }

    /**
     * Specifies arguments for a `$and` condition.
     * ####Example
     *     query.and([{ color: 'green' }, { status: 'ok' }])
     * @see $and http://docs.mongodb.org/manual/reference/operator/and/
     */
    and(array: any[]): NoSqlQueryBuilder<DocType> {
        const and = this._conditions.$and || (this._conditions.$and = []);
        if (!Array.isArray(array)) array = [array];
        and.push.apply(and, array);
        return this as any;
    }

    /**
     * Specifies a `$mod` condition
     */
    mod(_path: string, _val: number): NoSqlQueryBuilder<DocType> {
        let val;
        let path;

        if (1 === arguments.length) {
            this._ensurePath('mod');
            val = arguments[0];
            path = this._path;
        } else if (2 === arguments.length && !Array.isArray(arguments[1])) {
            this._ensurePath('mod');
            val = (arguments as any).slice();
            path = this._path;
        } else if (3 === arguments.length) {
            val = (arguments as any).slice(1);
            path = arguments[0];
        } else {
            val = arguments[1];
            path = arguments[0];
        }

        const conds = this._conditions[path] || (this._conditions[path] = {});
        conds.$mod = val;
        return this as any;
    }

    /**
     * Specifies an `$exists` condition
     * ####Example
     *     // { name: { $exists: true }}
     *     Thing.where('name').exists()
     *     Thing.where('name').exists(true)
     *     Thing.find().exists('name')
     */
    exists(_path: string, _val: number): NoSqlQueryBuilder<DocType> {
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
        return this as any;
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
     */
    elemMatch(_path: string, _criteria: any): NoSqlQueryBuilder<DocType> {
        if (null === arguments[0])
            throw newRxTypeError('MQ2');

        let fn;
        let path;
        let criteria;

        if ('function' === typeof arguments[0]) {
            this._ensurePath('elemMatch');
            path = this._path;
            fn = arguments[0];
        } else if (isObject(arguments[0])) {
            this._ensurePath('elemMatch');
            path = this._path;
            criteria = arguments[0];
        } else if ('function' === typeof arguments[1]) {
            path = arguments[0];
            fn = arguments[1];
        } else if (arguments[1] && isObject(arguments[1])) {
            path = arguments[0];
            criteria = arguments[1];
        } else
            throw newRxTypeError('MQ2');

        if (fn) {
            criteria = new NoSqlQueryBuilderClass;
            fn(criteria);
            criteria = criteria._conditions;
        }

        const conds = this._conditions[path] || (this._conditions[path] = {});
        conds.$elemMatch = criteria;
        return this as any;
    }

    /**
     * Sets the sort order
     * If an object is passed, values allowed are 'asc', 'desc', 'ascending', 'descending', 1, and -1.
     * If a string is passed, it must be a space delimited list of path names.
     * The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
     * ####Example
     *     query.sort({ field: 'asc', test: -1 });
     *     query.sort('field -test');
     *     query.sort([['field', 1], ['test', -1]]);
     */
    sort(arg: any): NoSqlQueryBuilder<DocType> {
        if (!arg) return this as any;
        let len;
        const type = typeof arg;
        // .sort([['field', 1], ['test', -1]])
        if (Array.isArray(arg)) {
            len = arg.length;
            for (let i = 0; i < arg.length; ++i) {
                _pushArr(this.options, arg[i][0], arg[i][1]);
            }

            return this as any;
        }

        // .sort('field -test')
        if (1 === arguments.length && 'string' === type) {
            arg = arg.split(/\s+/);
            len = arg.length;
            for (let i = 0; i < len; ++i) {
                let field = arg[i];
                if (!field) continue;
                const ascend = '-' === field[0] ? -1 : 1;
                if (ascend === -1) field = field.substring(1);
                push(this.options, field, ascend);
            }

            return this as any;
        }

        // .sort({ field: 1, test: -1 })
        if (isObject(arg)) {
            const keys = Object.keys(arg);
            keys.forEach(field => push(this.options, field, arg[field]));
            return this as any;
        }

        throw newRxTypeError('MQ3', {
            args: arguments
        });
    }

    /**
     * Merges another MQuery or conditions object into this one.
     *
     * When a MQuery is passed, conditions, field selection and options are merged.
     *
     */
    merge(source: any): NoSqlQueryBuilder<DocType> {
        if (!source) {
            return this as any;
        }

        if (!canMerge(source)) {
            throw newRxTypeError('MQ4', {
                source
            });
        }

        if (source instanceof NoSqlQueryBuilderClass) {
            // if source has a feature, apply it to ourselves

            if (source._conditions)
                merge(this._conditions, source._conditions);

            if (source._fields) {
                if (!this._fields) this._fields = {};
                merge(this._fields, source._fields);
            }

            if (source.options) {
                if (!this.options) this.options = {};
                merge(this.options, source.options);
            }

            if (source._distinct)
                this._distinct = source._distinct;

            return this as any;
        }

        // plain object
        merge(this._conditions, source);

        return this as any;
    }

    /**
     * Finds documents.
     * ####Example
     *     query.find()
     *     query.find({ name: 'Burning Lights' })
     */
    find(criteria: any): NoSqlQueryBuilder<DocType> {
        if (canMerge(criteria)) {
            this.merge(criteria);
        }

        return this as any;
    }

    /**
     * Make sure _path is set.
     *
     * @parmam {String} method
     */
    _ensurePath(method: any) {
        if (!this._path) {
            throw newRxError('MQ5', {
                method
            });
        }
    }

    toJSON(): {
        query: MangoQuery<DocType>,
        path?: string
    } {
        const query: MangoQuery<DocType> = {
            selector: this._conditions,
        };

        if (this.options.skip) {
            query.skip = this.options.skip;
        }
        if (this.options.limit) {
            query.limit = this.options.limit;
        }
        if (this.options.sort) {
            query.sort = mQuerySortToRxDBSort(this.options.sort);
        }

        return {
            query,
            path: this._path
        };
    }
}

export function mQuerySortToRxDBSort<DocType>(
    sort: { [k: string]: 1 | -1 }
): MangoQuerySortPart<DocType>[] {
    return Object.entries(sort).map(([k, v]) => {
        const direction: MangoQuerySortDirection = v === 1 ? 'asc' : 'desc';
        const part: MangoQuerySortPart<DocType> = { [k]: direction } as any;
        return part;
    });
}

/**
 * Because some prototype-methods are generated,
 * we have to define the type of NoSqlQueryBuilder here
 */

export interface NoSqlQueryBuilder<DocType = any> extends NoSqlQueryBuilderClass<DocType> {
    maxScan: ReturnSelfNumberFunction<DocType>;
    batchSize: ReturnSelfNumberFunction<DocType>;
    limit: ReturnSelfNumberFunction<DocType>;
    skip: ReturnSelfNumberFunction<DocType>;
    comment: ReturnSelfFunction<DocType>;

    gt: ReturnSelfFunction<DocType>;
    gte: ReturnSelfFunction<DocType>;
    lt: ReturnSelfFunction<DocType>;
    lte: ReturnSelfFunction<DocType>;
    ne: ReturnSelfFunction<DocType>;
    in: ReturnSelfFunction<DocType>;
    nin: ReturnSelfFunction<DocType>;
    all: ReturnSelfFunction<DocType>;
    regex: ReturnSelfFunction<DocType>;
    size: ReturnSelfFunction<DocType>;

}

declare type ReturnSelfFunction<DocType> = (v: any) => NoSqlQueryBuilder<DocType>;
declare type ReturnSelfNumberFunction<DocType> = (v: number | null) => NoSqlQueryBuilder<DocType>;

/**
 * limit, skip, maxScan, batchSize, comment
 *
 * Sets these associated options.
 *
 *     query.comment('feed query');
 */
export const OTHER_MANGO_ATTRIBUTES = ['limit', 'skip', 'maxScan', 'batchSize', 'comment'];
OTHER_MANGO_ATTRIBUTES.forEach(function (method) {
    (NoSqlQueryBuilderClass.prototype as any)[method] = function (v: any) {
        this.options[method] = v;
        return this;
    };
});


/**
 * gt, gte, lt, lte, ne, in, nin, all, regex, size, maxDistance
 *
 *     Thing.where('type').nin(array)
 */
export const OTHER_MANGO_OPERATORS = [
    'gt', 'gte', 'lt', 'lte', 'ne',
    'in', 'nin', 'all', 'regex', 'size'
];
OTHER_MANGO_OPERATORS.forEach(function ($conditional) {
    (NoSqlQueryBuilderClass.prototype as any)[$conditional] = function () {
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


function push(opts: any, field: string, value: any) {
    if (Array.isArray(opts.sort)) {
        throw newRxTypeError('MQ6', {
            opts,
            field,
            value
        });
    }

    if (value && value.$meta) {
        const sort = opts.sort || (opts.sort = {});
        sort[field] = {
            $meta: value.$meta
        };
        return;
    }

    const val = String(value || 1).toLowerCase();
    if (!/^(?:ascending|asc|descending|desc|1|-1)$/.test(val)) {
        if (Array.isArray(value)) value = '[' + value + ']';
        throw newRxTypeError('MQ7', {
            field,
            value
        });
    }
    // store `sort` in a sane format
    const s = opts.sort || (opts.sort = {});
    const valueStr = value.toString()
        .replace('asc', '1')
        .replace('ascending', '1')
        .replace('desc', '-1')
        .replace('descending', '-1');
    s[field] = parseInt(valueStr, 10);
}

function _pushArr(opts: any, field: string, value: any) {
    opts.sort = opts.sort || [];
    if (!Array.isArray(opts.sort)) {
        throw newRxTypeError('MQ8', {
            opts,
            field,
            value
        });
    }

    /*    const valueStr = value.toString()
            .replace('asc', '1')
            .replace('ascending', '1')
            .replace('desc', '-1')
            .replace('descending', '-1');*/
    opts.sort.push([field, value]);
}


/**
 * Determines if `conds` can be merged using `mquery().merge()`
 */
export function canMerge(conds: any): boolean {
    return conds instanceof NoSqlQueryBuilderClass || isObject(conds);
}


export function createQueryBuilder<DocType>(query?: MangoQuery<DocType>): NoSqlQueryBuilder<DocType> {
    return new NoSqlQueryBuilderClass(query) as NoSqlQueryBuilder<DocType>;
}
