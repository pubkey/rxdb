import { useState, useEffect } from 'react';
import { filter } from 'rxjs';

import type { RxCollection, RxCollectionEvent, RxDatabase } from '../../../types/index.d.ts';
import { useRxDatabase } from './use-rx-database.ts';

/**
 * The `useRxCollection` hook retrieves an RxDB collection by name and maintains
 * its state as the collection lifecycle changes.
 *
 * @param {string} name The name of the collection to retrieve.
 * @returns The RxCollection instance or null
 * if the collection does not exist or has been closed.
 */
export function useRxCollection<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = {},
    InstanceCreationOptions = {},
    Reactivity = unknown,
>(
    name: string,
): RxCollection<
    RxDocumentType,
    OrmMethods,
    StaticMethods,
    InstanceCreationOptions,
    Reactivity
> | null {
    type CollectionType = RxCollection<
        RxDocumentType,
        OrmMethods,
        StaticMethods,
        InstanceCreationOptions,
        Reactivity
    >;
    /**
     * The state remembers for which database and name
     * the collection was resolved, so that a collection
     * is never returned for another database or name.
     */
    const [state, setState] = useState<{
        database: RxDatabase;
        name: string;
        collection: CollectionType;
    } | null>(null);
    const database = useRxDatabase() as RxDatabase;

    useEffect(() => {
        if (database == null) {
            return;
        }
        const dbCollection = database.collections[name] as CollectionType | undefined;
        setState(dbCollection != null ? { database, name, collection: dbCollection } : null);
        const subscription = database.collections$
            .pipe(filter((evt: RxCollectionEvent) => evt.collection.name === name))
            .subscribe((evt: RxCollectionEvent) => {
                if (evt.type == 'ADDED') {
                    setState({
                        database,
                        name,
                        collection: evt.collection as CollectionType
                    });
                } else if (evt.type == 'CLOSED') {
                    setState(null);
                }
            });
        return () => subscription.unsubscribe();
    }, [database, name]);

    if (state && state.database === database && state.name === name) {
        return state.collection;
    }
    return null;
}
