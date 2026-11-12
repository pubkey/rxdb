import { useEffect, useMemo, useState } from 'react';

import type {
    MangoQuery,
    RxCollection,
    RxDocument,
    RxQuery,
} from '../../../types/index.d.ts';
import { isRxCollection } from '../../../rx-collection.ts';
import { useRxCollection } from './use-rx-collection.ts';
import { useRxDatabase } from './use-rx-database.ts';
import { newRxError } from '../../../rx-error.ts';

export type UseRxQueryOptions<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = {},
    InstanceCreationOptions = {},
    Reactivity = unknown,
> = {
    collection:
    | string
    | RxCollection<
        RxDocumentType,
        OrmMethods,
        StaticMethods,
        InstanceCreationOptions,
        Reactivity
    >;
    query: MangoQuery<RxDocumentType>;
};

export type UseRxQueryResult<RxDocumentType = any, OrmMethods = {}> = {
    results: RxDocument<RxDocumentType, OrmMethods>[];
    loading: boolean;
    error: string | null;
};

/**
 * React hook to query an RxDB collection with Mango queries.
 *
 * @param {UseRxQueryOptions<RxDocumentType, OrmMethods, StaticMethods, InstanceCreationOptions, Reactivity>} options - Options for the query.
 * @param {string|RxCollection} options.collection - The collection name or instance to query.
 * @param {MangoQuery<RxDocumentType>} options.query - The Mango query to execute.
 * @param {boolean} [options.live] - Whether to subscribe to live query updates.
 *
 * @returns {UseRxQueryResult<RxDocumentType, OrmMethods>} The query result, loading state, and error.
 */
export function useRxQueryBase<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = {},
    InstanceCreationOptions = {},
    Reactivity = unknown,
>({
    collection,
    query,
    live,
}: UseRxQueryOptions<
    RxDocumentType,
    OrmMethods,
    StaticMethods,
    InstanceCreationOptions,
    Reactivity
> & { live: boolean }): UseRxQueryResult<RxDocumentType, OrmMethods> {
    /**
     * The state remembers for which collection and query it was loaded,
     * so that the results of one collection or query are never returned
     * as the loaded results of another one.
     * The query is remembered as the RxQuery instance of the query cache
     * of the collection, which is the same instance for all query objects
     * that RxDB treats as the same query.
     */
    const [state, setState] = useState<{
        rxQuery: RxQuery<RxDocumentType, any, OrmMethods, Reactivity>;
        results: RxDocument<RxDocumentType, OrmMethods>[];
        error: string | null;
    } | null>(null);

    let dbCollection: RxCollection<
        RxDocumentType,
        OrmMethods,
        StaticMethods,
        InstanceCreationOptions,
        Reactivity
    > | null;
    if (typeof collection === 'string') {
        const collectionByName = useRxCollection<
            RxDocumentType,
            OrmMethods,
            StaticMethods,
            InstanceCreationOptions,
            Reactivity
        >(collection);
        /**
         * In the first render after the name or the provided database has changed,
         * useRxCollection() still returns the collection of the previous name or database.
         */
        const database = useRxDatabase();
        dbCollection = collectionByName &&
            collectionByName.name === collection &&
            collectionByName.database === database
            ? collectionByName
            : null;
    } else {
        if (!isRxCollection(collection)) {
            throw newRxError('R3', {
                collection
            });
        }
        dbCollection = collection;
    }

    const rxQuery = useMemo(
        () => dbCollection ? dbCollection.find(query) : null,
        [dbCollection, query]
    );

    useEffect(() => {
        if (rxQuery == null) {
            return;
        }

        /**
         * A query that has been replaced must not overwrite
         * the state of the query that replaced it.
         */
        let active = true;
        const emitResults = (res: RxDocument<RxDocumentType, OrmMethods>[]) => {
            if (active) {
                setState({
                    rxQuery,
                    results: res,
                    error: null
                });
            }
        };
        const emitError = (e: Error) => {
            if (active) {
                setState(previous => ({
                    rxQuery,
                    results: previous && previous.rxQuery.collection === rxQuery.collection ? previous.results : [],
                    error: e.message
                }));
            }
        };

        if (live) {
            const subscription = rxQuery.$.subscribe({
                next: (res: RxDocument<RxDocumentType, OrmMethods>[]) => emitResults(res),
                error: (err: Error) => emitError(err),
            });

            return () => {
                active = false;
                subscription.unsubscribe();
            };
        } else {
            rxQuery.exec().then(
                (res) => emitResults(res),
                (e) => emitError(e as Error)
            );
            return () => {
                active = false;
            };
        }
    }, [rxQuery, live]);

    if (
        state &&
        state.rxQuery === rxQuery
    ) {
        return {
            results: state.results,
            loading: false,
            error: state.error
        };
    }

    /**
     * While the query is loading, the previous results
     * of the same collection are returned.
     */
    return {
        results: state && state.rxQuery.collection === dbCollection ? state.results : [],
        loading: true,
        error: null
    };
}



export function useRxQuery<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = {},
    InstanceCreationOptions = {},
    Reactivity = unknown,
>({
    collection,
    query,
}: UseRxQueryOptions<
    RxDocumentType,
    OrmMethods,
    StaticMethods,
    InstanceCreationOptions,
    Reactivity
>): UseRxQueryResult<RxDocumentType, OrmMethods> {
    return useRxQueryBase({
        collection,
        query,
        live: false
    });
}
