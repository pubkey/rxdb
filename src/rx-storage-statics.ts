import type {
    DeterministicSortComparator,
    QueryMatcher
} from 'event-reduce-js';
import type {
    RxDocumentData,
    RxJsonSchema,
    RxStorageStatics,
    FilledMangoQuery,
    MangoQuery,
    DefaultPreparedQuery
} from './types';
import { newRxError } from './rx-error';
import { getQueryPlan } from './query-planner';
import { DEFAULT_CHECKPOINT_SCHEMA } from './rx-schema-helper';
import { getMingoQuery } from './rx-query-mingo';


/**
 * Most RxStorage implementations use these static functions.
 * But you can use anything that implements the interface,
 * for example if your underlying database already has a query engine.
 */
export const RxStorageDefaultStatics: RxStorageStatics = {
    prepareQuery<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        mutateableQuery: FilledMangoQuery<RxDocType>
    ): DefaultPreparedQuery<RxDocType> {

        if (!mutateableQuery.sort) {
            throw newRxError('SNH', {
                query: mutateableQuery
            });
        }

        /**
         * Store the query plan together with the
         * prepared query to save performance.
         */
        const queryPlan = getQueryPlan(
            schema,
            mutateableQuery
        );

        return {
            query: mutateableQuery,
            queryPlan
        };
    },

    getSortComparator<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        preparedQuery: DefaultPreparedQuery<RxDocType>
    ): DeterministicSortComparator<RxDocType> {
        return getDefaultSortComparator(schema, preparedQuery.query);
    },

    getQueryMatcher<RxDocType>(
        _schema: RxJsonSchema<RxDocType>,
        preparedQuery: DefaultPreparedQuery<RxDocType>
    ): QueryMatcher<RxDocumentData<RxDocType>> {
        const query = preparedQuery.query;
        const mingoQuery = getMingoQuery(query.selector);
        const fun: QueryMatcher<RxDocumentData<RxDocType>> = (doc: RxDocumentData<RxDocType>) => {
            if (doc._deleted) {
                return false;
            }
            const cursor = mingoQuery.find([doc]);
            const next = cursor.next();
            if (next) {
                return true;
            } else {
                return false;
            }
        };
        return fun;
    },

    checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA

};

function sortDirectionToMingo(direction: 'asc' | 'desc'): 1 | -1 {
    if (direction === 'asc') {
        return 1;
    } else {
        return -1;
    }
}

/**
 * This function is at dexie-helper
 * because we need it in multiple places.
 */
export function getDefaultSortComparator<RxDocType>(
    _schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    query: MangoQuery<RxDocType>
): DeterministicSortComparator<RxDocType> {
    const mingoSortObject: {
        [fieldName: string]: 1 | -1;
    } = {};

    if (!query.sort) {
        throw newRxError('SNH', { query });
    }

    query.sort.forEach(sortBlock => {
        const key = Object.keys(sortBlock)[0];
        const direction = Object.values(sortBlock)[0];
        mingoSortObject[key] = sortDirectionToMingo(direction);
    });

    const fun: DeterministicSortComparator<RxDocType> = (a: RxDocType, b: RxDocType) => {
        const sorted = getMingoQuery({}).find([a, b], {}).sort(mingoSortObject);
        const first = sorted.next();
        if (first === a) {
            return -1;
        } else {
            return 1;
        }
    };

    return fun;
}
