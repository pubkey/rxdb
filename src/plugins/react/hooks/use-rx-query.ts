import { useEffect, useState } from 'react';

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
    const [results, setResults] = useState(
        [] as RxDocument<RxDocumentType, OrmMethods>[],
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    let dbCollection: RxCollection<
        RxDocumentType,
        OrmMethods,
        StaticMethods,
        InstanceCreationOptions,
        Reactivity
    > | null;
    if (typeof collection === 'string') {
        dbCollection = useRxCollection<
            RxDocumentType,
            OrmMethods,
            StaticMethods,
            InstanceCreationOptions,
            Reactivity
        >(collection);
    } else {
        if (!isRxCollection(collection)) {
            throw newRxError('R3', {
                collection
            });
        }
        dbCollection = collection;
    }

    /**
     * The query is compared by its content, so that an equal query object
     * that is created inline on each render does not run the query again.
     */
    const queryKey = JSON.stringify(query);

    useEffect(() => {
        if (dbCollection == null) {
            return;
        }

        /**
         * Results of a query that has been replaced
         * or whose component has been unmounted must not be emitted.
         */
        let active = true;
        const emitResults = (res: RxDocument<RxDocumentType, OrmMethods>[]) => {
            if (!active) {
                return;
            }
            setResults(res);
            setLoading(false);
        };
        const emitError = (e: Error) => {
            if (!active) {
                return;
            }
            setError(e.message);
            setLoading(false);
        };

        setError(null);
        setLoading(true);
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
    }, [dbCollection, queryKey, live]);

    return { results, loading, error };
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
