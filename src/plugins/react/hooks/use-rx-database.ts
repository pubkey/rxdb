import { useContext } from 'react';

import type {
    CollectionsOfDatabase,
    RxDatabase,
} from '../../../types/index.d.ts';
import { RxDatabaseContext } from '../database-context.ts';

/**
 * The `useRxDatabase` hook retrieves the RxDB database instance from context.
 *
 * @returns The RxDB database instance.
 * @throws {Error} Throws an error if the component is not wrapped in a <RxDatabaseProvider>.
 * This ensures the database context is properly initialized before use.
 */
export function useRxDatabase<
    Collections = CollectionsOfDatabase,
    Internals = any,
    InstanceCreationOptions = any,
    Reactivity = any,
>(): RxDatabase<Collections, Internals, InstanceCreationOptions, Reactivity> {
    const database = useContext(RxDatabaseContext) as unknown as RxDatabase<
        Collections,
        Internals,
        InstanceCreationOptions,
        Reactivity
    >;

    if (database == null) {
        throw new Error(
            'Could not find database in context, please ensure the component is wrapped in a <RxDatabaseProvider>',
        );
    }

    return database;
}
