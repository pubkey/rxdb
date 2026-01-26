import { useState, useEffect } from 'react';
import { filter } from 'rxjs';

import type { RxCollection, RxDatabase } from '../../../types/index.d.ts';
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
    const [collection, setCollection] = useState<RxCollection<
        RxDocumentType,
        OrmMethods,
        StaticMethods,
        InstanceCreationOptions,
        Reactivity
    > | null>(null);
    const database = useRxDatabase() as RxDatabase;

    useEffect(() => {
        if (database == null) {
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
            .pipe(filter((evt) => evt.collection.name === name))
            .subscribe((evt) => {
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

    return collection;
}
