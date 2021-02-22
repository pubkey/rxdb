import deepEqual from 'deep-equal';
import {
    merge,
    BehaviorSubject
} from 'rxjs';
import {
    mergeMap,
    filter,
    map,
    first,
    tap
} from 'rxjs/operators';
import {
    massageSelector,
    filterInMemoryFields
} from 'pouchdb-selector-core';
import {
    sortObject,
    stringifyFilter,
    pluginMissing,
    clone,
    overwriteGetterForCaching,
    now
} from './util';
import {
    newRxError,
    newRxTypeError
} from './rx-error';
import {
    runPluginHooks
} from './hooks';
import type {
    RxCollection,
    RxDocument,
    RxQueryOP,
    RxQuery,
    MangoQuery,
    MangoQuerySortPart,
    MangoQuerySelector
} from './types';

import {
    createRxDocuments
} from './rx-document-prototype-merge';
import type { RxChangeEvent } from './rx-change-event';
import { calculateNewResults } from './event-reduce';
import { PreparedQuery } from './rx-storate.interface';
import { triggerCacheReplacement } from './query-cache';

let _queryCount = 0;
const newQueryID = function (): number {
    return ++_queryCount;
};

export class RxQueryBase<
    RxDocumentType = any,
    RxQueryResult = RxDocument<RxDocumentType[]> | RxDocument<RxDocumentType>
    > {

    public id: number = newQueryID();

    /**
     * Some stats then are used for debugging and cache replacement policies
     */
    public _execOverDatabaseCount: number = 0;
    public _creationTime = now();
    public _lastEnsureEqual = 0;

    // used by some plugins
    public other: any = {};

    public uncached = false;

    // used to count the subscribers to the query
    public refCount$ = new BehaviorSubject(null);

    constructor(
        public op: RxQueryOP,
        public mangoQuery: Readonly<MangoQuery>,
        public collection: RxCollection<RxDocumentType>
    ) {
        if (!mangoQuery) {
            mangoQuery = _getDefaultQuery(this.collection);
        }
    }
    get $(): BehaviorSubject<RxQueryResult> {
        if (!this._$) {
            /**
             * We use _resultsDocs$ to emit new results
             * This also ensures that there is a reemit on subscribe
             */
            const results$ = (this._resultsDocs$ as any)
                .pipe(
                    mergeMap((docs: any[]) => {
                        return _ensureEqual(this as any)
                            .then((hasChanged: any) => {
                                if (hasChanged) return false; // wait for next emit
                                else return docs;
                            });
                    }),
                    filter((docs: any[]) => !!docs), // not if previous returned false
                    map((docs: any[]) => {
                        // findOne()-queries emit document or null
                        if (this.op === 'findOne') {
                            const doc = docs.length === 0 ? null : docs[0];
                            return doc;
                        } else return docs; // find()-queries emit RxDocument[]
                    }),
                    map(docs => {
                        // copy the array so it wont matter if the user modifies it
                        const ret = Array.isArray(docs) ? docs.slice() : docs;
                        return ret;
                    })
                ).asObservable();

            /**
             * subscribe to the changeEvent-stream so it detects changes if it has subscribers
             */
            const changeEvents$ = this.collection.$
                .pipe(
                    tap(() => _ensureEqual(this)),
                    filter(() => false)
                );

            this._$ =
                // tslint:disable-next-line
                merge(
                    results$,
                    changeEvents$,
                    this.refCount$.pipe(
                        filter(() => false)
                    )
                ) as any;
        }
        return this._$ as any;
    }


    // stores the changeEvent-Number of the last handled change-event
    public _latestChangeEvent: -1 | any = -1;

    // contains the results as plain json-data
    public _resultsData: any = null;
    public _resultsDataMap: Map<string, RxDocumentType> = new Map();

    // time stamps on when the last full exec over the database has run
    // used to properly handle events that happen while the find-query is running
    public _lastExecStart: number = 0;
    public _lastExecEnd: number = 0;

    // contains the results as RxDocument[]
    public _resultsDocs$: BehaviorSubject<any> = new BehaviorSubject(null);

    /**
     * ensures that the exec-runs
     * are not run in parallel
     */
    public _ensureEqualQueue: Promise<boolean> = Promise.resolve(false);

    /**
     * Returns an observable that emits the results
     * This should behave like an rxjs-BehaviorSubject which means:
     * - Emit the current result-set on subscribe
     * - Emit the new result-set when an RxChangeEvent comes in
     * - Do not emit anything before the first result-set was created (no null)
     */
    public _$?: BehaviorSubject<RxQueryResult>;

    /**
     * set the new result-data as result-docs of the query
     * @param newResultData json-docs that were recieved from pouchdb
     */
    _setResultData(newResultData: any[]): RxDocument[] {
        this._resultsData = newResultData;
        const docs = createRxDocuments(
            this.collection,
            this._resultsData
        );
        this._resultsDocs$.next(docs);
        return docs as any;
    }

    /**
     * executes the query on the database
     * @return results-array with document-data
     */
    _execOverDatabase(): Promise<any[]> {
        this._execOverDatabaseCount = this._execOverDatabaseCount + 1;
        this._lastExecStart = now();

        let docsPromise;
        switch (this.op) {
            case 'find':
                docsPromise = this.collection._pouchFind(this as any);
                break;
            case 'findOne':
                docsPromise = this.collection._pouchFind(this as any, 1);
                break;
            default:
                throw newRxError('QU1', {
                    op: this.op
                });
        }

        return docsPromise.then(docs => {
            this._lastExecEnd = now();
            this._resultsDataMap = new Map();
            const primPath = this.collection.schema.primaryPath;
            docs.forEach(doc => {
                const id = doc[primPath];
                this._resultsDataMap.set(id, doc);
            });
            return docs;
        });
    }

    /**
     * Execute the query
     * To have an easier implementations,
     * just subscribe and use the first result
     */
    public exec(throwIfMissing: true): Promise<RxDocument<RxDocumentType>>;
    public exec(): Promise<RxQueryResult>;
    public exec(throwIfMissing?: boolean): Promise<any> {

        // TODO this should be ensured by typescript
        if (throwIfMissing && this.op !== 'findOne') {
            throw newRxError('QU9', {
                query: this.mangoQuery,
                op: this.op
            });
        }

        /**
         * run _ensureEqual() here,
         * this will make sure that errors in the query which throw inside of pouchdb,
         * will be thrown at this execution context
         */
        return _ensureEqual(this)
            .then(() => this.$
                .pipe(
                    first()
                ).toPromise())
            .then(result => {
                if (!result && throwIfMissing) {
                    throw newRxError('QU10', {
                        query: this.mangoQuery,
                        op: this.op
                    });
                } else {
                    return result;
                }
            });
    }



    /**
     * cached call to get the massageSelector
     * @overwrites itself with the actual value
     */
    get massageSelector(): any {
        return overwriteGetterForCaching(
            this,
            'massageSelector',
            massageSelector(this.mangoQuery.selector)
        );
    }

    /**
     * returns a string that is used for equal-comparisons
     * @overwrites itself with the actual value
     */
    toString(): string {
        const stringObj = sortObject({
            op: this.op,
            query: this.mangoQuery,
            other: this.other
        }, true);
        const value = JSON.stringify(stringObj, stringifyFilter);
        this.toString = () => value;
        return value;
    }

    /**
     * returns the prepared query
     * @overwrites itself with the actual value
     */
    toJSON(): PreparedQuery<RxDocumentType> {
        const value = this.collection.database.storage.prepareQuery(
            this.asRxQuery,
            clone(this.mangoQuery)
        );
        this.toJSON = () => value;
        return value;
    }

    /**
     * returns the key-compressed version of the query
     * @overwrites itself with the actual value
     */
    keyCompress(): MangoQuery<any> {
        let value: MangoQuery<any>;
        if (!this.collection.schema.doKeyCompression()) {
            value = this.toJSON();
        } else {
            value = this
                .collection
                ._keyCompressor
                .compressQuery(this.toJSON());
        }
        this.keyCompress = () => value;
        return value;
    }

    /**
     * returns true if the document matches the query,
     * does not use the 'skip' and 'limit'
     * // TODO this was moved to rx-storage
     */
    doesDocumentDataMatch(docData: RxDocumentType | any): boolean {
        // if doc is deleted, it cannot match
        if (docData._deleted) return false;
        docData = this.collection.schema.swapPrimaryToId(docData);

        // return matchesSelector(docData, selector);

        /**
         * the following is equal to the implementation of pouchdb
         * we do not use matchesSelector() directly so we can cache the
         * result of massageSelector
         * @link https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-selector-core/src/matches-selector.js
         */
        const selector = this.massageSelector;
        const row = {
            doc: docData
        };
        const rowsMatched = filterInMemoryFields(
            [row],
            { selector: selector },
            Object.keys(selector)
        );
        return rowsMatched && rowsMatched.length === 1;
    }

    /**
     * deletes all found documents
     * @return promise with deleted documents
     */
    remove(): Promise<RxQueryResult> {
        let ret: any;
        return this
            .exec()
            .then(docs => {
                ret = docs;
                if (Array.isArray(docs)) return Promise.all(docs.map(doc => doc.remove()));
                else return (docs as any).remove();
            })
            .then(() => ret);
    }


    /**
     * helper function to transform RxQueryBase to RxQuery type
     */
    get asRxQuery(): RxQuery<RxDocumentType, RxQueryResult> {
        return this as any;
    }

    /**
     * updates all found documents
     * @overwritten by plugin (optional)
     */
    update(_updateObj: any): Promise<RxQueryResult> {
        throw pluginMissing('update');
    }


    // we only set some methods of query-builder here
    // because the others depend on these ones
    where(_queryObj: MangoQuerySelector<RxDocumentType> | keyof RxDocumentType | string): RxQuery<RxDocumentType, RxQueryResult> {
        throw pluginMissing('query-builder');
    }
    sort(_params: string | MangoQuerySortPart<RxDocumentType>): RxQuery<RxDocumentType, RxQueryResult> {
        throw pluginMissing('query-builder');
    }
    skip(_amount: number | null): RxQuery<RxDocumentType, RxQueryResult> {
        throw pluginMissing('query-builder');
    }
    limit(_amount: number | null): RxQuery<RxDocumentType, RxQueryResult> {
        throw pluginMissing('query-builder');
    }
}

