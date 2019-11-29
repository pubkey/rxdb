/**
 * if a query is observed and a changeEvent comes in,
 * the QueryChangeDetector tries to execute the changeEvent-delta on the exisiting query-results
 * or tells the query it should re-exec on the database if previous not possible.
 *
 * This works equal to meteors oplog-observe-driver
 * @link https://github.com/meteor/docs/blob/version-NEXT/long-form/oplog-observe-driver.md
 */

import {
    filterInMemoryFields
} from 'pouchdb-selector-core';
import objectPath from 'object-path';
import {
    CompareFunction,
    pushAtSortPosition
} from 'array-push-at-sort-position';
import {
    RxQuery
} from './types';
import {
    RxChangeEvent
} from './rx-change-event';
import {
    removeOneFromArrayIfMatches
} from './util';

let DEBUG = false;

export class QueryChangeDetector {
    public primaryKey: string;
    public _sortOptions: any;
    constructor(
        public query: RxQuery<any, any>
    ) {
        this.primaryKey = query.collection.schema.primaryPath as string;
    }

    /**
     * @return true if mustReExec, false if no change, array if calculated new results
     */
    runChangeDetection(changeEvents: RxChangeEvent[]): boolean | Object[] {
        if (changeEvents.length === 0) return false;

        // check if enabled
        if (!this.query.collection.database.queryChangeDetection) {
            return true;
        }

        let resultsData = this.query._resultsData;
        let changed = false;

        const found = changeEvents.find(changeEvent => {
            const res = this.handleSingleChange(resultsData, changeEvent);
            if (Array.isArray(res)) {
                changed = true;
                resultsData = res;
                return false;
            } else if (res) return true;
        });

        if (found) return true;
        if (!changed) return false;
        else return resultsData;
    }

    /**
     * handle a single ChangeEvent and try to calculate the new results
     * @return true if mustReExec, false if no change, array if calculated new results
     */
    handleSingleChange(resultsData: any[], changeEvent: RxChangeEvent): boolean | any[] {
        let results = resultsData.slice(0); // copy to stay immutable
        const options = this.query.toJSON();
        const docData = changeEvent.data.v;
        const wasDocInResults = _isDocInResultData(this, docData, resultsData);
        const doesMatchNow = this.query.doesDocumentDataMatch(docData);
        const isFilled = !options.limit || (options.limit && resultsData.length >= options.limit);
        const limitAndFilled = options.limit && resultsData.length >= options.limit;

        if (DEBUG) {
            console.log('QueryChangeDetector.handleSingleChange()'); // TODO this should not be an error
            _debugMessage(this, 'start', changeEvent.data.v, 'handleSingleChange()');
            console.log('changeEvent.data:');
            console.dir(changeEvent.data);
            console.log('wasDocInResults: ' + wasDocInResults);
            console.log('doesMatchNow: ' + doesMatchNow);
            console.log('isFilled: ' + isFilled);
            console.log('options:' + JSON.stringify(options));
        }


        let _sortAfter: any = null;
        const sortAfter = () => {
            if (_sortAfter === null)
                _sortAfter = _isSortedBefore(this, results[results.length - 1], docData);
            return _sortAfter;
        };

        let _sortBefore: any = null;
        const sortBefore = () => {
            if (_sortBefore === null)
                _sortBefore = _isSortedBefore(this, docData, results[0]);
            return _sortBefore;
        };

        let __sortFieldChanged: any = null;
        const sortFieldChanged = () => {
            if (__sortFieldChanged === null) {
                const docBefore = removeOneFromArrayIfMatches(resultsData, doc => doc[this.primaryKey] === docData[this.primaryKey]);
                __sortFieldChanged = _sortFieldChanged(this, docBefore, docData);
            }
            return _sortFieldChanged;
        };

        // console.log('## ' + results.length);

        if (changeEvent.data.op === 'REMOVE') {
            // R1 (never matched)
            if (!wasDocInResults && !doesMatchNow) {
                _debugMessage(this, 'R1', docData);
                return false;
            }

            // R2 sorted before got removed but results not filled
            if (options.skip && doesMatchNow && sortBefore() && !isFilled) {
                _debugMessage(this, 'R2', docData);
                results.shift();
                return results;
            }

            // R3 (was in results and got removed)
            if (doesMatchNow && wasDocInResults && !isFilled) {
                _debugMessage(this, 'R3', docData);
                results = removeOneFromArrayIfMatches(results, doc => doc[this.primaryKey] === docData[this.primaryKey]);
                return results;
            }

            // R3.05 was in findOne-result and got removed
            if (options.limit === 1 && !doesMatchNow && wasDocInResults) {
                _debugMessage(this, 'R3.05', docData);
                return true;
            }

            // R3.1 was in results and got removed, no limit, no skip
            if (doesMatchNow && wasDocInResults && !options.limit && !options.skip) {
                _debugMessage(this, 'R3.1', docData);
                results = removeOneFromArrayIfMatches(results, doc => doc[this.primaryKey] === docData[this.primaryKey]);
                return results;
            }


            // R4 matching but after results got removed
            if (doesMatchNow && options.limit && sortAfter()) {
                _debugMessage(this, 'R4', docData);
                return false;
            }
        } else {
            // U1 doc not matched and also not matches now
            if (!options.skip && !wasDocInResults && !doesMatchNow) {
                _debugMessage(this, 'U1', docData);
                return false;
            }

            // U2 still matching -> only resort
            if (!options.skip && !options.limit && wasDocInResults && doesMatchNow) {
                // DEBUG && this._debugMessage('U2', docData);

                if (sortFieldChanged()) {
                    _debugMessage(this, 'U2 - resort', docData);

                    // remove and insert at new sort position
                    results = removeOneFromArrayIfMatches(results, doc => doc[this.primaryKey] === docData[this.primaryKey]);
                    results = pushAtSortPosition(
                        results,
                        docData,
                        sortCompareFunction(this)
                    );
                    return results;

                } else {
                    _debugMessage(this, 'U2 - no-resort', docData);

                    // replace but make sure its the same position
                    const wasDoc = results.find(doc => doc[this.primaryKey] === docData[this.primaryKey]);
                    const i = results.indexOf(wasDoc);
                    results[i] = docData;

                    return results;
                }
            }


            // U3 not matched, but matches now, no.skip, limit < length
            if (!options.skip && !limitAndFilled && !wasDocInResults && doesMatchNow) {
                _debugMessage(this, 'U3', docData);
                results = pushAtSortPosition(
                    results,
                    docData,
                    sortCompareFunction(this)
                );
                return results;
            }
        }

        // if no optimisation-algo matches, return mustReExec:true
        _debugMessage(this, 'NO_MATCH', docData);

        return true;
    }
}

