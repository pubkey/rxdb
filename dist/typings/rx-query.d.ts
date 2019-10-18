import { BehaviorSubject } from 'rxjs';
import { MQuery } from './mquery/mquery';
import { QueryChangeDetector } from './query-change-detector';
import { RxCollection, RxDocument, PouchdbQuery, RxQueryOP, RxQuery } from './types';
export declare class RxQueryBase<RxDocumentType = any, RxQueryResult = RxDocumentType[] | RxDocumentType> {
    op: RxQueryOP;
    queryObj: any;
    collection: RxCollection<RxDocumentType>;
    constructor(op: RxQueryOP, queryObj: any, collection: RxCollection<RxDocumentType>);
    readonly $: BehaviorSubject<RxQueryResult>;
    readonly massageSelector: any;
    id: number;
    mquery: MQuery;
    _latestChangeEvent: -1 | any;
    _resultsData: any;
    _resultsDocs$: BehaviorSubject<any>;
    _queryChangeDetector: QueryChangeDetector;
    /**
     * counts how often the execution on the whole db was done
     * (used for tests and debugging)
     */
    _execOverDatabaseCount: number;
    /**
     * ensures that the exec-runs
     * are not run in parallel
     */
    _ensureEqualQueue: Promise<boolean>;
    private stringRep?;
    /**
     * Returns an observable that emits the results
     * This should behave like an rxjs-BehaviorSubject which means:
     * - Emit the current result-set on subscribe
     * - Emit the new result-set when an RxChangeEvent comes in
     * - Do not emit anything before the first result-set was created (no null)
     */
    private _$?;
    private _toJSON;
    /**
     * get the key-compression version of this query
     */
    private _keyCompress?;
    /**
     * cached call to get the massageSelector
     */
    private _massageSelector?;
    toString(): string;
    _clone(): RxQueryBase<RxDocumentType, RxDocumentType | RxDocumentType[]>;
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
    exec(): Promise<RxQueryResult>;
    toJSON(): PouchdbQuery;
    keyCompress(): PouchdbQuery | {
        selector: {};
        sort: [];
    } | undefined;
    /**
     * returns true if the document matches the query,
     * does not use the 'skip' and 'limit'
     */
    doesDocumentDataMatch(docData: RxDocumentType | any): boolean;
    /**
     * deletes all found documents
     * @return promise with deleted documents
     */
    remove(): Promise<RxQueryResult>;
    /**
     * updates all found documents
     * @overwritten by plugin (optinal)
     */
    update(_updateObj: any): Promise<RxQueryResult>;
    /**
     * regex cannot run on primary _id
     * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
     */
    regex(params: any): RxQuery<RxDocumentType, RxQueryResult>;
    /**
     * make sure it searches index because of pouchdb-find bug
     * @link https://github.com/nolanlawson/pouchdb-find/issues/204
     */
    sort(params: any): RxQuery<RxDocumentType, RxQueryResult>;
    limit(amount: number): RxQuery<RxDocumentType, RxQueryResult>;
}
export declare function createRxQuery(op: RxQueryOP, queryObj: any, collection: RxCollection): RxQueryBase<any, any>;
export declare function isInstanceOf(obj: any): boolean;