export function _getDefaultQuery(collection: RxCollection): MangoQuery {
    return {
        selector: {
            [collection.schema.primaryPath]: {}
        }
    };
}

/**
 * run this query through the QueryCache
 */
export function tunnelQueryCache<RxDocumentType, RxQueryResult>(
    rxQuery: RxQueryBase<RxDocumentType, RxQueryResult>
): RxQuery<RxDocumentType, RxQueryResult> {
    return rxQuery.collection._queryCache.getByQuery(rxQuery as any);
}

export function createRxQuery(
    op: RxQueryOP,
    queryObj: MangoQuery,
    collection: RxCollection
) {
    // checks
    if (queryObj && typeof queryObj !== 'object') {
        throw newRxTypeError('QU7', {
            queryObj
        });
    }
    if (Array.isArray(queryObj)) {
        throw newRxTypeError('QU8', {
            queryObj
        });
    }

    runPluginHooks('preCreateRxQuery', {
        op,
        queryObj,
        collection
    });

    let ret = new RxQueryBase(op, queryObj, collection);

    // ensure when created with same params, only one is created
    ret = tunnelQueryCache(ret);

    runPluginHooks('createRxQuery', ret);

    triggerCacheReplacement(collection);

    return ret;
}

/**
 * check if the current results-state is in sync with the database
 * @return false if not which means it should re-execute
 */
