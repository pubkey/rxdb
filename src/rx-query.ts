import {
    BehaviorSubject,
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
    pluginMissing,
    overwriteGetterForCaching,
    now,
    PROMISE_RESOLVE_FALSE,
    RXJS_SHARE_REPLAY_DEFAULTS,
    ensureNotFalsy,
    areRxDocumentArraysEqual,
    appendToArray
} from './plugins/utils/index.ts';
import {
    newRxError,
    rxStorageWriteErrorToRxError
} from './rx-error.ts';
import {
    runPluginHooks
} from './hooks.ts';
import type {
    RxCollection,
    RxDocument,
    RxQueryOP,
    RxQuery,
    MangoQuery,
    MangoQuerySortPart,
    MangoQuerySelector,
    PreparedQuery,
    RxDocumentWriteData,
    RxDocumentData,
    QueryMatcher,
    ModifyFunction,
    RxStorageChangeEvent
} from './types/index.d.ts';
import { calculateNewResults } from './event-reduce.ts';
import { triggerCacheReplacement } from './query-cache.ts';
import {
    getQueryMatcher,
    normalizeMangoQuery,
    prepareQuery,
    runQueryUpdateFunction

} from './rx-query-helper.ts';
import { RxQuerySingleResult } from './rx-query-single-result.ts';

let _queryCount = 0;
const newQueryID = function (): number {
    return ++_queryCount;
};

