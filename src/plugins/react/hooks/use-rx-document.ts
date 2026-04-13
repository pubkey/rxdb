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
    const [result, setResult] = useState<RxDocument<RxDocumentType, OrmMethods> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!collection || primaryKey === undefined) {
            setResult(null);
            return;
        }

        if (!isRxCollection(collection)) {
            throw newRxError('R3', {
                collection
            });
        }

        setLoading(true);
        setError(null);

        const subscription = collection.findOne(primaryKey).$.subscribe({
            next: (doc: RxDocument<RxDocumentType, OrmMethods> | null) => {
                setResult(doc);
                setLoading(false);
            },
            error: (err: Error) => {
                setError(err.message);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [collection, primaryKey]);

    return { result, loading, error };
}
