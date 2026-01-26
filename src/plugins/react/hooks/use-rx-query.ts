import { useCallback, useEffect, useState } from 'react';

import type {
    MangoQuery,
    RxCollection,
    RxDocument,
} from '../../../types/index.d.ts';
import { isRxCollection } from '../../../rx-collection.ts';
import { useRxCollection } from './use-rx-collection.ts';

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
    live?: boolean;
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
export function useRxQuery<
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
>): UseRxQueryResult<RxDocumentType, OrmMethods> {
    const [results, setResults] = useState(
        [] as RxDocument<RxDocumentType, OrmMethods>[],
    );
    const [loading, setLoading] = useState(false);
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
            throw new Error(
                'The provided value for the collection parameter is not a valid RxCollection',
            );
        }
        dbCollection = collection;
    }
    (window as any).collection = dbCollection;

    const emitResults = (res: RxDocument<RxDocumentType, OrmMethods>[]) => {
        setResults(res);
        if (loading) {
            setLoading(false);
        }
    };

    const emitError = (e: Error) => {
        setError(e.message);
        if (loading) {
            setLoading(false);
        }
    };

    const runQuery = useCallback(async () => {
        if (dbCollection == null) {
            return;
        }
        setError(null);
        setLoading(loading);
        const rxQuery = dbCollection.find(query);
        if (live) {
            const subscription = rxQuery.$.subscribe({
                next: (res) => emitResults(res),
                error: (err) => emitError(err),
            });

            return () => {
                subscription.unsubscribe();
            };
        } else {
            try {
                emitResults(await rxQuery.exec());
            } catch (e) {
                emitError(e as Error);
            }
        }
    }, [dbCollection, query]);

    useEffect(() => {
        if (collection == null) {
            return;
        }

        runQuery();
    }, [runQuery]);

    return { results, loading, error };
}
