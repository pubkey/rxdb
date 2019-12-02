/**
 * if a query is observed and a changeEvent comes in,
 * the QueryChangeDetector tries to execute the changeEvent-delta on the exisiting query-results
 * or tells the query it should re-exec on the database if previous not possible.
 *
 * This works equal to meteors oplog-observe-driver
 * @link https://github.com/meteor/docs/blob/version-NEXT/long-form/oplog-observe-driver.md
 */
import { CompareFunction } from 'array-push-at-sort-position';
import { RxQuery } from './types';
import { RxChangeEvent } from './rx-change-event';
export declare class QueryChangeDetector {
    query: RxQuery<any, any>;
    primaryKey: string;
    _sortOptions: any;
    constructor(query: RxQuery<any, any>);
    /**
     * @return true if mustReExec, false if no change, array if calculated new results
     */
    runChangeDetection(changeEvents: RxChangeEvent[]): boolean | Object[];
    /**
     * handle a single ChangeEvent and try to calculate the new results
     * @return true if mustReExec, false if no change, array if calculated new results
     */
    handleSingleChange(resultsData: any[], changeEvent: RxChangeEvent): boolean | any[];
}
/**
 * returns the sort-comparator
 * which results in the equal sorting that a new query over the db would do
 */
export declare function sortCompareFunction(queryChangeDetector: QueryChangeDetector): CompareFunction<any>;
/**
 * checks if the newDocLeft would be placed before docDataRight
 * when the query would be reExecuted
 * @return true if before, false if after
 */
export declare function _isSortedBefore(queryChangeDetector: QueryChangeDetector, docDataLeft: any, docDataRight: any): boolean;
/**
 * checks if the sort-relevant fields have changed
 */
export declare function _sortFieldChanged(queryChangeDetector: QueryChangeDetector, docDataBefore: any, docDataAfter: any): boolean;
/**
 * if no sort-order is specified,
 * pouchdb will use the primary
 */
export declare function _getSortOptions(queryChangeDetector: QueryChangeDetector): any[];
/**
 * check if the document exists in the results data
 */
export declare function _isDocInResultData(queryChangeDetector: QueryChangeDetector, docData: any, resultData: any[]): boolean;
export declare function enableDebugging(): void;
export declare function create(query: RxQuery<any, any>): QueryChangeDetector;
declare const _default: {
    create: typeof create;
    enableDebugging: typeof enableDebugging;
};
export default _default;
