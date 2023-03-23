import {
    BehaviorSubject,
    firstValueFrom,
    Observable,
    merge
} from 'rxjs';
import {
    mergeMap,
    filter,
    map,
    startWith,
    distinctUntilChanged,
    shareReplay
} from 'rxjs/operators';
import {
    sortObject,
    stringifyFilter,
    pluginMissing,
    overwriteGetterForCaching,
    now,
    PROMISE_RESOLVE_FALSE,
    RXJS_SHARE_REPLAY_DEFAULTS,
    ensureNotFalsy,
    areRxDocumentArraysEqual
} from './plugins/utils';
import {
    newRxError
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
    RxDocumentWriteData,
    RxDocumentData,
    QueryMatcher
} from './types';
import { calculateNewResults } from './event-reduce';
import { triggerCacheReplacement } from './query-cache';
import { getQueryMatcher, normalizeMangoQuery } from './rx-query-helper';

let _queryCount = 0;
const newQueryID = function (): number {
    return ++_queryCount;
};

export class RxQueryBase<
    RxDocType,
    // TODO also pass DocMethods here
    RxQueryResult = RxDocument<RxDocType>[] | RxDocument<RxDocType>
> {

    public id: number = newQueryID();

    /**
     * Some stats then are used for debugging and cache replacement policies
     */
    public _execOverDatabaseCount: number = 0;
    public _creationTime = now();

    // used in the query-cache to determine if the RxQuery can be cleaned up.
    public _lastEnsureEqual = 0;

    public uncached = false;

    // used to count the subscribers to the query
    public refCount$ = new BehaviorSubject(null);

    public isFindOneByIdQuery: false | string | string[];


    /**
     * Contains the current result state
     * or null if query has not run yet.
     */
    public _result: {
        docsData: RxDocumentData<RxDocType>[];
        // A key->document map, used in the event reduce optimization.
        docsDataMap: Map<string, RxDocType>;
        docsMap: Map<string, RxDocument<RxDocType>>;
        docs: RxDocument<RxDocType>[];
        count: number;
        /**
         * Time at which the current _result state was created.
         * Used to determine if the result set has changed since X
         * so that we do not emit the same result multiple times on subscription.
         */
        time: number;
    } | null = null;


    constructor(
        public op: RxQueryOP,
        public mangoQuery: Readonly<MangoQuery<RxDocType>>,
        public collection: RxCollection<RxDocType>,
        // used by some plugins
        public other: any = {}
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

            const results$ = this.collection.$.pipe(
                /**
                 * Performance shortcut.
                 * Changes to local documents are not relevant for the query.
                 */
                filter(changeEvent => !changeEvent.isLocal),
                /**
                 * Start once to ensure the querying also starts
                 * when there where no changes.
                 */
                startWith(null),
                // ensure query results are up to date.
                mergeMap(() => _ensureEqual(this as any)),
                // use the current result set, written by _ensureEqual().
                map(() => this._result),
                // do not run stuff above for each new subscriber, only once.
                shareReplay(RXJS_SHARE_REPLAY_DEFAULTS),
                // do not proceed if result set has not changed.
                distinctUntilChanged((prev, curr) => {
                    if (prev && prev.time === ensureNotFalsy(curr).time) {
                        return true;
                    } else {
                        return false;
                    }
                }),
                filter(result => !!result),
                /**
                 * Map the result set to a single RxDocument or an array,
                 * depending on query type
                 */
                map((result) => {
                    const useResult = ensureNotFalsy(result);
                    if (this.op === 'count') {
                        return useResult.count;
                    } else if (this.op === 'findOne') {
                        // findOne()-queries emit RxDocument or null
                        return useResult.docs.length === 0 ? null : useResult.docs[0];
                    } else if (this.op === 'findByIds') {
                        return useResult.docsMap;
                    } else {
                        // find()-queries emit RxDocument[]
                        // Flat copy the array so it won't matter if the user modifies it.
                        return useResult.docs.slice(0);
                    }
                })
            );

            this._$ = merge<any>(
                results$,
                /**
                 * Also add the refCount$ to the query observable
                 * to allow us to count the amount of subscribers.
                 */
                this.refCount$.pipe(
                    filter(() => false)
                )
            );
        }
        return this._$ as any;
    }


    // stores the changeEvent-number of the last handled change-event
    public _latestChangeEvent: -1 | number = -1;

    // time stamps on when the last full exec over the database has run
    // used to properly handle events that happen while the find-query is running
    public _lastExecStart: number = 0;
    public _lastExecEnd: number = 0;

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
    public _$?: Observable<RxQueryResult>;

    /**
     * set the new result-data as result-docs of the query
     * @param newResultData json-docs that were received from the storage
     */
    _setResultData(newResultData: RxDocumentData<RxDocType>[] | number | Map<string, RxDocumentData<RxDocType>>): void {

        if (typeof newResultData === 'number') {
            this._result = {
                docsData: [],
                docsMap: new Map(),
                docsDataMap: new Map(),
                count: newResultData,
                docs: [],
                time: now()
            };
            return;
        } else if (newResultData instanceof Map) {
            newResultData = Array.from((newResultData as Map<string, RxDocumentData<RxDocType>>).values());
        }

        const docsDataMap = new Map();
        const docsMap = new Map();
        const docs = newResultData.map(docData => this.collection._docCache.getCachedRxDocument(docData));

        /**
         * Instead of using the newResultData in the result cache,
         * we directly use the objects that are stored in the RxDocument
         * to ensure we do not store the same data twice and fill up the memory.
         */
        const docsData = docs.map(doc => {
            docsDataMap.set(doc.primary, doc._data);
            docsMap.set(doc.primary, doc);
            return doc._data;
        });

        this._result = {
            docsData,
            docsMap,
            docsDataMap,
            count: docsData.length,
            docs,
            time: now()
        };
    }

    /**
     * executes the query on the database
     * @return results-array with document-data
     */
    async _execOverDatabase(): Promise<RxDocumentData<RxDocType>[] | number> {
        this._execOverDatabaseCount = this._execOverDatabaseCount + 1;
        this._lastExecStart = now();


        if (this.op === 'count') {
            const preparedQuery = this.getPreparedQuery();
            const result = await this.collection.storageInstance.count(preparedQuery);
            if (result.mode === 'slow' && !this.collection.database.allowSlowCount) {
                throw newRxError('QU14', {
                    collection: this.collection,
                    queryObj: this.mangoQuery
                });
            } else {
                return result.count;
            }
        }

        if (this.op === 'findByIds') {
            const ids: string[] = ensureNotFalsy(this.mangoQuery.selector as any)[this.collection.schema.primaryPath].$in;
            const ret = new Map<string, RxDocument<RxDocType>>();
            const mustBeQueried: string[] = [];
            // first try to fill from docCache
            ids.forEach(id => {
                const docData = this.collection._docCache.getLatestDocumentDataIfExists(id);
                if (docData) {
                    if (!docData._deleted) {
                        const doc = this.collection._docCache.getCachedRxDocument(docData);
                        ret.set(id, doc);
                    }
                } else {
                    mustBeQueried.push(id);
                }
            });
            // everything which was not in docCache must be fetched from the storage
            if (mustBeQueried.length > 0) {
                const docs = await this.collection.storageInstance.findDocumentsById(mustBeQueried, false);
                Object.values(docs).forEach(docData => {
                    const doc = this.collection._docCache.getCachedRxDocument(docData);
                    ret.set(doc.primary, doc);
                });
            }
            return ret as any;
        }


        const docsPromise = queryCollection<RxDocType>(this as any);
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
    public exec(throwIfMissing: true): Promise<RxDocument<RxDocType>>;
    public exec(): Promise<RxQueryResult>;
    public exec(throwIfMissing?: boolean): Promise<any> {
        if (throwIfMissing && this.op !== 'findOne') {
            throw newRxError('QU9', {
                collection: this.collection.name,
                query: this.mangoQuery,
                op: this.op
            });
        }


        /**
         * run _ensureEqual() here,
         * this will make sure that errors in the query which throw inside of the RxStorage,
         * will be thrown at this execution context and not in the background.
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
    get queryMatcher(): QueryMatcher<RxDocumentWriteData<RxDocType>> {
        const schema = this.collection.schema.jsonSchema;
        const normalizedQuery = normalizeMangoQuery(
            this.collection.schema.jsonSchema,
            this.mangoQuery
        );
        return overwriteGetterForCaching(
            this,
            'queryMatcher',
            getQueryMatcher(
                schema,
                normalizedQuery
            ) as any
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
    getPreparedQuery(): PreparedQuery<RxDocType> {
        const hookInput = {
            rxQuery: this,
            // can be mutated by the hooks so we have to deep clone first.
            mangoQuery: normalizeMangoQuery<RxDocType>(
                this.collection.schema.jsonSchema,
                this.mangoQuery
            )
        };
        runPluginHooks('prePrepareQuery', hookInput);

        const value = this.collection.database.storage.statics.prepareQuery(
            this.collection.schema.jsonSchema,
            hookInput.mangoQuery
        );

        this.getPreparedQuery = () => value;
        return value;
    }

    /**
     * returns true if the document matches the query,
     * does not use the 'skip' and 'limit'
     */
    doesDocumentDataMatch(docData: RxDocType | any): boolean {
        // if doc is deleted, it cannot match
        if (docData._deleted) {
            return false;
        }

        return this.queryMatcher(docData);
    }

    /**
     * deletes all found documents
     * @return promise with deleted documents
     */
    remove(): Promise<RxQueryResult> {
        return this
            .exec()
            .then(docs => {
                if (Array.isArray(docs)) {
                    // TODO use a bulk operation instead of running .remove() on each document
                    return Promise.all(docs.map(doc => doc.remove()));
                } else {
                    return (docs as any).remove();
                }
            });
    }


    /**
     * helper function to transform RxQueryBase to RxQuery type
     */
    get asRxQuery(): RxQuery<RxDocType, RxQueryResult> {
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
    where(_queryObj: MangoQuerySelector<RxDocType> | keyof RxDocType | string): RxQuery<RxDocType, RxQueryResult> {
        throw pluginMissing('query-builder');
    }
    sort(_params: string | MangoQuerySortPart<RxDocType>): RxQuery<RxDocType, RxQueryResult> {
        throw pluginMissing('query-builder');
    }
    skip(_amount: number | null): RxQuery<RxDocType, RxQueryResult> {
        throw pluginMissing('query-builder');
    }
    limit(_amount: number | null): RxQuery<RxDocType, RxQueryResult> {
        throw pluginMissing('query-builder');
    }
}

export function _getDefaultQuery<RxDocType>(): MangoQuery<RxDocType> {
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

export function createRxQuery<RxDocType>(
    op: RxQueryOP,
    queryObj: MangoQuery<RxDocType>,
    collection: RxCollection<RxDocType>,
    other?: any
) {
    runPluginHooks('preCreateRxQuery', {
        op,
        queryObj,
        collection,
        other
    });

    let ret = new RxQueryBase<RxDocType>(op, queryObj, collection, other);

    // ensure when created with same params, only one is created
    ret = tunnelQueryCache(ret);
    triggerCacheReplacement(collection);

    return ret;
}

/**
 * Check if the current results-state is in sync with the database
 * which means that no write event happened since the last run.
 * @return false if not which means it should re-execute
 */
function _isResultsInSync(rxQuery: RxQueryBase<any>): boolean {
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
function _ensureEqual(rxQuery: RxQueryBase<any>): Promise<boolean> {
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
function __ensureEqual<RxDocType>(rxQuery: RxQueryBase<RxDocType>): Promise<boolean> {
    rxQuery._lastEnsureEqual = now();

    /**
     * Optimisation shortcuts
     */
    if (
        // db is closed
        rxQuery.collection.database.destroyed ||
        // nothing happened since last run
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

            if (rxQuery.op === 'count') {
                // 'count' query
                const previousCount = ensureNotFalsy(rxQuery._result).count;
                let newCount = previousCount;
                runChangeEvents.forEach(cE => {
                    const didMatchBefore = cE.previousDocumentData && rxQuery.doesDocumentDataMatch(cE.previousDocumentData);
                    const doesMatchNow = rxQuery.doesDocumentDataMatch(cE.documentData);

                    if (!didMatchBefore && doesMatchNow) {
                        newCount++;
                    }
                    if (didMatchBefore && !doesMatchNow) {
                        newCount--;
                    }
                });
                if (newCount !== previousCount) {
                    ret = true; // true because results changed
                    rxQuery._setResultData(newCount as any);
                }
            } else {
                // 'find' or 'findOne' query
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
                    rxQuery._setResultData(eventReduceResult.newResults as any);
                }
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

                // A count query needs a different has-changed check.
                if (typeof newResultData === 'number') {
                    if (
                        !rxQuery._result ||
                        newResultData !== rxQuery._result.count
                    ) {
                        ret = true;
                        rxQuery._setResultData(newResultData as any);
                    }
                    return ret;
                }
                if (
                    !rxQuery._result ||
                    !areRxDocumentArraysEqual(
                        rxQuery.collection.schema.primaryPath,
                        newResultData,
                        rxQuery._result.docsData
                    )
                ) {
                    ret = true; // true because results changed
                    rxQuery._setResultData(newResultData as any);
                }
                return ret;
            });
    }
    return Promise.resolve(ret); // true if results have changed
}

/**
 * Runs the query over the storage instance
 * of the collection.
 * Does some optimizations to ensure findById is used
 * when specific queries are used.
 */
export async function queryCollection<RxDocType>(
    rxQuery: RxQuery<RxDocType> | RxQueryBase<RxDocType>
): Promise<RxDocumentData<RxDocType>[]> {
    let docs: RxDocumentData<RxDocType>[] = [];
    const collection = rxQuery.collection;

    /**
     * Optimizations shortcut.
     * If query is find-one-document-by-id,
     * then we do not have to use the slow query() method
     * but instead can use findDocumentsById()
     */
    if (rxQuery.isFindOneByIdQuery) {
        if (Array.isArray(rxQuery.isFindOneByIdQuery)) {
            let docIds = rxQuery.isFindOneByIdQuery;
            docIds = docIds.filter(docId => {
                // first try to fill from docCache
                const docData = rxQuery.collection._docCache.getLatestDocumentDataIfExists(docId);
                if (docData) {
                    docs.push(docData);
                    return false;
                } else {
                    return true;
                }
            });
            // otherwise get from storage
            const docsMap = await collection.storageInstance.findDocumentsById(docIds, false);
            Object.values(docsMap).forEach(docData => {
                docs.push(docData);
            });
        } else {
            const docId = rxQuery.isFindOneByIdQuery;

            // first try to fill from docCache
            let docData = rxQuery.collection._docCache.getLatestDocumentDataIfExists(docId);
            if (!docData) {
                // otherwise get from storage
                const docsMap = await collection.storageInstance.findDocumentsById([docId], false);
                docData = docsMap[docId];
            }
            if (docData) {
                docs.push(docData);
            }
        }
    } else {
        const preparedQuery = rxQuery.getPreparedQuery();
        const queryResult = await collection.storageInstance.query(preparedQuery);
        docs = queryResult.documents;
    }
    return docs;

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
): false | string | string[] {
    // must have exactly one operator which must be $eq || $in
    if (
        !query.skip &&
        query.selector &&
        Object.keys(query.selector).length === 1 &&
        query.selector[primaryPath]
    ) {
        const value: any = query.selector[primaryPath];
        if (typeof value === 'string') {
            return value;
        } else if (
            Object.keys(value).length === 1 &&
            typeof value.$eq === 'string'
        ) {
            return value.$eq;
        }

        // same with $in string arrays
        if (
            Object.keys(value).length === 1 &&
            Array.isArray(value.$eq) &&
            // must only contain strings
            !(value.$eq as any[]).find(r => typeof r !== 'string')
        ) {
            return value.$eq;
        }
    }
    return false;
}



export function isRxQuery(obj: any): boolean {
    return obj instanceof RxQueryBase;
}
