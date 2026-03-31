import {
    ActionName,
    calculateActionName,
    runAction,
    QueryParams,
    StateResolveFunctionInput,
    ChangeEvent
} from 'event-reduce-js';
import type {
    RxQuery,
    MangoQuery,
    StringKeys,
    RxDocumentData,
    RxStorageChangeEvent
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
        const eventReduceEvent = rxChangeEventToEventReduceChangeEvent(cE);
        if (eventReduceEvent) {
            eventReduceEvents.push(eventReduceEvent);
        }
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
