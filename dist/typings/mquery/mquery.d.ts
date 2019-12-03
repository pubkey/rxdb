import { RxQueryObject } from '../types';
export declare class MQueryBase {
    options: any;
    _conditions: RxQueryObject;
    _fields: any;
    _path: any;
    _update: any;
    private _distinct;
    /**
     * MQuery constructor used for building queries.
     *
     * ####Example:
     *     var query = new MQuery({ name: 'mquery' });
     *     query.where('age').gte(21).exec(callback);
     *
     */
    constructor(criteria?: any);
    /**
     * returns a cloned version of the query
     */
    clone(): MQuery;
    /**
     * Specifies a `path` for use with chaining.
     */
    where(_path: string, _val: any): MQueryBase;
    /**
     * Specifies the complementary comparison value for paths specified with `where()`
     * ####Example
     *     User.where('age').equals(49);
     */
    equals(val: any): MQueryBase;
    /**
     * Specifies the complementary comparison value for paths specified with `where()`
     * This is alias of `equals`
     */
    eq(val: any): MQueryBase;
    /**
     * Specifies arguments for an `$or` condition.
     * ####Example
     *     query.or([{ color: 'red' }, { status: 'emergency' }])
     */
    or(array: any[]): MQueryBase;
    /**
     * Specifies arguments for a `$nor` condition.
     * ####Example
     *     query.nor([{ color: 'green' }, { status: 'ok' }])
     */
    nor(array: any[]): MQueryBase;
    /**
     * Specifies arguments for a `$and` condition.
     * ####Example
     *     query.and([{ color: 'green' }, { status: 'ok' }])
     * @see $and http://docs.mongodb.org/manual/reference/operator/and/
     */
    and(array: any[]): MQueryBase;
    /**
     * Specifies a `$mod` condition
     */
    mod(_path: string, _val: number): MQueryBase;
    /**
     * Specifies an `$exists` condition
     * ####Example
     *     // { name: { $exists: true }}
     *     Thing.where('name').exists()
     *     Thing.where('name').exists(true)
     *     Thing.find().exists('name')
     */
    exists(_path: string, _val: number): MQueryBase;
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
    elemMatch(_path: string, _criteria: any): MQueryBase;
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
    sort(arg: any): MQueryBase;
    /**
     * Merges another MQuery or conditions object into this one.
     *
     * When a MQuery is passed, conditions, field selection and options are merged.
     *
     */
    merge(source: any): MQueryBase;
    /**
     * Finds documents.
     * ####Example
     *     query.find()
     *     query.find({ name: 'Burning Lights' })
     */
    find(criteria: any): MQueryBase;
    /**
     * Make sure _path is set.
     *
     * @parmam {String} method
     */
    _ensurePath(method: any): void;
}
export declare function createMQuery(criteria: any): MQuery;
export interface MQuery extends MQueryBase {
    limit: ReturnSelfFunction;
    skip: ReturnSelfFunction;
    maxScan: ReturnSelfFunction;
    batchSize: ReturnSelfFunction;
    comment: ReturnSelfFunction;
    gt: ReturnSelfFunction;
    gte: ReturnSelfFunction;
    lt: ReturnSelfFunction;
    lte: ReturnSelfFunction;
    ne: ReturnSelfFunction;
    in: ReturnSelfFunction;
    nin: ReturnSelfFunction;
    all: ReturnSelfFunction;
    regex: ReturnSelfFunction;
    size: ReturnSelfFunction;
}
declare type ReturnSelfFunction = (v: any) => MQueryBase;
/**
 * Determines if `conds` can be merged using `mquery().merge()`
 */
export declare function canMerge(conds: any): boolean;
export {};
