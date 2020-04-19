import type { MangoQuery, MangoQuerySelector, MangoQuerySortPart } from '../../../types';
declare type MQueryOptions = {
    limit?: number;
    skip?: number;
    sort?: any;
};
export declare class NoSqlQueryBuilderClass<DocType> {
    options: MQueryOptions;
    _conditions: MangoQuerySelector<DocType>;
    _fields: any;
    _path?: any;
    private _distinct;
    /**
     * MQuery constructor used for building queries.
     *
     * ####Example:
     *     var query = new MQuery({ name: 'mquery' });
     *     query.where('age').gte(21).exec(callback);
     *
     */
    constructor(mangoQuery?: MangoQuery<DocType>);
    /**
     * Specifies a `path` for use with chaining.
     */
    where(_path: string, _val?: MangoQuerySelector<DocType>): NoSqlQueryBuilder<DocType>;
    /**
     * Specifies the complementary comparison value for paths specified with `where()`
     * ####Example
     *     User.where('age').equals(49);
     */
    equals(val: any): NoSqlQueryBuilder<DocType>;
    /**
     * Specifies the complementary comparison value for paths specified with `where()`
     * This is alias of `equals`
     */
    eq(val: any): NoSqlQueryBuilder<DocType>;
    /**
     * Specifies arguments for an `$or` condition.
     * ####Example
     *     query.or([{ color: 'red' }, { status: 'emergency' }])
     */
    or(array: any[]): NoSqlQueryBuilder<DocType>;
    /**
     * Specifies arguments for a `$nor` condition.
     * ####Example
     *     query.nor([{ color: 'green' }, { status: 'ok' }])
     */
    nor(array: any[]): NoSqlQueryBuilder<DocType>;
    /**
     * Specifies arguments for a `$and` condition.
     * ####Example
     *     query.and([{ color: 'green' }, { status: 'ok' }])
     * @see $and http://docs.mongodb.org/manual/reference/operator/and/
     */
    and(array: any[]): NoSqlQueryBuilder<DocType>;
    /**
     * Specifies a `$mod` condition
     */
    mod(_path: string, _val: number): NoSqlQueryBuilder<DocType>;
    /**
     * Specifies an `$exists` condition
     * ####Example
     *     // { name: { $exists: true }}
     *     Thing.where('name').exists()
     *     Thing.where('name').exists(true)
     *     Thing.find().exists('name')
     */
    exists(_path: string, _val: number): NoSqlQueryBuilder<DocType>;
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
    elemMatch(_path: string, _criteria: any): NoSqlQueryBuilder<DocType>;
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
    sort(arg: any): NoSqlQueryBuilder<DocType>;
    /**
     * Merges another MQuery or conditions object into this one.
     *
     * When a MQuery is passed, conditions, field selection and options are merged.
     *
     */
    merge(source: any): NoSqlQueryBuilder<DocType>;
    /**
     * Finds documents.
     * ####Example
     *     query.find()
     *     query.find({ name: 'Burning Lights' })
     */
    find(criteria: any): NoSqlQueryBuilder<DocType>;
    /**
     * Make sure _path is set.
     *
     * @parmam {String} method
     */
    _ensurePath(method: any): void;
    toJSON(): {
        query: MangoQuery<DocType>;
        path?: string;
    };
}
export declare function mQuerySortToRxDBSort<DocType>(sort: {
    [k: string]: 1 | -1;
}): MangoQuerySortPart<DocType>[];
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
export declare const OTHER_MANGO_ATTRIBUTES: string[];
/**
 * gt, gte, lt, lte, ne, in, nin, all, regex, size, maxDistance
 *
 *     Thing.where('type').nin(array)
 */
export declare const OTHER_MANGO_OPERATORS: string[];
/**
 * Determines if `conds` can be merged using `mquery().merge()`
 */
export declare function canMerge(conds: any): boolean;
export declare function createQueryBuilder<DocType>(query?: MangoQuery<DocType>): NoSqlQueryBuilder<DocType>;
export {};
