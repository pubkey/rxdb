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
             */
            const sortComparator = getSortComparator(
                collection.schema.jsonSchema,
                normalizedMangoQuery
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
            const queryMatcher = getQueryMatcher(
                collection.schema.jsonSchema,
                normalizedMangoQuery
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
            return ret;
        }
    );
}

type calculateNewResultsOption = {
    idempotentCheck?: boolean;
};
export function calculateNewResults<RxDocumentType>(
    rxQuery: RxQuery<RxDocumentType>,
    rxChangeEvents: RxStorageChangeEvent<RxDocumentType>[],
    options: calculateNewResultsOption = {
        idempotentCheck: true
    }
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
            // Don't trust rxChangeEvents, as there might be previous change data being passed in, so idempotency checks are needed
            // Updates and deletions are overwrite operations on documents, they do not depend on the current state of the document, which are inherently idempotent and require no special consideration.
            if (!options.idempotentCheck && eventReduceEvent.operation === 'INSERT' && previousResultsMap.has(eventReduceEvent.id)) {
                return false;
            }
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
