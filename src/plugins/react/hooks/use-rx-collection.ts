import { useState, useEffect, useContext } from 'react';
import { filter } from 'rxjs';

import type { RxCollection, RxCollectionEvent, RxDatabase } from '../../../types/index.d.ts';
import { RxDatabaseContext } from '../database-context.ts';
import { newRxError } from '../../../rx-error.ts';

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
    return useRxCollectionByName<
        RxDocumentType,
        OrmMethods,
        StaticMethods,
        InstanceCreationOptions,
        Reactivity
    >(name);
}

/**
 * Same as `useRxCollection()` but the name is optional.
 * Without a name, no database from the context is required and null is returned.
 * This makes it possible to call the hook unconditionally
 * from hooks that accept either a collection name or a collection instance,
 * so that the order of the React hooks is the same on each render.
 */
export function useRxCollectionByName<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = {},
    InstanceCreationOptions = {},
    Reactivity = unknown,
>(
    name: string | undefined,
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
    const database = useContext(RxDatabaseContext) as RxDatabase | null;
    if (name !== undefined && database == null) {
        throw newRxError('R2');
    }

    useEffect(() => {
        if (database == null || name === undefined) {
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
