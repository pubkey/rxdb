import { BehaviorSubject } from 'rxjs';
import type { RxCollection, RxDocument, RxQueryOP, RxQuery, MangoQuery, MangoQuerySortPart, MangoQuerySelector } from './types';
import { PreparedQuery } from './rx-storate.interface';
export declare class RxQueryBase<RxDocumentType = any, RxQueryResult = RxDocument<RxDocumentType[]> | RxDocument<RxDocumentType>> {
    op: RxQueryOP;
    mangoQuery: Readonly<MangoQuery>;
    collection: RxCollection<RxDocumentType>;
    id: number;
    /**
     * Some stats then are used for debugging and cache replacement policies
     */
    _execOverDatabaseCount: number;
    _creationTime: number;
    _lastEnsureEqual: number;
    other: any;
    uncached: boolean;
    refCount$: BehaviorSubject<null>;
    constructor(op: RxQueryOP, mangoQuery: Readonly<MangoQuery>, collection: RxCollection<RxDocumentType>);
    get $(): BehaviorSubject<RxQueryResult>;
    _latestChangeEvent: -1 | any;
    _resultsData: any;
    _resultsDataMap: Map<string, RxDocumentType>;
    _lastExecStart: number;
    _lastExecEnd: number;
    _resultsDocs$: BehaviorSubject<any>;
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
    _$?: BehaviorSubject<RxQueryResult>;
    /**
     * set the new result-data as result-docs of the query
     * @param newResultData json-docs that were recieved from pouchdb
     */
    _setResultData(newResultData: any[]): RxDocument[];
    /**
     * executes the query on the database
     * @return results-array with document-data
     */
    _execOverDatabase(): Promise<any[]>;
    /**
     * Execute the query
     * To have an easier implementations,
     * just subscribe and use the first result
     */
    exec(throwIfMissing: true): Promise<RxDocument<RxDocumentType>>;
    exec(): Promise<RxQueryResult>;
    /**
     * cached call to get the massageSelector
     * @overwrites itself with the actual value
     */
    get massageSelector(): any;
    /**
     * returns a string that is used for equal-comparisons
     * @overwrites itself with the actual value
     */
    toString(): string;
    /**
     * returns the prepared query
     * @overwrites itself with the actual value
     */
    toJSON(): PreparedQuery<RxDocumentType>;
    /**
     * returns the key-compressed version of the query
     * @overwrites itself with the actual value
     */
    keyCompress(): MangoQuery<any>;
    /**
     * returns true if the document matches the query,
     * does not use the 'skip' and 'limit'
     * // TODO this was moved to rx-storage
     */
    doesDocumentDataMatch(docData: RxDocumentType | any): boolean;
    /**
     * deletes all found documents
     * @return promise with deleted documents
     */
    remove(): Promise<RxQueryResult>;
    /**
     * helper function to transform RxQueryBase to RxQuery type
     */
    get asRxQuery(): RxQuery<RxDocumentType, RxQueryResult>;
    /**
     * updates all found documents
     * @overwritten by plugin (optional)
     */
    update(_updateObj: any): Promise<RxQueryResult>;
    where(_queryObj: MangoQuerySelector<RxDocumentType> | keyof RxDocumentType | string): RxQuery<RxDocumentType, RxQueryResult>;
    sort(_params: string | MangoQuerySortPart<RxDocumentType>): RxQuery<RxDocumentType, RxQueryResult>;
    skip(_amount: number | null): RxQuery<RxDocumentType, RxQueryResult>;
    limit(_amount: number | null): RxQuery<RxDocumentType, RxQueryResult>;
}
export declare function _getDefaultQuery(collection: RxCollection): MangoQuery;
/**
 * run this query through the QueryCache
 */
export declare function tunnelQueryCache<RxDocumentType, RxQueryResult>(rxQuery: RxQueryBase<RxDocumentType, RxQueryResult>): RxQuery<RxDocumentType, RxQueryResult>;
export declare function createRxQuery(op: RxQueryOP, queryObj: MangoQuery, collection: RxCollection): RxQueryBase<any, any>;
export declare function isInstanceOf(obj: any): boolean;
