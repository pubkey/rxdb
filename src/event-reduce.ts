import {
    ActionName,
    calculateActionName,
    runAction,
    QueryParams,
    StateResolveFunctionInput,
    ChangeEvent,
    ResultWindowBuffer,
    createResultWindowBuffer,
    applyChangeEventsToResultWindowBuffer,
    getRecommendedResultWindowBufferSize,
    getResultWindowBufferQuery
} from 'event-reduce-js';
import type {
    RxQuery,
    MangoQuery,
    StringKeys,
    RxDocumentData,
    RxStorageChangeEvent,
    RxEventReduceOptions,
    FilledMangoQuery,
    PreparedQuery
} from './types/index.d.ts';
import { rxChangeEventToEventReduceChangeEvent } from './rx-change-event.ts';
import {
    clone,
    ensureNotFalsy,
    getFromMapOrCreate
} from './plugins/utils/index.ts';
import { getQueryMatcher, getSortComparator, normalizeMangoQuery } from './rx-query-helper.ts';

export type EventReduceResultNeg = {
    runFullQueryAgain: true;
};
export type EventReduceResultPos<RxDocumentType> = {
    runFullQueryAgain: false;
    changed: boolean;
    newResults: RxDocumentType[];
};
export type EventReduceResult<RxDocumentType> = EventReduceResultNeg | EventReduceResultPos<RxDocumentType>;

/**
 * Uses the recommended buffer size of event-reduce on both sides of the result window.
 * @link https://github.com/pubkey/event-reduce/blob/master/docs/result-window-buffer.md#recommended-sizes
 */
export function defaultResultWindowBuffer(query: FilledMangoQuery<any>): { skip: number; limit: number; } {
    const size = getRecommendedResultWindowBufferSize(query.limit);
    return {
        skip: size,
        limit: size
    };
}

export const DEFAULT_EVENT_REDUCE_OPTIONS: RxEventReduceOptions = {
    resultWindowBuffer: defaultResultWindowBuffer
};

/**
 * Normalizes the eventReduce option of the database creator.
 * @return false if EventReduce is disabled
 */
export function getEventReduceOptions(
    eventReduce?: boolean | Partial<RxEventReduceOptions>
): false | RxEventReduceOptions {
    if (eventReduce === false) {
        return false;
    }
    if (eventReduce === true || typeof eventReduce === 'undefined') {
        return DEFAULT_EVENT_REDUCE_OPTIONS;
    }
    return Object.assign({}, DEFAULT_EVENT_REDUCE_OPTIONS, eventReduce);
}


export function getSortFieldsOfQuery<RxDocType>(
    primaryKey: StringKeys<RxDocumentData<RxDocType>>,
    query: MangoQuery<RxDocType>
): (string | StringKeys<RxDocType>)[] {
    if (!query.sort || query.sort.length === 0) {
        return [primaryKey];
    } else {
        return query.sort.map(part => Object.keys(part)[0]);
    }
}



export const RXQUERY_QUERY_PARAMS_CACHE: WeakMap<RxQuery, QueryParams<any>> = new WeakMap();
export function getQueryParams<RxDocType>(
    rxQuery: RxQuery<RxDocType>
): QueryParams<RxDocType> {
    return getFromMapOrCreate(
        RXQUERY_QUERY_PARAMS_CACHE,
        rxQuery,
        () => {
            const collection = rxQuery.collection;
            const normalizedMangoQuery = normalizeMangoQuery(
                collection.storageInstance.schema,
                clone(rxQuery.mangoQuery)
            );
            const primaryKey = collection.schema.primaryPath;

            /**
             * Create a custom sort comparator
             * that uses the hooks to ensure
             * we send for example compressed documents to be sorted by compressed queries.
             *
             * @performance
             * Avoid creating intermediate wrapper objects on every comparison call.
             * The sortComparator and queryMatcher are called directly.
             */
            const useSortComparator = getSortComparator(
                collection.schema.jsonSchema,
                normalizedMangoQuery
            );

            /**
             * Create a custom query matcher
             * that uses the hooks to ensure
             * we send for example compressed documents to match compressed queries.
             */
            const useQueryMatcher = getQueryMatcher(
                collection.schema.jsonSchema,
                normalizedMangoQuery
            );

            const ret: QueryParams<any> = {
                primaryKey: rxQuery.collection.schema.primaryPath as any,
                skip: normalizedMangoQuery.skip,
                limit: normalizedMangoQuery.limit,
                sortFields: getSortFieldsOfQuery(primaryKey, normalizedMangoQuery) as string[],
                sortComparator: useSortComparator,
                queryMatcher: useQueryMatcher
            };
            return ret;
        }
    );
}