function _isResultsInSync(rxQuery: RxQueryBase): boolean {
    if (rxQuery._latestChangeEvent >= (rxQuery as any).collection._changeEventBuffer.counter) {
        return true;
    } else return false;
}


/**
 * wraps __ensureEqual()
 * to ensure it does not run in parallel
 * @return true if has changed, false if not
 */
function _ensureEqual(rxQuery: RxQueryBase): Promise<boolean> {
    rxQuery._ensureEqualQueue = rxQuery._ensureEqualQueue
        .then(() => new Promise(res => setTimeout(res, 0)))
        .then(() => __ensureEqual(rxQuery))
        .then(ret => {
            return new Promise(res => setTimeout(res, 0))
                .then(() => ret);
        });
    return rxQuery._ensureEqualQueue;
}

/**
 * ensures that the results of this query is equal to the results which a query over the database would give
 * @return true if results have changed
 */
function __ensureEqual(rxQuery: RxQueryBase): Promise<boolean> | boolean {
    rxQuery._lastEnsureEqual = now();
    if (rxQuery.collection.database.destroyed) return false; // db is closed
    if (_isResultsInSync(rxQuery)) return false; // nothing happend

    let ret = false;
    let mustReExec = false; // if this becomes true, a whole execution over the database is made
    if (rxQuery._latestChangeEvent === -1) mustReExec = true; // have not executed yet -> must run

    /**
     * try to use the queryChangeDetector to calculate the new results
     */
    if (!mustReExec) {
        let missedChangeEvents = (rxQuery as any).collection._changeEventBuffer.getFrom(rxQuery._latestChangeEvent + 1);
        if (missedChangeEvents === null) {
            // changeEventBuffer is of bounds -> we must re-execute over the database
            mustReExec = true;
        } else {
            rxQuery._latestChangeEvent = (rxQuery as any).collection._changeEventBuffer.counter;

            /**
             * because pouchdb prefers writes over reads,
             * we have to filter out the events that happend before the read has started
             * so that we do not fill event-reduce with the wrong data
             */
            missedChangeEvents = missedChangeEvents.filter((cE: RxChangeEvent) => {
                return !cE.startTime || cE.startTime > rxQuery._lastExecStart;
            });



            const runChangeEvents: RxChangeEvent[] = (rxQuery as any).collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);

            /*
            console.log('calculateNewResults() ' + new Date().getTime());
            console.log(rxQuery._lastExecStart + ' - ' + rxQuery._lastExecEnd);
            console.dir(rxQuery._resultsData.slice());
            console.dir(runChangeEvents);
            */

            const eventReduceResult = calculateNewResults(
                rxQuery as any,
                runChangeEvents
            );
            if (eventReduceResult.runFullQueryAgain) {
                // could not calculate the new results, execute must be done
                mustReExec = true;
            } else if (eventReduceResult.changed) {
                // we got the new results, we do not have to re-execute, mustReExec stays false
                ret = true; // true because results changed
                rxQuery._setResultData(eventReduceResult.newResults);
            }
        }
    }

    // oh no we have to re-execute the whole query over the database
    if (mustReExec) {
        // counter can change while _execOverDatabase() is running so we save it here
        const latestAfter = (rxQuery as any).collection._changeEventBuffer.counter;

        return rxQuery._execOverDatabase()
            .then(newResultData => {
                rxQuery._latestChangeEvent = latestAfter;
                if (!deepEqual(newResultData, rxQuery._resultsData)) {
                    ret = true; // true because results changed
                    rxQuery._setResultData(newResultData);
                }
                return ret;
            });
    }
    return ret; // true if results have changed
}



export function isInstanceOf(obj: any): boolean {
    return obj instanceof RxQueryBase;
}
