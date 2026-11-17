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
    const [collection, setCollection] = useState<RxCollection<
        RxDocumentType,
        OrmMethods,
        StaticMethods,
        InstanceCreationOptions,
        Reactivity
    > | null>(null);
    const database = useContext(RxDatabaseContext) as RxDatabase | null;
    if (name !== undefined && database == null) {
        throw newRxError('R2');
    }

    useEffect(() => {
        if (database == null || name === undefined) {
            return;
        }
        const dbCollection = database.collections[name] as RxCollection<
            RxDocumentType,
            OrmMethods,
            StaticMethods,
            InstanceCreationOptions,
            Reactivity
        >;
        if (dbCollection != null) {
            setCollection(dbCollection);
        }
        database.collections$
            .pipe(filter((evt: RxCollectionEvent) => evt.collection.name === name))
            .subscribe((evt: RxCollectionEvent) => {
                if (evt.type == 'ADDED') {
                    setCollection(
                        evt.collection as RxCollection<
                            RxDocumentType,
                            OrmMethods,
                            StaticMethods,
                            InstanceCreationOptions,
                            Reactivity
                        >,
                    );
                } else if (evt.type == 'CLOSED') {
                    setCollection(null);
                }
            });
    }, [database, name]);

    return name === undefined ? null : collection;
}
