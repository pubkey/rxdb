import type {
    RxDocumentData,
    RxJsonSchema,
    RxStorageStatics,
    FilledMangoQuery,
    DefaultPreparedQuery} from './types';
import { newRxError } from './rx-error';
import { getQueryPlan } from './query-planner';
import { DEFAULT_CHECKPOINT_SCHEMA } from './rx-schema-helper';


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
    checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA

};