export class RxQueryBase<
    RxDocType,
    RxQueryResult,
    OrmMethods = {},
    Reactivity = unknown,
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
    public _result: RxQuerySingleResult<RxDocType> | null = null;


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
    get $(): Observable<RxQueryResult> {
        if (!this._$) {
            const results$ = this.collection.eventBulks$.pipe(
                /**
                 * Performance shortcut.
                 * Changes to local documents are not relevant for the query.
                 */
                filter(bulk => !bulk.isLocal),
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
                    return ensureNotFalsy(result).getValue();
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

    get $$(): Reactivity {
        const reactivity = this.collection.database.getReactivityFactory();
        return reactivity.fromObservable(
            this.$,
            undefined,
            this.collection.database
        ) as any;
    }

    // stores the changeEvent-number of the last handled change-event
    public _latestChangeEvent: -1 | number = -1;

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
        if (typeof newResultData === 'undefined') {
            throw newRxError('QU18', {
                database: this.collection.database.name,
                collection: this.collection.name
            });
        }
        if (typeof newResultData === 'number') {
            this._result = new RxQuerySingleResult<RxDocType>(
                this as any,
                [],
                newResultData
            );
            return;
        } else if (newResultData instanceof Map) {
            newResultData = Array.from((newResultData as Map<string, RxDocumentData<RxDocType>>).values());
        }

        const newQueryResult = new RxQuerySingleResult<RxDocType>(
            this as any,
            newResultData,
            newResultData.length
        );
        this._result = newQueryResult;
    }

    /**
     * executes the query on the database
     * @return results-array with document-data
     */
    async _execOverDatabase(): Promise<RxDocumentData<RxDocType>[] | number> {
        this._execOverDatabaseCount = this._execOverDatabaseCount + 1;
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
                docs.forEach(docData => {
                    const doc = this.collection._docCache.getCachedRxDocument(docData);
                    ret.set(doc.primary, doc);
                });
            }
            return ret as any;
        }


        const docsPromise = queryCollection<RxDocType>(this as any);
        return docsPromise.then(docs => {
            return docs;
        });
    }

    /**
     * Execute the query
     * To have an easier implementations,
     * just subscribe and use the first result
     */
    public exec(throwIfMissing: true): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;
    public exec(): Promise<RxQueryResult>;
    public async exec(throwIfMissing?: boolean): Promise<any> {
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
        await _ensureEqual(this as any);
        const useResult = ensureNotFalsy(this._result);
        return useResult.getValue(throwIfMissing);
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
            query: normalizeMangoQuery<RxDocType>(
                this.collection.schema.jsonSchema,
                this.mangoQuery
            ),
            other: this.other
        }, true);
        const value = JSON.stringify(stringObj);
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
        (hookInput.mangoQuery.selector as any)._deleted = { $eq: false };
        if (hookInput.mangoQuery.index) {
            hookInput.mangoQuery.index.unshift('_deleted');
        }
        runPluginHooks('prePrepareQuery', hookInput);

        const value = prepareQuery(
            this.collection.schema.jsonSchema,
            hookInput.mangoQuery as any
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
    async remove(): Promise<RxQueryResult> {
        const docs = await this.exec();
        if (Array.isArray(docs)) {
            const result = await this.collection.bulkRemove(docs);
            if (result.error.length > 0) {
                throw rxStorageWriteErrorToRxError(result.error[0]);
            } else {
                return result.success as any;
            }
        } else {
            return (docs as any).remove();
        }
    }
    incrementalRemove(): Promise<RxQueryResult> {
        return runQueryUpdateFunction(
            this.asRxQuery,
            (doc) => doc.incrementalRemove(),
        );
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

    patch(patch: Partial<RxDocType>): Promise<RxQueryResult> {
        return runQueryUpdateFunction(
            this.asRxQuery,
            (doc) => doc.patch(patch),
        );
    }
    incrementalPatch(patch: Partial<RxDocType>): Promise<RxQueryResult> {
        return runQueryUpdateFunction(
            this.asRxQuery,
            (doc) => doc.incrementalPatch(patch),
        );
    }
    modify(mutationFunction: ModifyFunction<RxDocType>): Promise<RxQueryResult> {
        return runQueryUpdateFunction(
            this.asRxQuery,
            (doc) => doc.modify(mutationFunction),
        );
    }
    incrementalModify(mutationFunction: ModifyFunction<RxDocType>): Promise<RxQueryResult> {
        return runQueryUpdateFunction(
            this.asRxQuery,
            (doc) => doc.incrementalModify(mutationFunction),
        );
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

    let ret = new RxQueryBase<RxDocType, any>(op, queryObj, collection, other);

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
function _isResultsInSync(rxQuery: RxQueryBase<any, any>): boolean {
    const currentLatestEventNumber = rxQuery.asRxQuery.collection._changeEventBuffer.getCounter();
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
async function _ensureEqual(rxQuery: RxQueryBase<any, any>): Promise<boolean> {
    if (rxQuery.collection.awaitBeforeReads.size > 0) {
        await Promise.all(Array.from(rxQuery.collection.awaitBeforeReads).map(fn => fn()));
    }

    // Optimisation shortcut
    if (
        rxQuery.collection.database.closed ||
        _isResultsInSync(rxQuery)
    ) {
        return false;
    }

    rxQuery._ensureEqualQueue = rxQuery._ensureEqualQueue
        .then(() => __ensureEqual(rxQuery));
    return rxQuery._ensureEqualQueue;
}

/**
 * ensures that the results of this query is equal to the results which a query over the database would give
 * @return true if results have changed
 */
function __ensureEqual<RxDocType>(rxQuery: RxQueryBase<RxDocType, any>): Promise<boolean> {
    rxQuery._lastEnsureEqual = now();

    /**
     * Optimisation shortcuts
     */
    if (
        // db is closed
        rxQuery.collection.database.closed ||
        // nothing happened since last run
        _isResultsInSync(rxQuery)
    ) {
        return PROMISE_RESOLVE_FALSE;
    }

    let ret = false;
    let mustReExec = false; // if this becomes true, a whole execution over the database is made
    let changePoint = rxQuery._latestChangeEvent + 1;
    if (rxQuery._latestChangeEvent === -1) {
        // have not executed yet -> must run
        mustReExec = true;
        changePoint = rxQuery.asRxQuery.collection._changeEventBuffer.getCounter() + 1;
    }

    function caluateChanges(trust: boolean = true) {
        const missedChangeEvents = rxQuery.asRxQuery.collection._changeEventBuffer.getFrom(changePoint);
        if (missedChangeEvents === null) {
            // changeEventBuffer is of bounds -> we must re-execute over the database
            mustReExec = true;
        } else {
            const runChangeEvents: RxStorageChangeEvent<RxDocType>[] = rxQuery.asRxQuery.collection
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
                    runChangeEvents, { idempotentCheck: trust }
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

    /**
     * try to use EventReduce to calculate the new results
     */
    if (!mustReExec) {
        rxQuery._latestChangeEvent = rxQuery.asRxQuery.collection._changeEventBuffer.getCounter();
        caluateChanges();
    }

    // oh no we have to re-execute the whole query over the database
    if (mustReExec) {
        return rxQuery._execOverDatabase()
            .then(newResultData => {

                /**
                 * The RxStorage is defined to always first emit events and then return
                 * on bulkWrite() calls. So here we have to use the counter AFTER the execOverDatabase()
                 * has been run, not the one from before.
                 */
                rxQuery._latestChangeEvent = rxQuery.collection._changeEventBuffer.getCounter();

                // A count query needs a different has-changed check.
                if (typeof newResultData === 'number') {
                    if (
                        !rxQuery._result ||
                        newResultData !== rxQuery._result.count
                    ) {
                        ret = true;
                        rxQuery._setResultData(newResultData as any);
                        caluateChanges(false);
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
                    caluateChanges(false);
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
    rxQuery: RxQuery<RxDocType> | RxQueryBase<RxDocType, any>
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
                    if (!docData._deleted) {
                        docs.push(docData);
                    }
                    return false;
                } else {
                    return true;
                }
            });
            // otherwise get from storage
            if (docIds.length > 0) {
                const docsFromStorage = await collection.storageInstance.findDocumentsById(docIds, false);
                appendToArray(docs, docsFromStorage);
            }
        } else {
            const docId = rxQuery.isFindOneByIdQuery;

            // first try to fill from docCache
            let docData = rxQuery.collection._docCache.getLatestDocumentDataIfExists(docId);
            if (!docData) {
                // otherwise get from storage
                const fromStorageList = await collection.storageInstance.findDocumentsById([docId], false);
                if (fromStorageList[0]) {
                    docData = fromStorageList[0];
                }
            }
            if (docData && !docData._deleted) {
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
