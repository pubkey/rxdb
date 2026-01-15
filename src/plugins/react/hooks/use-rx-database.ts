import { useContext } from 'react';

import type {
    CollectionsOfDatabase,
    RxDatabase,
} from '../../../types/index.d.ts';
import { addRxPlugin } from '../../../plugin.ts';
import { RxDatabaseContext } from '../database-context.ts';
import { RxDbReactPlugin } from '../react-plugin.ts';

addRxPlugin(RxDbReactPlugin);

export function useRxDatabase<
    Collections = CollectionsOfDatabase,
    Internals = any,
    InstanceCreationOptions = any,
    Reactivity = any
>(): RxDatabase<Collections, Internals, InstanceCreationOptions, Reactivity> {
    const database = useContext(RxDatabaseContext) as unknown as RxDatabase<
        Collections,
        Internals,
        InstanceCreationOptions,
        Reactivity
    >;

    if (database == null) {
        throw new Error(
            'Could not find database in context, please ensure the component is wrapped in a <RxDatabaseProvider>'
        );
    }

    return database;
}
