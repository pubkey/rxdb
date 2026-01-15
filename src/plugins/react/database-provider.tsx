import React, { type ReactElement } from 'react';
import { isRxDatabase } from '../../rx-database.ts';
import type { RxDatabase } from '../../types/index';
import { Provider } from './database-context.ts';

export type RxDatabaseProviderProps = {
    database: RxDatabase;
    children: React.ReactNode;
};

export function RxDatabaseProvider({
    children,
    database,
}: RxDatabaseProviderProps): ReactElement<typeof Provider> {
    if (!isRxDatabase(database)) {
        throw new Error('You must provide a valid RxDatabase to the the RxDatabaseProvider');
    }
    return <Provider value={database}>{children}</Provider>;
}
