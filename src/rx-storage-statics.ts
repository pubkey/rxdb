import type {
    RxDocumentData,
    RxJsonSchema,
    RxStorageStatics,
    FilledMangoQuery,
    MangoQuery,
    DefaultPreparedQuery,
    MangoQuerySortDirection,
    DeterministicSortComparator,
    QueryMatcher
} from './types';
import { newRxError } from './rx-error';
import { getQueryPlan } from './query-planner';
import { DEFAULT_CHECKPOINT_SCHEMA } from './rx-schema-helper';
import { getMingoQuery } from './rx-query-mingo';

import {
    DEFAULT_COMPARATOR as mingoSortComparator
} from 'mingo/util';
import { objectPathMonad, ObjectPathMonadFunction } from './plugins/utils';


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

/**
 * Default mango query sort comparator.
 * @hotPath
 */
export function getDefaultSortComparator<RxDocType>(
    _schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    query: MangoQuery<RxDocType>
): DeterministicSortComparator<RxDocType> {
    if (!query.sort) {
        throw newRxError('SNH', { query });
    }
    const sortParts: {
        key: string;
        direction: MangoQuerySortDirection;
        getValueFn: ObjectPathMonadFunction<RxDocType>;
    }[] = [];
    query.sort.forEach(sortBlock => {
        const key = Object.keys(sortBlock)[0];
        const direction = Object.values(sortBlock)[0];
        sortParts.push({
            key,
            direction,
            getValueFn: objectPathMonad(key)
        });
    });
    const fun: DeterministicSortComparator<RxDocType> = (a: RxDocType, b: RxDocType) => {
        for (let i = 0; i < sortParts.length; ++i) {
            const sortPart = sortParts[i];
            const valueA = sortPart.getValueFn(a);
            const valueB = sortPart.getValueFn(b);
            if (valueA !== valueB) {
                const ret = sortPart.direction === 'asc' ? mingoSortComparator(valueA, valueB) : mingoSortComparator(valueB, valueA);
                return ret as any;
            }
        }
    };

    return fun;
}
