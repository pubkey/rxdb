import type {
    DeterministicSortComparator,
    QueryMatcher
} from 'event-reduce-js';
import type {
    RxDocumentData,
    RxJsonSchema,
    RxStorageStatics,
    DexiePreparedQuery,
    FilledMangoQuery
} from '../../types';
import {
    Query as MingoQuery
} from 'mingo';
import {
    getDexieSortComparator} from './dexie-helper';
import { newRxError } from '../../rx-error';
import { getQueryPlan } from '../../query-planner';
import { DEFAULT_CHECKPOINT_SCHEMA } from '../../rx-schema-helper';

export const RxStorageDexieStatics: RxStorageStatics = {
    prepareQuery<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        mutateableQuery: FilledMangoQuery<RxDocType>
    ): DexiePreparedQuery<RxDocType> {

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
        preparedQuery: DexiePreparedQuery<RxDocType>
    ): DeterministicSortComparator<RxDocType> {
        return getDexieSortComparator(schema, preparedQuery.query);
    },

    getQueryMatcher<RxDocType>(
        _schema: RxJsonSchema<RxDocType>,
        preparedQuery: DexiePreparedQuery<RxDocType>
    ): QueryMatcher<RxDocumentData<RxDocType>> {
        const query = preparedQuery.query;
        const mingoQuery = new MingoQuery(query.selector);
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
