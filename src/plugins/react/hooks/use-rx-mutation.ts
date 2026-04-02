import { useState, useCallback } from 'react';

import type {
    RxCollection,
    RxDocument,
} from '../../../types/index.d.ts';
import { isRxCollection } from '../../../rx-collection.ts';
import { newRxError } from '../../../rx-error.ts';

export type UseRxMutationResult<RxDocumentType = any, OrmMethods = {}> = {
    insert: (data: RxDocumentType) => Promise<RxDocument<RxDocumentType, OrmMethods>>;
    update: (doc: RxDocument<RxDocumentType, OrmMethods>, modifier: (doc: RxDocumentType) => RxDocumentType) => Promise<RxDocument<RxDocumentType, OrmMethods>>;
    remove: (doc: RxDocument<RxDocumentType, OrmMethods>) => Promise<RxDocument<RxDocumentType, OrmMethods>>;
    loading: boolean;
    error: string | null;
};

/**
 * React hook that provides insert, update, and remove operations for an RxDB collection
 * with loading and error states.
 *
 * @param collection - The RxCollection instance to mutate.
 * @returns Mutation functions and state.
 */
export function useRxMutation<
    RxDocumentType = any,
    OrmMethods = {},
>(
    collection: RxCollection<RxDocumentType, OrmMethods, any, any, any> | null | undefined
): UseRxMutationResult<RxDocumentType, OrmMethods> {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const insert = useCallback(async (data: RxDocumentType) => {
        if (!collection) {
            throw new Error('Collection is not available');
        }
        if (!isRxCollection(collection)) {
            throw newRxError('R3', { collection });
        }
        setLoading(true);
        setError(null);
        try {
            const doc = await collection.insert(data as any);
            setLoading(false);
            return doc;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
            throw err;
        }
    }, [collection]);

    const update = useCallback(async (
        doc: RxDocument<RxDocumentType, OrmMethods>,
        modifier: (doc: RxDocumentType) => RxDocumentType
    ) => {
        setLoading(true);
        setError(null);
        try {
            const result = await doc.incrementalModify(modifier as any);
            setLoading(false);
            return result;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
            throw err;
        }
    }, []);

    const remove = useCallback(async (
        doc: RxDocument<RxDocumentType, OrmMethods>
    ) => {
        setLoading(true);
        setError(null);
        try {
            const result = await doc.remove();
            setLoading(false);
            return result;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
            throw err;
        }
    }, []);

    return { insert, update, remove, loading, error };
}
