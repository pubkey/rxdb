import {
    ActionName,
    calculateActionName,
    runAction,
    QueryParams,
    QueryMatcher,
    DeterministicSortComparator,
    StateResolveFunctionInput,
    ChangeEvent,
    hasLimit,
    isUpdate,
    isDelete,
    isFindOne,
    isInsert,
    hasSkip,
    wasResultsEmpty,
    wasInResult,
    wasSortedAfterLast,
    previousUnknown,
    wasLimitReached,
    wasMatching,
    doesMatchNow
} from 'event-reduce-js';
import type {
    RxQuery,
    MangoQuery,
    RxChangeEvent,
    StringKeys,
    RxDocumentData
} from './types';
import { rxChangeEventToEventReduceChangeEvent } from './rx-change-event';
import {
    arrayFilterNotEmpty,
    clone,
    ensureNotFalsy,
    getFromMapOrCreate
} from './plugins/utils';
import { getQueryMatcher, getSortComparator, normalizeMangoQuery } from './rx-query-helper';

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

// This catches a specific case where we have a limit query (of say LIMIT items), and then
// a document is removed from the result set by the current change. In this case,
// the event-reduce library (rightly) tells us we need to recompute the query to get a
// full result set of LIMIT items.
// However, if we have a "limit buffer", we can instead fill in the missing result from there.
// For more info, see the rx-query.test tests under "Limit Buffer".
// This function checks if we are actually in the specific case where the limit buffer can be used.
function canFillResultSetFromLimitBuffer<RxDocumentType>(s: StateResolveFunctionInput<RxDocumentType>) {
    // We figure out if this event is our special case using the same "state resolve" functions that event-reduce uses:
    // https://github.com/pubkey/event-reduce/blob/fcb46947b29eac97c97dcb05e08af337f362fe5c/javascript/src/states/index.ts#L87
    return (
        !isInsert(s) && // inserts can never cause
        (isUpdate(s) || isDelete(s)) && // both updates and deletes can remove a doc from our results
        hasLimit(s) && // only limit queries
        !isFindOne(s) && // if it's a findOne, we have no buffer and have to re-compute
        !hasSkip(s) && // we could potentially make skip queries work later, but for now ignore them -- too hard
        !wasResultsEmpty(s) && // this should never happen
        !previousUnknown(s) && // we need to have had the prev result set
        wasLimitReached(s) && // if not, the event reducer shouldn't have a problem
        // any value of wasFirst(s), position is not relevant for this case, as wasInResults
        // any value of wasLast(s) , position is not relevant for this case, as wasInResults
        // any value of sortParamsChanged(s), eg a doc could be archived but also have last_status_update changed. TODO: is this relevant for the other case where an item moves out of sort position?
        wasInResult(s) && // we only care about docs already in the results set being removed
        // any value of wasSortedBeforeFirst(s) -- this is true when the doc is first in the results set
        !wasSortedAfterLast(s) && // I don't think this could be true anyways, but whatever
        // any value of isSortedBeforeFirst(s) -- this is true when the doc is first in order (but it could still be filtered out)
        // any value of isSortedAfterLast(s) // TODO: because there's a case where a doc is kicked out of the top LIMIT docs, but stays in the filter results? test this.
        wasMatching(s) && // it couldn't have been wasInResult unless it was also matching
        !doesMatchNow(s) // TODO: should be any value of doesMatchNow(s) -- true if it has just been kicked out of sort, or false if it was eg archived
    );
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
            if (canFillResultSetFromLimitBuffer(stateResolveFunctionInput) && rxQuery._limitBufferResults != null && rxQuery._limitBufferResults.length > 0) {
                // replace the missing item with an item rom our limit buffer!
                changed = true;

                // Our documents have ids, but I guess in some rxdb schemas they may not? so we have to coerce the type
                const replacementItem = rxQuery._limitBufferResults.shift() as RxDocumentData<RxDocumentType> & {id: string;};
                runAction(
                    'removeExisting',
                    queryParams,
                    eventReduceEvent,
                    previousResults,
                    previousResultsMap,
                );
                previousResults.push(replacementItem);
                if (previousResultsMap) {
                    previousResultsMap.set(replacementItem.id, replacementItem);
                }
                return false;
            }
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
