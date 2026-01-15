import { useState, useEffect } from 'react';
import { filter } from 'rxjs';

import type { RxCollection, RxDatabase } from '../../../types/index.d.ts';
import type { RxDatabaseCollections$ } from '../react-plugin.ts';
import { useRxDatabase } from './use-rx-database.ts';

export function useRxCollection<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = {},
    InstanceCreationOptions = {},
    Reactivity = unknown
>(
    name: string
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
    const database = useRxDatabase() as RxDatabase & RxDatabaseCollections$;

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
            .pipe(filter((evt) => evt.name === name))
            .subscribe((evt) => {
                if (evt.type == 'CREATED') {
                    setCollection(
                        evt.collection as RxCollection<
                            RxDocumentType,
                            OrmMethods,
                            StaticMethods,
                            InstanceCreationOptions,
                            Reactivity
                        >
                    );
                } else if (evt.type == 'REMOVED') {
                    setCollection(null);
                }
            });
    }, [database, name]);

    return collection;
}
