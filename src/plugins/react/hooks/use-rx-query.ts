import { useCallback, useEffect, useState } from 'react';

import type {
    MangoQuery,
    RxCollection,
    RxDocument,
} from '../../../types/index.d.ts';
import { isRxCollection } from '../../../rx-collection.ts';
import { useRxCollection } from './use-rx-collection.ts';
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
     */
    const [state, setState] = useState<{
        collection: RxCollection<
            RxDocumentType,
            OrmMethods,
            StaticMethods,
            InstanceCreationOptions,
            Reactivity
        >;
        queryKey: string;
        results: RxDocument<RxDocumentType, OrmMethods>[];
        error: string | null;
    } | null>(null);
    const queryKey = JSON.stringify(query);

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
         * In the first render after the name has changed,
         * useRxCollection() still returns the collection of the previous name.
         */
        dbCollection = collectionByName && collectionByName.name === collection ? collectionByName : null;
    } else {
        if (!isRxCollection(collection)) {
            throw newRxError('R3', {
                collection
            });
        }
        dbCollection = collection;
    }

    const runQuery = useCallback(() => {
        if (dbCollection == null) {
            return;
        }
        const queryCollection = dbCollection;

        /**
         * A query that has been replaced must not overwrite
         * the state of the query that replaced it.
         */
        let active = true;
        const emitResults = (res: RxDocument<RxDocumentType, OrmMethods>[]) => {
            if (active) {
                setState({
                    collection: queryCollection,
                    queryKey,
                    results: res,
                    error: null
                });
            }
        };
        const emitError = (e: Error) => {
            if (active) {
                setState(previous => ({
                    collection: queryCollection,
                    queryKey,
                    results: previous && previous.collection === queryCollection ? previous.results : [],
                    error: e.message
                }));
            }
        };

        const rxQuery = dbCollection.find(query);
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
    }, [dbCollection, query]);

    useEffect(() => {
        if (collection == null) {
            return;
        }

        const cleanup = runQuery();
        if (typeof cleanup === 'function') {
            return cleanup;
        }
    }, [runQuery]);

    if (
        state &&
        state.collection === dbCollection &&
        state.queryKey === queryKey
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
        results: state && state.collection === dbCollection ? state.results : [],
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
