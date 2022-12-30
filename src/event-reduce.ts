import {
    ActionName,
    calculateActionName,
    runAction,
    QueryParams,
    QueryMatcher,
    DeterministicSortComparator,
    StateResolveFunctionInput,
    ChangeEvent
} from 'event-reduce-js';
import type {
    RxQuery,
    MangoQuery,
    RxChangeEvent,
    PreparedQuery,
    StringKeys,
    RxDocumentData
} from './types';
import { rxChangeEventToEventReduceChangeEvent } from './rx-change-event';
import { arrayFilterNotEmpty, clone, ensureNotFalsy } from './plugins/utils';
import { normalizeMangoQuery } from './rx-query-helper';

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
    if (!RXQUERY_QUERY_PARAMS_CACHE.has(rxQuery)) {
        const collection = rxQuery.collection;
        const preparedQuery: PreparedQuery<RxDocType> = rxQuery.getPreparedQuery();
        const normalizedMangoQuery = normalizeMangoQuery(
            collection.storageInstance.schema,
            clone(rxQuery.mangoQuery)
        );
        const primaryKey = collection.schema.primaryPath;

        /**
         * Create a custom sort comparator
         * that uses the hooks to ensure
         * we send for example compressed documents to be sorted by compressed queries.
         */
        const sortComparator = collection.database.storage.statics.getSortComparator(
            collection.schema.jsonSchema,
            preparedQuery
        );

        const useSortComparator: DeterministicSortComparator<RxDocType> = (docA: RxDocType, docB: RxDocType) => {
            const sortComparatorData = {
                docA,
                docB,
                rxQuery
            };
            return sortComparator(sortComparatorData.docA, sortComparatorData.docB);
        };

        /**
         * Create a custom query matcher
         * that uses the hooks to ensure
         * we send for example compressed documents to match compressed queries.
         */
        const queryMatcher = collection.database.storage.statics.getQueryMatcher(
            collection.schema.jsonSchema,
            preparedQuery
        );
        const useQueryMatcher: QueryMatcher<RxDocumentData<RxDocType>> = (doc: RxDocumentData<RxDocType>) => {
            const queryMatcherData = {
                doc,
                rxQuery
            };
            return queryMatcher(queryMatcherData.doc);
        };

        const ret: QueryParams<any> = {
            primaryKey: rxQuery.collection.schema.primaryPath as any,
            skip: normalizedMangoQuery.skip,
            limit: normalizedMangoQuery.limit,
            sortFields: getSortFieldsOfQuery(primaryKey, normalizedMangoQuery) as string[],
            sortComparator: useSortComparator,
            queryMatcher: useQueryMatcher
        };
        RXQUERY_QUERY_PARAMS_CACHE.set(rxQuery, ret);
        return ret;
    } else {
        return RXQUERY_QUERY_PARAMS_CACHE.get(rxQuery) as QueryParams<RxDocType>;
    }
}


export function calculateNewResults<RxDocumentType>(
    rxQuery: RxQuery<RxDocumentType>,
    rxChangeEvents: RxChangeEvent<RxDocumentType>[]
): EventReduceResult<RxDocumentType> {
    if (!rxQuery.collection.database.eventReduce) {
        return {
            runFullQueryAgain: true
        };
    }
    const queryParams = getQueryParams(rxQuery);
    const previousResults: RxDocumentType[] = ensureNotFalsy(rxQuery._result).docsData.slice(0);
    const previousResultsMap: Map<string, RxDocumentType> = ensureNotFalsy(rxQuery._result).docsDataMap;
    let changed: boolean = false;

    const eventReduceEvents: ChangeEvent<RxDocumentType>[] = rxChangeEvents
        .map(cE => rxChangeEventToEventReduceChangeEvent(cE))
        .filter(arrayFilterNotEmpty);
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