export function calculateNewResults<RxDocumentType>(
    rxQuery: RxQuery<RxDocumentType>,
    rxChangeEvents: RxStorageChangeEvent<RxDocumentType>[]
): EventReduceResult<RxDocumentType> {
    if (!rxQuery.collection.database.eventReduce) {
        return {
            runFullQueryAgain: true
        };
    }
    const queryParams = getQueryParams(rxQuery);
    const previousResults: RxDocumentType[] = ensureNotFalsy(rxQuery._result).docsData.slice(0);
    /**
     * Copy the map to avoid mutating the cached docsDataMap on the result object.
     * runAction() modifies the map in-place (adds/removes entries),
     * which would corrupt the cached map if a later event triggers runFullQueryAgain
     * and the full re-exec returns the same results (keeping the old result object).
     * On subsequent event-reduce calls, the corrupted map would cause incorrect
     * results because insertAtSortPosition checks keyDocumentMap.has(docId)
     * to decide whether to skip insertion.
     */
    const previousResultsMap: Map<string, RxDocumentType> = new Map(ensureNotFalsy(rxQuery._result).docsDataMap);
    let changed: boolean = false;


    const eventReduceEvents: ChangeEvent<RxDocumentType>[] = [];
    for (let index = 0; index < rxChangeEvents.length; index++) {
        const cE = rxChangeEvents[index];
        eventReduceEvents.push(rxChangeEventToEventReduceChangeEvent(cE));
    }

    const foundNonOptimizeable = eventReduceEvents.find(eventReduceEvent => {
        const stateResolveFunctionInput: StateResolveFunctionInput<RxDocumentType> = {
            queryParams,
            changeEvent: eventReduceEvent,
            previousResults,
            keyDocumentMap: previousResultsMap
        };

        const actionName: ActionName = calculateActionName(stateResolveFunctionInput);
        if (actionName === 'runFullQueryAgain') {
            return true;
        } else if (actionName !== 'doNothing') {
            changed = true;
            runAction(
                actionName,
                queryParams,
                eventReduceEvent,
                previousResults,
                previousResultsMap
            );
            return false;
        }
    });
    if (foundNonOptimizeable) {
        return {
            runFullQueryAgain: true,
        };
    } else {
        return {
            runFullQueryAgain: false,
            changed,
            newResults: previousResults
        };
    }
}


/**
 * Result window buffer
 * --------------------
 * For a query with a skip or limit, the buffer keeps some documents
 * before and after the result window in memory. When documents move
 * into the window, they are taken from the buffer instead of running
 * the query again, which EventReduce alone would have to do.
 * With both sizes 0, the buffer never needs more full queries than EventReduce alone,
 * so all find queries use it, except queries by primary key.
 * @link https://github.com/pubkey/event-reduce/blob/master/docs/result-window-buffer.md
 */
export const RXQUERY_RESULT_WINDOW_BUFFER_CACHE: WeakMap<RxQuery, ResultWindowBuffer<any> | false> = new WeakMap();

/**
 * Returns the result window buffer of the query,
 * or undefined if the query does not use one.
 */
export function getResultWindowBuffer<RxDocType>(
    rxQuery: RxQuery<RxDocType>
): ResultWindowBuffer<RxDocumentData<RxDocType>> | undefined {
    const ret = getFromMapOrCreate(
        RXQUERY_RESULT_WINDOW_BUFFER_CACHE,
        rxQuery,
        () => {
            const eventReduceOptions = rxQuery.collection.database.eventReduceOptions;
            if (
                !eventReduceOptions ||
                (rxQuery.op !== 'find' && rxQuery.op !== 'findOne') ||
                // queries by primary key do not run a storage query, they use calculateNewResults()
                rxQuery.isFindOneByIdQuery
            ) {
                return false;
            }
            const sizes = eventReduceOptions.resultWindowBuffer(rxQuery.normalizedQuery);
            // throws on negative sizes and values that are not numbers
            return createResultWindowBuffer(
                getQueryParams(rxQuery),
                {
                    skipBufferSize: sizes.skip,
                    limitBufferSize: sizes.limit
                }
            );
        }
    );
    return ret ? ret : undefined;
}

/**
 * The prepared query of the RxQuery,
 * with the skip and limit of the result window buffer.
 */
export function getResultWindowBufferPreparedQuery<RxDocType>(
    rxQuery: RxQuery<RxDocType>,
    resultWindowBuffer: ResultWindowBuffer<RxDocumentData<RxDocType>>
): PreparedQuery<RxDocType> {
    const preparedQuery = rxQuery.getPreparedQuery();
    return Object.assign({}, preparedQuery, {
        query: getResultWindowBufferQuery(resultWindowBuffer, preparedQuery.query)
    });
}

/**
 * Like calculateNewResults() but updates the result window buffer of the query.
 */
export function calculateNewResultsWithResultWindowBuffer<RxDocumentType>(
    resultWindowBuffer: ResultWindowBuffer<RxDocumentData<RxDocumentType>>,
    rxChangeEvents: RxStorageChangeEvent<RxDocumentType>[]
): EventReduceResult<RxDocumentType> {
    // storage change events always contain the full document data
    const changeEvents = rxChangeEvents.map(
        rxChangeEvent => rxChangeEventToEventReduceChangeEvent(rxChangeEvent) as ChangeEvent<RxDocumentData<RxDocumentType>>
    );
    const result = applyChangeEventsToResultWindowBuffer(resultWindowBuffer, changeEvents);
    if (result.runFullQueryAgain) {
        // the result window does not fit into the buffer anymore, the query refills it
        return {
            runFullQueryAgain: true
        };
    }
    return {
        runFullQueryAgain: false,
        changed: result.changed,
        newResults: result.results as any
    };
}
