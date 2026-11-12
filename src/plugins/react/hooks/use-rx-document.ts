import { useState, useEffect } from 'react';

import type {
    RxCollection,
    RxDocument,
} from '../../../types/index.d.ts';
import { isRxCollection } from '../../../rx-collection.ts';
import { newRxError } from '../../../rx-error.ts';

export type UseRxDocumentResult<RxDocumentType = any, OrmMethods = {}> = {
    result: RxDocument<RxDocumentType, OrmMethods> | null;
    loading: boolean;
    error: string | null;
};

/**
 * React hook to subscribe to a single RxDB document by its primary key.
 * Returns the document with live updates when it changes.
 *
 * @param collection - The RxCollection instance to query from.
 * @param primaryKey - The primary key value of the document to subscribe to.
 * @returns The document, loading state, and error.
 */
export function useRxDocument<
    RxDocumentType = any,
    OrmMethods = {},
>(
    collection: RxCollection<RxDocumentType, OrmMethods, any, any, any> | null | undefined,
    primaryKey: string | undefined
): UseRxDocumentResult<RxDocumentType, OrmMethods> {
    /**
     * The state remembers for which collection and primaryKey it was loaded,
     * so that the document of one collection or primaryKey is never returned
     * as the loaded document of another one.
     */
    const [state, setState] = useState<{
        collection: RxCollection<RxDocumentType, OrmMethods, any, any, any>;
        primaryKey: string;
        result: RxDocument<RxDocumentType, OrmMethods> | null;
        error: string | null;
    } | null>(null);

    useEffect(() => {
        if (!collection || primaryKey === undefined) {
            return;
        }

        if (!isRxCollection(collection)) {
            throw newRxError('R3', {
                collection
            });
        }

        const subscription = collection.findOne(primaryKey).$.subscribe({
            next: (doc: RxDocument<RxDocumentType, OrmMethods> | null) => {
                setState({
                    collection,
                    primaryKey,
                    result: doc,
                    error: null
                });
            },
            error: (err: Error) => {
                setState(previous => ({
                    collection,
                    primaryKey,
                    result: previous && previous.collection === collection && previous.primaryKey === primaryKey
                        ? previous.result
                        : null,
                    error: err.message
                }));
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [collection, primaryKey]);

    if (!collection || primaryKey === undefined) {
        return {
            result: null,
            loading: false,
            error: null
        };
    }
    if (
        state &&
        state.collection === collection &&
        state.primaryKey === primaryKey
    ) {
        return {
            result: state.result,
            loading: false,
            error: state.error
        };
    }
    return {
        result: null,
        loading: true,
        error: null
    };
}
