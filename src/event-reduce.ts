import {
    ActionName,
    calculateActionName,
    runAction,
    QueryParams
} from 'event-reduce-js';
import { RxQuery, MangoQuery } from './types';
import { RxChangeEvent } from './rx-change-event';

import {
    RxStoragePouchDb
} from './rx-storage-pouchdb';

export type EventReduceResultNeg = {
    runFullQueryAgain: true,
};
export type EventReduceResultPos<RxDocumentType> = {
    runFullQueryAgain: false,
    changed: boolean,
    newResults: RxDocumentType[];
};
export type EventReduceResult<RxDocumentType> = EventReduceResultNeg | EventReduceResultPos<RxDocumentType>;


export function getSortFieldsOfQuery<RxDocType>(
    primaryKey: string,
    query: MangoQuery<RxDocType>
): string[] {
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
        const queryJson: MangoQuery<RxDocType> = rxQuery.toJSON();
        const primaryKey = rxQuery.collection.schema.primaryPath;
        const ret = {
            primaryKey: rxQuery.collection.schema.primaryPath,
            skip: queryJson.skip,
            limit: queryJson.limit,
            sortFields: getSortFieldsOfQuery(primaryKey, queryJson),
            sortComparator: RxStoragePouchDb.getSortComparator(primaryKey, queryJson),
            queryMatcher: RxStoragePouchDb.getQueryMatcher(primaryKey, queryJson)
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
    console.log('calculateNewResults()');
    console.dir(rxChangeEvents.map(cE => cE.toEventReduceChangeEvent()));
    if (!rxQuery.collection.database.eventReduce) {
        return {
            runFullQueryAgain: true
        };
    }
    const queryParams = getQueryParams(rxQuery);
    const previousResults: RxDocumentType[] = rxQuery._resultsData.slice();
    const previousResultsMap: Map<string, RxDocumentType> = rxQuery._resultsDataMap;
    let changed: boolean = false;

    console.log('previousResults:');
    console.dir(previousResults);

    const foundNonOptimizeable = rxChangeEvents.find(cE => {
        const eventReduceEvent = cE.toEventReduceChangeEvent();
        const actionName: ActionName = calculateActionName({
            queryParams,
            changeEvent: eventReduceEvent,
            previousResults,
            keyDocumentMap: previousResultsMap
        });
        console.log('actionName:', actionName);
        if (actionName === 'runFullQueryAgain') {
            return true;
        } else if (actionName !== 'doNothing') {
            console.log('run change!');
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
        console.log('ret results:');
        console.dir(previousResults);
        return {
            runFullQueryAgain: false,
            changed,
            newResults: previousResults
        };
    }
}
