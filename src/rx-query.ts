import deepEqual from 'fast-deep-equal';
import {
    merge,
    BehaviorSubject,
    firstValueFrom
} from 'rxjs';
import {
    mergeMap,
    filter,
    map,
    shareReplay
} from 'rxjs/operators';
import {
    sortObject,
    stringifyFilter,
    pluginMissing,
    clone,
    overwriteGetterForCaching,
    now,
    PROMISE_RESOLVE_FALSE,
    RXJS_SHARE_REPLAY_DEFAULTS,
    promiseWait
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
    MangoQuerySelector,
    PreparedQuery,
    RxChangeEvent,
    RxDocumentWriteData
} from './types';

import {
    createRxDocuments
} from './rx-document-prototype-merge';
import { calculateNewResults } from './event-reduce';
import { triggerCacheReplacement } from './query-cache';
import type { QueryMatcher } from 'event-reduce-js';
import { _handleToStorageInstance } from './rx-collection-helper';

let _queryCount = 0;
const newQueryID = function (): number {
    return ++_queryCount;
};

export class RxQueryBase<
    RxDocumentType = any,
    // TODO also pass DocMethods here
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

    public isFindOneByIdQuery: false | string;

    constructor(
        public op: RxQueryOP,
        public mangoQuery: Readonly<MangoQuery>,
        public collection: RxCollection<RxDocumentType>
    ) {
        if (!mangoQuery) {
            this.mangoQuery = _getDefaultQuery();
        }

        this.isFindOneByIdQuery = isFindOneByIdQuery(
            this.collection.schema.primaryPath as string,
            mangoQuery
        );
    }
    get $(): BehaviorSubject<RxQueryResult> {
        if (!this._$) {
            /**
             * We use _resultsDocs$ to emit new results
             * This also ensures that there is a reemit on subscribe
             */
            const results$ = (this._resultsDocs$ as any)
                .pipe(
                    mergeMap(async (docs: any[] | null) => {
                        const ret = await _ensureEqual(this as any)
                            .then((hasChanged: any) => {
                                if (hasChanged) {
                                    // wait for next emit
                                    return false;
                                } else {
                                    return docs;
                                }
                            });
                        return ret;
                    }),
                    // not if previous returned false
                    filter((docs: any[]) => !!docs),
                    // copy the array so it wont matter if the user modifies it
                    map((docs: any[]) => docs.slice(0)),
                    map((docs: any[]) => {
                        if (this.op === 'findOne') {
                            // findOne()-queries emit document or null
                            const doc = docs.length === 0 ? null : docs[0];
                            return doc;
                        } else {
                            // find()-queries emit RxDocument[]
                            return docs;
                        }
                    }),
                    shareReplay(RXJS_SHARE_REPLAY_DEFAULTS)
                ).asObservable();

            /**
             * subscribe to the changeEvent-stream so it detects changes if it has subscribers
             */
            const changeEvents$ = this.collection.$
                .pipe(
                    mergeMap(async (changeEvent) => {
                        /**
                         * Performance shortcut.
                         * Changes to local documents are not relevant for the query.
                         */
                        if (changeEvent.isLocal) {
                            return;
                        }

                        return promiseWait(0).then(() => _ensureEqual(this));
                    }),
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


    // stores the changeEvent-number of the last handled change-event
    public _latestChangeEvent: -1 | number = -1;

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
    public _ensureEqualQueue: Promise<boolean> = PROMISE_RESOLVE_FALSE;

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
     * @param newResultData json-docs that were received from pouchdb
     */
    _setResultData(newResultData: any[]): RxDocument[] {
        const docs = createRxDocuments(
            this.collection,
            newResultData
        );

        /**
         * Instead of using the newResultData in the result cache,
         * we directly use the objects that are stored in the RxDocument
         * to ensure we do not store the same data twice and fill up the memory.
         */
        const primPath = this.collection.schema.primaryPath;
        this._resultsDataMap = new Map();
        this._resultsData = docs.map(doc => {
            const docData: RxDocumentType = doc._dataSync$.getValue() as any;
            const id: string = docData[primPath] as any;
            this._resultsDataMap.set(id, docData);
            return docData;
        });


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
                docsPromise = this.collection._queryStorageInstance(this as any);
                break;
            case 'findOne':
                docsPromise = this.collection._queryStorageInstance(this as any, 1);
                break;
            default:
                throw newRxError('QU1', {
                    collection: this.collection.name,
                    op: this.op
                });
        }

        return docsPromise.then(docs => {
            this._lastExecEnd = now();
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
                collection: this.collection.name,
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
            .then(() => firstValueFrom(this.$))
            .then(result => {
                if (!result && throwIfMissing) {
                    throw newRxError('QU10', {
                        collection: this.collection.name,
                        query: this.mangoQuery,
                        op: this.op
                    });
                } else {
                    return result;
                }
            });
    }



    /**
     * cached call to get the queryMatcher
     * @overwrites itself with the actual value
     */
    get queryMatcher(): QueryMatcher<RxDocumentWriteData<RxDocumentType>> {
        return overwriteGetterForCaching(
            this,
            'queryMatcher',
            this.collection.database.storage.statics.getQueryMatcher(
                this.collection.storageInstance.schema,
                this.getPreparedQuery()
            )
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
     * which can be send to the storage instance to query for documents.
     * @overwrites itself with the actual value.
     */
    getPreparedQuery(): PreparedQuery<RxDocumentType> {
        const hookInput = {
            rxQuery: this,
            // can be mutated by the hooks so we have to deep clone first.
            mangoQuery: clone(this.mangoQuery)
        };
        runPluginHooks('prePrepareQuery', hookInput);
        const value = this.collection.database.storage.statics.prepareQuery(
            this.collection.storageInstance.schema,
            hookInput.mangoQuery
        );
        this.getPreparedQuery = () => value;
        return value;
    }

    /**
     * returns true if the document matches the query,
     * does not use the 'skip' and 'limit'
     * // TODO this was moved to rx-storage
     */
    doesDocumentDataMatch(docData: RxDocumentType | any): boolean {
        // if doc is deleted, it cannot match
        if (docData._deleted) {
            return false;
        }

        return this.queryMatcher(
            _handleToStorageInstance(this.collection, docData)
        );
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
                if (Array.isArray(docs)) {
                    return Promise.all(docs.map(doc => doc.remove()));
                } else {
                    return (docs as any).remove();
                }
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

export function _getDefaultQuery(): MangoQuery {
    return {
        selector: {}
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
 * Check if the current results-state is in sync with the database
 * which means that no write event happened since the last run.
 * @return false if not which means it should re-execute
 */
function _isResultsInSync(rxQuery: RxQueryBase): boolean {
    const currentLatestEventNumber = rxQuery.asRxQuery.collection._changeEventBuffer.counter;
    if (rxQuery._latestChangeEvent >= currentLatestEventNumber) {
        return true;
    } else {
        return false;
    }
}


/**
 * wraps __ensureEqual()
 * to ensure it does not run in parallel
 * @return true if has changed, false if not
 */
function _ensureEqual(rxQuery: RxQueryBase): Promise<boolean> {
    // Optimisation shortcut
    if (
        rxQuery.collection.database.destroyed ||
        _isResultsInSync(rxQuery)
    ) {
        return PROMISE_RESOLVE_FALSE;
    }

    rxQuery._ensureEqualQueue = rxQuery._ensureEqualQueue
        .then(() => __ensureEqual(rxQuery));
    return rxQuery._ensureEqualQueue;
}

/**
 * ensures that the results of this query is equal to the results which a query over the database would give
 * @return true if results have changed
 */
function __ensureEqual(rxQuery: RxQueryBase): Promise<boolean> {
    rxQuery._lastEnsureEqual = now();

    /**
     * Optimisation shortcuts
     */
    if (
        // db is closed
        rxQuery.collection.database.destroyed ||
        // nothing happend since last run
        _isResultsInSync(rxQuery)
    ) {
        return PROMISE_RESOLVE_FALSE;
    }

    let ret = false;
    let mustReExec = false; // if this becomes true, a whole execution over the database is made
    if (rxQuery._latestChangeEvent === -1) {
        // have not executed yet -> must run
        mustReExec = true;
    }

    /**
     * try to use EventReduce to calculate the new results
     */
    if (!mustReExec) {
        const missedChangeEvents = rxQuery.asRxQuery.collection._changeEventBuffer.getFrom(rxQuery._latestChangeEvent + 1);
        if (missedChangeEvents === null) {
            // changeEventBuffer is of bounds -> we must re-execute over the database
            mustReExec = true;
        } else {
            rxQuery._latestChangeEvent = rxQuery.asRxQuery.collection._changeEventBuffer.counter;

            const runChangeEvents: RxChangeEvent<any>[] = rxQuery.asRxQuery.collection
                ._changeEventBuffer
                .reduceByLastOfDoc(missedChangeEvents);

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
        const latestAfter: number = (rxQuery as any).collection._changeEventBuffer.counter;
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
    return Promise.resolve(ret); // true if results have changed
}


/**
 * Returns true if the given query
 * selects exactly one document by its id.
 * Used to optimize performance because these kind of
 * queries do not have to run over an index and can use get-by-id instead.
 * Returns false if no query of that kind.
 * Returns the document id otherwise.
 */
export function isFindOneByIdQuery(
    primaryPath: string,
    query: MangoQuery<any>
): false | string {
    if (
        query.limit === 1 &&
        !query.skip &&
        Object.keys(query.selector).length === 1 &&
        query.selector[primaryPath]
    ) {
        if (typeof query.selector[primaryPath] === 'string') {
            return query.selector[primaryPath];
        } else if (
            Object.keys(query.selector[primaryPath]).length === 1 &&
            typeof query.selector[primaryPath].$eq === 'string'
        ) {
            return query.selector[primaryPath].$eq;
        }
    }
    return false;
}



export function isInstanceOf(obj: any): boolean {
    return obj instanceof RxQueryBase;
}