function _debugMessage(
    queryChangeDetector: QueryChangeDetector,
    key: string,
    changeEventData: any = {},
    title = 'optimized'
) {
    if (!DEBUG) {
        return;
    }
    console.dir({
        name: 'QueryChangeDetector',
        title,
        query: queryChangeDetector.query.toString(),
        key,
        changeEventData
    });
}


const sortCompareFunctionCache: WeakMap<QueryChangeDetector, CompareFunction<any>> = new WeakMap();
/**
 * returns the sort-comparator
 * which results in the equal sorting that a new query over the db would do
 */
export function sortCompareFunction(
    queryChangeDetector: QueryChangeDetector
): CompareFunction<any> {
    if (!sortCompareFunctionCache.has(queryChangeDetector)) {
        const sortOptions = _getSortOptions(queryChangeDetector);
        const inMemoryFields = Object.keys(queryChangeDetector.query.toJSON().selector);

        const fun: CompareFunction<any> = (a: any, b: any) => {
            // TODO use createFieldSorter
            const rows = [a, b].map(doc => {
                return {
                    doc: queryChangeDetector.query.collection.schema.swapPrimaryToId(doc)
                };
            });

            const sortedRows: { doc: any }[] = filterInMemoryFields(
                rows, {
                selector: queryChangeDetector.query.massageSelector,
                sort: sortOptions
            }, inMemoryFields);

            if (sortedRows[0].doc._id === rows[0].doc._id) {
                return -1;
            } else {
                return 1;
            }
        };
        sortCompareFunctionCache.set(queryChangeDetector, fun);
        return fun;
    } else {
        return sortCompareFunctionCache.get(queryChangeDetector) as CompareFunction<any>;
    }
}

/**
 * checks if the newDocLeft would be placed before docDataRight
 * when the query would be reExecuted
 * @return true if before, false if after
 */
export function _isSortedBefore(
    queryChangeDetector: QueryChangeDetector,
    docDataLeft: any,
    docDataRight: any
): boolean {
    const comparator = sortCompareFunction(queryChangeDetector);
    const result = comparator(docDataLeft, docDataRight);
    return result !== 1;
}


/**
 * checks if the sort-relevant fields have changed
 */
export function _sortFieldChanged(
    queryChangeDetector: QueryChangeDetector,
    docDataBefore: any,
    docDataAfter: any
): boolean {
    const sortOptions = _getSortOptions(queryChangeDetector);
    const sortFields = sortOptions.map(sortObj => Object.keys(sortObj).pop());

    let changed = false;
    sortFields.find(field => {
        const beforeData = objectPath.get(docDataBefore, field as string);
        const afterData = objectPath.get(docDataAfter, field as string);
        if (beforeData !== afterData) {
            changed = true;
            return true;
        } else return false;
    });
    return changed;
}

/**
 * if no sort-order is specified,
 * pouchdb will use the primary
 */
export function _getSortOptions(
    queryChangeDetector: QueryChangeDetector
): any[] {
    if (!queryChangeDetector._sortOptions) {
        const options = queryChangeDetector.query.toJSON();
        let sortOptions = options.sort;
        if (!sortOptions) {
            sortOptions = [{
                _id: 'asc'
            }];
        }
        queryChangeDetector._sortOptions = sortOptions;
    }
    return queryChangeDetector._sortOptions;
}


/**
 * check if the document exists in the results data
 */
export function _isDocInResultData(
    queryChangeDetector: QueryChangeDetector,
    docData: any,
    resultData: any[]
): boolean {
    const primaryPath = queryChangeDetector.query.collection.schema.primaryPath;
    const first = resultData.find(doc => doc[primaryPath] === docData[primaryPath]);
    return !!first;
}

export function enableDebugging() {
    console.log('QueryChangeDetector.enableDebugging()');
    DEBUG = true;
}

export function create(query: RxQuery<any, any>): QueryChangeDetector {
    const ret = new QueryChangeDetector(query);
    return ret;
}

export default {
    create,
    enableDebugging
};
