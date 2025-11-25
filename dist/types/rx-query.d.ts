import { BehaviorSubject, Observable } from 'rxjs';
import type { RxCollection, RxDocument, RxQueryOP, RxQuery, MangoQuery, MangoQuerySortPart, MangoQuerySelector, PreparedQuery, RxDocumentWriteData, RxDocumentData, QueryMatcher, ModifyFunction } from './types/index.d.ts';
import { RxQuerySingleResult } from './rx-query-single-result.ts';
export declare class RxQueryBase<RxDocType, RxQueryResult, OrmMethods = {}, Reactivity = unknown> {
    op: RxQueryOP;
    mangoQuery: Readonly<MangoQuery<RxDocType>>;
    collection: RxCollection<RxDocType>;
    other: any;
    id: number;
    /**
     * Some stats then are used for debugging and cache replacement policies
     */
    _execOverDatabaseCount: number;
    _creationTime: number;
    _lastEnsureEqual: number;
    uncached: boolean;
    refCount$: BehaviorSubject<null>;
    isFindOneByIdQuery: false | string | string[];
    /**
     * Contains the current result state
     * or null if query has not run yet.
     */
    _result: RxQuerySingleResult<RxDocType> | null;
    constructor(op: RxQueryOP, mangoQuery: Readonly<MangoQuery<RxDocType>>, collection: RxCollection<RxDocType>, other?: any);
    get $(): Observable<RxQueryResult>;
    get $$(): Reactivity;
    _latestChangeEvent: -1 | number;
    /**
     * ensures that the exec-runs
     * are not run in parallel
     */
    _ensureEqualQueue: Promise<boolean>;
    /**
     * Returns an observable that emits the results
     * This should behave like an rxjs-BehaviorSubject which means:
     * - Emit the current result-set on subscribe
     * - Emit the new result-set when an RxChangeEvent comes in
     * - Do not emit anything before the first result-set was created (no null)
     */
    _$?: Observable<RxQueryResult>;
    /**
     * set the new result-data as result-docs of the query
     * @param newResultData json-docs that were received from the storage
     */
    _setResultData(newResultData: RxDocumentData<RxDocType>[] | number | Map<string, RxDocumentData<RxDocType>>): void;
    /**
     * executes the query on the database
     * @return results-array with document-data
     */
    _execOverDatabase(): Promise<{
        result: RxDocumentData<RxDocType>[] | number;
        counter: number;
    }>;
    /**
     * Execute the query
     * To have an easier implementations,
     * just subscribe and use the first result
     */
    exec(throwIfMissing: true): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;
    exec(): Promise<RxQueryResult>;
    /**
     * cached call to get the queryMatcher
     * @overwrites itself with the actual value
     */
    get queryMatcher(): QueryMatcher<RxDocumentWriteData<RxDocType>>;
    /**
     * returns a string that is used for equal-comparisons
     * @overwrites itself with the actual value
     */
    toString(): string;
    /**
     * returns the prepared query
     * which can be send to the storage instance to query for documents.
     * @overwrites itself with the actual value.
     */
    getPreparedQuery(): PreparedQuery<RxDocType>;
    /**
     * returns true if the document matches the query,
     * does not use the 'skip' and 'limit'
     */
    doesDocumentDataMatch(docData: RxDocType | any): boolean;
    /**
     * deletes all found documents
     * @return promise with deleted documents
     */
    remove(): Promise<RxQueryResult>;
    incrementalRemove(): Promise<RxQueryResult>;
    /**
     * helper function to transform RxQueryBase to RxQuery type
     */
    get asRxQuery(): RxQuery<RxDocType, RxQueryResult>;
    /**
     * updates all found documents
     * @overwritten by plugin (optional)
     */
    update(_updateObj: any): Promise<RxQueryResult>;
    patch(patch: Partial<RxDocType>): Promise<RxQueryResult>;
    incrementalPatch(patch: Partial<RxDocType>): Promise<RxQueryResult>;
    modify(mutationFunction: ModifyFunction<RxDocType>): Promise<RxQueryResult>;
    incrementalModify(mutationFunction: ModifyFunction<RxDocType>): Promise<RxQueryResult>;
    where(_queryObj: MangoQuerySelector<RxDocType> | keyof RxDocType | string): RxQuery<RxDocType, RxQueryResult>;
    sort(_params: string | MangoQuerySortPart<RxDocType>): RxQuery<RxDocType, RxQueryResult>;
    skip(_amount: number | null): RxQuery<RxDocType, RxQueryResult>;
    limit(_amount: number | null): RxQuery<RxDocType, RxQueryResult>;
}
export declare function _getDefaultQuery<RxDocType>(): MangoQuery<RxDocType>;
/**
 * run this query through the QueryCache
 */
export declare function tunnelQueryCache<RxDocumentType, RxQueryResult>(rxQuery: RxQueryBase<RxDocumentType, RxQueryResult>): RxQuery<RxDocumentType, RxQueryResult>;
export declare function createRxQuery<RxDocType>(op: RxQueryOP, queryObj: MangoQuery<RxDocType>, collection: RxCollection<RxDocType>, other?: any): RxQueryBase<RxDocType, any, {}, unknown>;
/**
 * Runs the query over the storage instance
 * of the collection.
 * Does some optimizations to ensure findById is used
 * when specific queries are used.
 */
export declare function queryCollection<RxDocType>(rxQuery: RxQuery<RxDocType> | RxQueryBase<RxDocType, any>): Promise<{
    docs: RxDocumentData<RxDocType>[];
    /**
     * We need to remember the counter directly here
     * because getting if after the returned Promise is resolved,
     * can result in a value that no longer matches the result set.
     */
    counter: number;
}>;
/**
 * Returns true if the given query
 * selects exactly one document by its id.
 * Used to optimize performance because these kind of
 * queries do not have to run over an index and can use get-by-id instead.
 * Returns false if no query of that kind.
 * Returns the document id otherwise.
 */
export declare function isFindOneByIdQuery(primaryPath: string, query: MangoQuery<any>): false | string | string[];
export declare function isRxQuery(obj: any): boolean;
